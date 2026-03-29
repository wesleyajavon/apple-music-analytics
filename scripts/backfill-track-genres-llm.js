#!/usr/bin/env node

/**
 * Remplit Track.genre via un LLM (Groq), sans appel Spotify/Last.fm.
 *
 * Limites importantes :
 * - Le modèle s’appuie sur ses connaissances d’entraînement, pas sur une recherche web en direct.
 *   Pour du « vrai » sourcing en ligne, il faudrait chaîner un outil de recherche (RAG, API Perplexity, etc.).
 * - Risque d’erreurs / labels incohérents : vérifier un échantillon avant un backfill massif.
 *
 * Variables : DATABASE_URL, GROQ_API_KEY
 * Optionnel : GROQ_MODEL (défaut : llama-3.1-8b-instant, aligné sur lib/services/ai)
 *
 * Usage :
 *   node scripts/backfill-track-genres-llm.js --dry-run --limit 20
 *   node scripts/backfill-track-genres-llm.js --max-llm-calls 5 --dry-run
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envPath = path.join(__dirname, '..', '.env');
  const envFile = fs.existsSync(envLocalPath)
    ? envLocalPath
    : fs.existsSync(envPath)
      ? envPath
      : null;
  if (envFile) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    });
  }
}

loadEnvFile();

const args = process.argv.slice(2);

function getArg(key) {
  const equalFormat = args.find((arg) => arg.startsWith(`--${key}=`));
  if (equalFormat) {
    return equalFormat.split('=').slice(1).join('=');
  }
  const keyIndex = args.indexOf(`--${key}`);
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    return args[keyIndex + 1];
  }
  return undefined;
}

function hasFlag(flag) {
  return args.includes(`--${flag}`);
}

const DRY_RUN = hasFlag('dry-run');
const DELAY_MS = Math.max(0, parseInt(getArg('delay-ms') || '400', 10) || 400);
const LIMIT = getArg('limit') != null ? parseInt(getArg('limit'), 10) : undefined;
const MAX_LLM_CALLS_RAW = getArg('max-llm-calls');
const MAX_LLM_CALLS =
  MAX_LLM_CALLS_RAW != null && MAX_LLM_CALLS_RAW !== ''
    ? parseInt(MAX_LLM_CALLS_RAW, 10)
    : undefined;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est requis.');
  process.exit(1);
}

const groqKey = process.env.GROQ_API_KEY;
if (!groqKey) {
  console.error('GROQ_API_KEY est requis.');
  process.exit(1);
}

if (
  MAX_LLM_CALLS != null &&
  (Number.isNaN(MAX_LLM_CALLS) || MAX_LLM_CALLS < 1)
) {
  console.error('--max-llm-calls doit être un entier ≥ 1.');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Groq = require('groq-sdk');

let llmCallCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maxLlmCallsError() {
  const e = new Error('MAX_LLM_CALLS');
  e.code = 'MAX_LLM_CALLS';
  return e;
}

const SYSTEM_PROMPT = `You are a music metadata assistant. Classify the PRIMARY musical genre of a track using widely known public knowledge about the artist and song (as typically found on Wikipedia, AllMusic, or streaming platforms).

Rules:
- Reply with ONE JSON object only, no markdown, no explanation.
- Shape: {"genre":"<label>"} where <label> is a short genre label in English (e.g. "Jazz", "Hip Hop", "Indie Pop").
- Use the most common industry-style genre for that artist's work for this track when known.
- If you are not confident or the release is too obscure, use {"genre":null}.
- Do not invent detailed subgenres unless they are standard; prefer broad labels when unsure.`;

/**
 * @param {string} title
 * @param {string} artistName
 * @returns {Promise<string|null>}
 */
async function classifyGenreWithGroq(title, artistName) {
  if (MAX_LLM_CALLS != null && llmCallCount >= MAX_LLM_CALLS) {
    throw maxLlmCallsError();
  }

  await sleep(DELAY_MS);

  const groq = new Groq({ apiKey: groqKey });

  const userPrompt = `Artist: ${artistName}
Track title: ${title}

Respond with JSON only: {"genre":"..."} or {"genre":null}.`;

  llmCallCount += 1;

  const createBody = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 80,
  };

  let response;
  try {
    response = await groq.chat.completions.create({
      ...createBody,
      response_format: { type: 'json_object' },
    });
  } catch (e) {
    if (
      /response_format|json_object|unsupported/i.test(String(e.message || e))
    ) {
      response = await groq.chat.completions.create(createBody);
    } else {
      throw e;
    }
  }

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  const g = parsed?.genre;
  if (g === null || g === undefined) {
    return null;
  }
  if (typeof g !== 'string') {
    return null;
  }
  const trimmed = g.trim();
  if (!trimmed || /^unknown$/i.test(trimmed)) {
    return null;
  }
  return trimmed.slice(0, 120);
}

async function main() {
  console.log(
    DRY_RUN
      ? 'Mode DRY-RUN : aucune écriture en base.\n'
      : 'Mise à jour des genres (LLM Groq).\n'
  );
  console.log(`Modèle : ${GROQ_MODEL}`);
  console.log(`Délai entre appels LLM : ${DELAY_MS} ms`);
  if (LIMIT != null && !Number.isNaN(LIMIT)) {
    console.log(`Limite de morceaux : ${LIMIT}`);
  }
  if (MAX_LLM_CALLS != null) {
    console.log(`Plafond d’appels LLM : ${MAX_LLM_CALLS}`);
  }
  console.log('');

  const tracks = await prisma.track.findMany({
    where: { genre: null },
    include: { artist: true },
    orderBy: { id: 'asc' },
    ...(LIMIT != null && !Number.isNaN(LIMIT) && LIMIT > 0 ? { take: LIMIT } : {}),
  });

  console.log(`Morceaux sans genre : ${tracks.length}\n`);

  let updated = 0;
  let skippedNull = 0;
  let errors = 0;
  let stoppedByCap = false;

  for (let i = 0; i < tracks.length; i++) {
    const tr = tracks[i];
    const label = `"${tr.title}" — ${tr.artist.name}`;
    process.stdout.write(`[${i + 1}/${tracks.length}] ${label} … `);

    try {
      const genre = await classifyGenreWithGroq(tr.title, tr.artist.name);

      if (genre == null) {
        skippedNull++;
        console.log('genre inconnu (null).');
        continue;
      }

      if (DRY_RUN) {
        updated++;
        console.log(`serait : "${genre}"`);
        continue;
      }

      await prisma.track.update({
        where: { id: tr.id },
        data: { genre },
      });
      updated++;
      console.log(`→ "${genre}"`);
    } catch (e) {
      if (e.code === 'MAX_LLM_CALLS') {
        stoppedByCap = true;
        console.log(
          `\nArrêt : plafond de ${MAX_LLM_CALLS} appel(s) LLM atteint.`
        );
        break;
      }
      errors++;
      console.log(`erreur: ${e.message}`);
    }
  }

  console.log('\n--- Résumé ---');
  if (stoppedByCap) {
    console.log(`Appels LLM utilisés : ${llmCallCount} / ${MAX_LLM_CALLS}`);
  } else if (MAX_LLM_CALLS != null) {
    console.log(`Appels LLM utilisés : ${llmCallCount}`);
  }
  console.log(DRY_RUN ? `Serait mis à jour : ${updated}` : `Mis à jour : ${updated}`);
  console.log(`LLM sans genre (null) : ${skippedNull}`);
  console.log(`Erreurs : ${errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
