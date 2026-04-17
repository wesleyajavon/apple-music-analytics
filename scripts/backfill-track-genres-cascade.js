#!/usr/bin/env node

/**
 * Cascade « coût minimal » pour remplir Track.genre (sans LLM).
 *
 * Ordre (s’arrête dès qu’un genre est trouvé) :
 *  1. Last.fm — artist.getTopTags
 *  2. Last.fm — track.getTopTags
 *  3. MusicBrainz — tags sur l’artiste si Artist.mbid
 *  4. MusicBrainz — tags sur l’enregistrement si Track.mbid
 *
 * Variables : DATABASE_URL, LASTFM_API_KEY
 *
 * Usage :
 *   node scripts/backfill-track-genres-cascade.js
 *   node scripts/backfill-track-genres-cascade.js --dry-run --limit 50
 *   node scripts/backfill-track-genres-cascade.js --batch-size 400
 *
 * Sans `--limit`, tous les morceaux sans genre sont parcourus par lots (`--batch-size`, défaut 300)
 * pour limiter la mémoire. La pagination utilise l’id (curseur), ce qui fonctionne aussi en --dry-run.
 *
 * Rate limits (résumé) :
 * - Last.fm : pas de chiffre officiel ; éviter les rafales. Erreur JSON 29 = rate limit → le script
 *   attend et réessaie une fois.
 * - MusicBrainz : ~1 requête / seconde / IP (sinon 503). Un délai minimum de 1100 ms est appliqué
 *   avant chaque appel MB, même si --delay-ms est plus bas.
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
/** Délai entre requêtes Last.fm (et base pour les autres sauf planchers ci-dessous). */
const DELAY_MS = Math.max(0, parseInt(getArg('delay-ms') || '1200', 10) || 1200);

/** MusicBrainz : doc officielle ~1 req/s / IP — ne pas descendre en dessous pour les appels MB. */
const MIN_MS_MUSICBRAINZ = 1100;

const LIMIT = getArg('limit') != null ? parseInt(getArg('limit'), 10) : undefined;
const BATCH_SIZE = Math.max(
  1,
  parseInt(getArg('batch-size') || '300', 10) || 300
);

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';
const MB_BASE = 'https://musicbrainz.org/ws/2';
const MB_UA = 'AppleMusicAnalytics/1.0 (genre-cascade; +https://github.com/)';

/** Tags Last.fm souvent peu utiles comme « genre » */
const SKIP_LASTFM_TAGS = new Set([
  'seen live',
  'favorites',
  'favourites',
  'under 2000 listeners',
  'want to see live',
  'amazing',
  'love',
  'beautiful',
  'favorite',
  'favourite',
]);

if (typeof fetch === 'undefined') {
  console.error('Ce script nécessite Node.js 18+ (fetch natif).');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est requis.');
  process.exit(1);
}

const lastfmKey = process.env.LASTFM_API_KEY;
if (!lastfmKey) {
  console.error('LASTFM_API_KEY est requis pour la cascade (coût minimal).');
  process.exit(1);
}

