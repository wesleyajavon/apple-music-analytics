/**
 * Remplit Track.genre via Groq (même logique compacte que l’import post-onboarding).
 *
 * Variables : DATABASE_URL, GROQ_API_KEY
 * Optionnel : GROQ_MODEL (défaut : voir lib/services/ai/groq-config)
 *
 * Usage :
 *   npx tsx scripts/backfill-track-genres-llm.ts --dry-run --limit 20
 *   npx tsx scripts/backfill-track-genres-llm.ts --max-llm-calls 5 --dry-run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { classifyPrimaryTrackGenreGroq } from "@/lib/services/genre/groq-track-genre-classify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envLocalPath = path.join(__dirname, "..", ".env.local");
  const envPath = path.join(__dirname, "..", ".env");
  const envFile = fs.existsSync(envLocalPath)
    ? envLocalPath
    : fs.existsSync(envPath)
      ? envPath
      : null;
  if (envFile) {
    const envContent = fs.readFileSync(envFile, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          const cleanValue = value.replace(/^["']|["']$/g, "");
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

function getArg(key: string): string | undefined {
  const equalFormat = args.find((arg) => arg.startsWith(`--${key}=`));
  if (equalFormat) {
    return equalFormat.split("=").slice(1).join("=");
  }
  const keyIndex = args.indexOf(`--${key}`);
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    return args[keyIndex + 1];
  }
  return undefined;
}

function hasFlag(flag: string) {
  return args.includes(`--${flag}`);
}

const DRY_RUN = hasFlag("dry-run");
const DELAY_MS = Math.max(0, parseInt(getArg("delay-ms") || "400", 10) || 400);
const LIMIT =
  getArg("limit") != null ? parseInt(getArg("limit")!, 10) : undefined;
const MAX_LLM_CALLS_RAW = getArg("max-llm-calls");
const MAX_LLM_CALLS =
  MAX_LLM_CALLS_RAW != null && MAX_LLM_CALLS_RAW !== ""
    ? parseInt(MAX_LLM_CALLS_RAW, 10)
    : undefined;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL est requis.");
  process.exit(1);
}

if (!process.env.GROQ_API_KEY?.trim()) {
  console.error("GROQ_API_KEY est requis.");
  process.exit(1);
}

if (MAX_LLM_CALLS != null && (Number.isNaN(MAX_LLM_CALLS) || MAX_LLM_CALLS < 1)) {
  console.error("--max-llm-calls doit être un entier ≥ 1.");
  process.exit(1);
}

const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maxLlmCallsError() {
  const e = new Error("MAX_LLM_CALLS") as Error & { code?: string };
  e.code = "MAX_LLM_CALLS";
  return e;
}

async function main() {
  console.log(
    DRY_RUN
      ? "Mode DRY-RUN : aucune écriture en base.\n"
      : "Mise à jour des genres (LLM Groq, prompts compacts).\n"
  );
  console.log(`Modèle : ${process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b (défaut)"}`);
  console.log(`Délai entre appels LLM : ${DELAY_MS} ms`);
  if (LIMIT != null && !Number.isNaN(LIMIT)) {
    console.log(`Limite de morceaux : ${LIMIT}`);
  }
  if (MAX_LLM_CALLS != null) {
    console.log(`Plafond d’appels LLM : ${MAX_LLM_CALLS}`);
  }
  console.log("");

  const tracks = await prisma.track.findMany({
    where: { genre: null },
    include: { artist: true },
    orderBy: { id: "asc" },
    ...(LIMIT != null && !Number.isNaN(LIMIT) && LIMIT > 0 ? { take: LIMIT } : {}),
  });

  console.log(`Morceaux sans genre : ${tracks.length}\n`);

  let updated = 0;
  let skippedNull = 0;
  let errors = 0;
  let stoppedByCap = false;
  let llmCallCount = 0;

  for (let i = 0; i < tracks.length; i++) {
    const tr = tracks[i]!;
    const label = `"${tr.title}" — ${tr.artist.name}`;
    process.stdout.write(`[${i + 1}/${tracks.length}] ${label} … `);

    try {
      if (MAX_LLM_CALLS != null && llmCallCount >= MAX_LLM_CALLS) {
        throw maxLlmCallsError();
      }

      await sleep(DELAY_MS);
      llmCallCount += 1;
      const genre = await classifyPrimaryTrackGenreGroq(tr.title, tr.artist.name);

      if (genre == null) {
        skippedNull++;
        console.log("genre inconnu (null).");
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
      const err = e as Error & { code?: string };
      if (err.code === "MAX_LLM_CALLS") {
        stoppedByCap = true;
        console.log(`\nArrêt : plafond de ${MAX_LLM_CALLS} appel(s) LLM atteint.`);
        break;
      }
      errors++;
      console.log(`erreur: ${err.message}`);
    }
  }

  console.log("\n--- Résumé ---");
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