if (LIMIT != null && (Number.isNaN(LIMIT) || LIMIT < 1)) {
  console.error('--limit doit être un entier ≥ 1.');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTagLabel(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim();
  if (!t) return null;
  return t.slice(0, 120);
}

/**
 * @param {Array<{ name?: string, count?: number }>} raw
 */
function pickLastFmTag(raw) {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : [raw];
  const sorted = [...list]
    .filter((t) => t && t.name)
    .sort((a, b) => (b.count || 0) - (a.count || 0));
  for (const t of sorted) {
    const n = normalizeTagLabel(t.name);
    if (!n) continue;
    if (SKIP_LASTFM_TAGS.has(n.toLowerCase())) continue;
    return n;
  }
  return null;
}

async function lastfmApi(params, isRetryAfterRateLimit = false) {
  await sleep(DELAY_MS);
  const method = params.method;
  const u = new URL(LASTFM_BASE);
  u.searchParams.set('method', method);
  u.searchParams.set('api_key', lastfmKey);
  u.searchParams.set('format', 'json');
  Object.entries(params).forEach(([k, v]) => {
    if (k === 'method') return;
    if (v != null) u.searchParams.set(k, String(v));
  });
  const res = await fetch(u.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Last.fm HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  // 29 = Rate Limit Exceeded (https://www.last.fm/api/errorcodes)
  if (data.error === 29 && !isRetryAfterRateLimit) {
    console.warn('   Last.fm rate limit (29), attente 5s puis nouvel essai…');
    await sleep(5000);
    return lastfmApi({ ...params }, true);
  }
  return data;
}

/**
 * @returns {Promise<string|null>}
 */
async function fetchGenreLastFmArtist(artistName) {
  const data = await lastfmApi({
    method: 'artist.getTopTags',
    artist: artistName,
  });
  if (data.error) {
    return null;
  }
  const tags = data?.toptags?.tag;
  return pickLastFmTag(tags);
}

/**
 * @returns {Promise<string|null>}
 */
async function fetchGenreLastFmTrack(artistName, title) {
  const data = await lastfmApi({
    method: 'track.getTopTags',
    artist: artistName,
    track: title,
  });
  if (data.error) {
    return null;
  }
  const tags = data?.toptags?.tag;
  return pickLastFmTag(tags);
}

/**
 * @param {Array<{ name?: string, count?: number }>} tags
 */
function pickMusicBrainzTag(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const sorted = [...tags].sort((a, b) => (b.count || 0) - (a.count || 0));
  const first = sorted[0];
  return normalizeTagLabel(first?.name);
}

async function fetchMusicBrainzJson(urlPath, mb503Attempt = 0) {
  await sleep(Math.max(DELAY_MS, MIN_MS_MUSICBRAINZ));
  const res = await fetch(`${MB_BASE}${urlPath}`, {
    headers: { 'User-Agent': MB_UA, Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (res.status === 503 && mb503Attempt < 2) {
    const ra = parseInt(res.headers.get('Retry-After') || '2', 10);
    console.warn(
      `   MusicBrainz 503 (rate limit serveur), attente ${ra}s puis nouvel essai…`
    );
    await sleep(Math.max(ra, 2) * 1000);
    return fetchMusicBrainzJson(urlPath, mb503Attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MusicBrainz HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * @returns {Promise<string|null>}
 */
async function fetchGenreMbArtist(mbid) {
  if (!mbid) return null;
  const data = await fetchMusicBrainzJson(`/artist/${encodeURIComponent(mbid)}?inc=tags&fmt=json`);
  if (!data?.tags) return null;
  return pickMusicBrainzTag(data.tags);
}

/**
 * @returns {Promise<string|null>}
 */
async function fetchGenreMbRecording(mbid) {
  if (!mbid) return null;
  const data = await fetchMusicBrainzJson(`/recording/${encodeURIComponent(mbid)}?inc=tags&fmt=json`);
  if (!data?.tags) return null;
  return pickMusicBrainzTag(data.tags);
}

/**
 * @returns {Promise<{ genre: string | null, source: string }>}
 */
async function resolveGenreCascade(tr) {
  const artistName = tr.artist.name;
  const title = tr.title;

  let g = await fetchGenreLastFmArtist(artistName);
  if (g) return { genre: g, source: 'lastfm_artist' };

  g = await fetchGenreLastFmTrack(artistName, title);
  if (g) return { genre: g, source: 'lastfm_track' };

  if (tr.artist.mbid) {
    g = await fetchGenreMbArtist(tr.artist.mbid);
    if (g) return { genre: g, source: 'musicbrainz_artist' };
  }

  if (tr.mbid) {
    g = await fetchGenreMbRecording(tr.mbid);
    if (g) return { genre: g, source: 'musicbrainz_recording' };
  }

  return { genre: null, source: 'none' };
}

async function main() {
  console.log(
    DRY_RUN
      ? 'Mode DRY-RUN : aucune écriture en base.\n'
      : 'Mise à jour des genres (cascade).\n'
  );
  console.log('Ordre : Last.fm (artiste) → Last.fm (morceau) → MusicBrainz si MBID');

  console.log(`Délai entre requêtes Last.fm : ${DELAY_MS} ms`);
  console.log(
    `MusicBrainz : minimum ${MIN_MS_MUSICBRAINZ} ms entre chaque requête (plancher appliqué automatiquement).`
  );
  if (LIMIT != null && !Number.isNaN(LIMIT)) {
    console.log(`Limite totale de morceaux à traiter : ${LIMIT}`);
  } else {
    console.log('Aucune limite : tous les morceaux sans genre seront traités.');
  }
  console.log(`Taille des lots (Prisma) : ${BATCH_SIZE}`);
  console.log('');

  const pendingAtStart = await prisma.track.count({ where: { genre: null } });
  const maxToProcess =
    LIMIT != null ? Math.min(LIMIT, pendingAtStart) : pendingAtStart;

  console.log(`Morceaux sans genre au départ : ${pendingAtStart}`);
  if (maxToProcess === 0) {
    console.log('Rien à faire.');
    return;
  }
  if (LIMIT != null) {
    console.log(`Plafond pour cette exécution : ${maxToProcess} morceau(x).\n`);
  } else {
    console.log(`Objectif : traiter jusqu’à ${maxToProcess} morceau(x).\n`);
  }

  let updated = 0;
  const bySource = {};
  let skipped = 0;
  let errors = 0;
  let processedTotal = 0;
  let batchIndex = 0;
  /** @type {string|null} dernier id du lot (curseur id > …) — marche aussi en --dry-run */
  let cursorAfterId = null;
  let abortRun = false;

  while (processedTotal < maxToProcess && !abortRun) {
    const take = Math.min(BATCH_SIZE, maxToProcess - processedTotal);
    const batch = await prisma.track.findMany({
      where: {
        genre: null,
        ...(cursorAfterId ? { id: { gt: cursorAfterId } } : {}),
      },
      include: { artist: true },
      orderBy: { id: 'asc' },
      take,
    });

    if (batch.length === 0) {
      break;
    }

    batchIndex += 1;
    cursorAfterId = batch[batch.length - 1].id;

    console.log(
      `--- Lot ${batchIndex} (${batch.length} morceaux, ${processedTotal + 1}–${processedTotal + batch.length} / ${maxToProcess}) ---`
    );

    for (let i = 0; i < batch.length; i++) {
      const tr = batch[i];
      processedTotal += 1;
      const label = `"${tr.title}" — ${tr.artist.name}`;
      process.stdout.write(`[${processedTotal}/${maxToProcess}] ${label} … `);

      try {
        const { genre, source } = await resolveGenreCascade(tr);

        bySource[source] = (bySource[source] || 0) + 1;

        if (genre == null) {
          skipped++;
          console.log(`rien (${source}).`);
          continue;
        }

        if (DRY_RUN) {
          updated++;
          console.log(`serait : "${genre}" [${source}]`);
          continue;
        }

        await prisma.track.update({
          where: { id: tr.id },
          data: { genre },
        });
        updated++;
        console.log(`→ "${genre}" [${source}]`);
      } catch (e) {
        errors++;
        console.log(`erreur: ${e.message}`);
      }
    }
  }

  console.log('\n--- Résumé ---');
  console.log(DRY_RUN ? `Serait mis à jour : ${updated}` : `Mis à jour : ${updated}`);
  console.log(`Sans résultat : ${skipped}`);
  console.log(`Erreurs : ${errors}`);
  console.log('Par source (tentatives) :', JSON.stringify(bySource, null, 0));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
