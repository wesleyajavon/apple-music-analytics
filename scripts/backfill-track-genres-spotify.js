#!/usr/bin/env node

/**
 * Remplit Track.genre pour les morceaux sans genre, via l’API Spotify (Client Credentials).
 *
 * Flux par morceau :
 * 1. GET /v1/search — type=track, requête `track:"…" artist:"…"` (titre + nom d’artiste en base).
 * 2. Premier résultat track → tous les artistes crédités (ordre conservé, IDs uniques).
 * 3. Pour chaque artiste du morceau (ordre des crédits, IDs uniques) : GET /v1/artists/{id} jusqu’au
 *    premier qui a des `genres` ; on retient **genres[0]**.
 *    (On n’utilise pas GET /v1/artists?ids=… : certains projets reçoivent 403 Forbidden sur le batch.)
 *    Si aucun artiste n’a de genres dans l’API, le morceau n’est **pas** mis à jour (genre reste null).
 *
 * Limite Spotify : sur le Web API, `genres` est souvent **vide** même quand l’app affiche des styles ;
 * ce script ne peut pas récupérer ce que l’API ne renvoie pas.
 *
 * Variables d’environnement :
 *   DATABASE_URL, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 *
 * Usage :
 *   node scripts/backfill-track-genres-spotify.js
 *   node scripts/backfill-track-genres-spotify.js --dry-run
 *   node scripts/backfill-track-genres-spotify.js --delay-ms 300 --limit 50
 *   node scripts/backfill-track-genres-spotify.js --max-api-requests 5 --dry-run
 *
 * `--max-api-requests` : plafond de requêtes HTTP GET vers `api.spotify.com` (1 search + jusqu’à N
 * GET artiste par morceau ; le token sur `accounts.spotify.com` n’est pas compté). À l’atteinte du
 * plafond, le script s’arrête proprement.
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
const DELAY_MS = Math.max(0, parseInt(getArg('delay-ms') || '250', 10) || 250);
const LIMIT = getArg('limit') != null ? parseInt(getArg('limit'), 10) : undefined;
const MAX_API_REQUESTS_RAW = getArg('max-api-requests');
const MAX_API_REQUESTS =
  MAX_API_REQUESTS_RAW != null && MAX_API_REQUESTS_RAW !== ''
    ? parseInt(MAX_API_REQUESTS_RAW, 10)
    : undefined;

/** Compte uniquement les GET vers api.spotify.com (incl. retries 401/429). */
let spotifyApiRequestCount = 0;

function maxApiRequestsError() {
  const e = new Error('MAX_API_REQUESTS');
  e.code = 'MAX_API_REQUESTS';
  return e;
}

if (typeof fetch === 'undefined') {
  console.error('Ce script nécessite Node.js 18+ (fetch natif).');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est requis.');
  process.exit(1);
}

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET sont requis.');
  process.exit(1);
}

if (
  MAX_API_REQUESTS != null &&
  (Number.isNaN(MAX_API_REQUESTS) || MAX_API_REQUESTS < 1)
) {
  console.error('--max-api-requests doit être un entier ≥ 1.');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API = 'https://api.spotify.com/v1';

/**
 * 403 « Active premium subscription required for the owner of the app » : Spotify exige un
 * abonnement actif pour le **compte qui a créé l’app** sur https://developer.spotify.com
 * (pas seulement un compte « écoute »). Après un passage Premium, un délai de quelques
 * heures est possible avant que l’API accepte les requêtes.
 *
 * @param {string} context
 * @param {number} status
 * @param {string} body
 */
function throwSpotifyHttpError(context, status, body) {
  const err = new Error(`${context} failed: ${status} ${body}`);
  if (
    status === 403 &&
    /premium subscription required/i.test(body) &&
    /owner of the app/i.test(body)
  ) {
    err.code = 'SPOTIFY_PREMIUM_403';
    err.hint =
      'Abonnement Premium requis pour le compte propriétaire de l’app (dashboard Spotify for Developers). ' +
      'Si tu viens de passer Premium, attends quelques heures puis réessaie. ' +
      'Vérifie que SPOTIFY_CLIENT_ID correspond bien à une app de ce compte.';
  }
  throw err;
}

let cachedToken = null;
let tokenExpiresAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');

  const res = await fetch(SPOTIFY_ACCOUNTS, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify token: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  tokenExpiresAt = Date.now() + expiresIn * 1000;
  return cachedToken;
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{ authRetry?: boolean, rate429Count?: number }} [state]
 */
async function spotifyGet(url, init = {}, state = {}) {
  const authRetry = state.authRetry === true;
  const rate429Count = state.rate429Count ?? 0;
  const MAX_429 = 5;

  if (MAX_API_REQUESTS != null && spotifyApiRequestCount >= MAX_API_REQUESTS) {
    throw maxApiRequestsError();
  }

  await sleep(DELAY_MS);
  const token = await getAccessToken();
  spotifyApiRequestCount += 1;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 && !authRetry) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return spotifyGet(url, init, { authRetry: true, rate429Count });
  }

  if (res.status === 429 && rate429Count < MAX_429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
    console.warn(`   Rate limit (429), attente ${retryAfter}s…`);
    await sleep(retryAfter * 1000);
    return spotifyGet(url, init, { authRetry, rate429Count: rate429Count + 1 });
  }

  return res;
}

/** Évite de casser la requête field-filter si guillemets dans le titre / nom */
function sanitizeForQuery(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.replace(/"/g, ' ').trim();
}

function buildSearchQuery(title, artistName) {
  const t = sanitizeForQuery(title);
  const a = sanitizeForQuery(artistName);
  return `track:"${t}" artist:"${a}"`;
}

/**
 * @returns {Promise<{ genre: string | null, reason: 'no_track' | 'no_artist' | 'empty_genres' | null }>}
 */
async function fetchGenreForTrack(title, artistName) {
  const q = buildSearchQuery(title, artistName);
  const searchUrl = `${SPOTIFY_API}/search?${new URLSearchParams({
    q,
    type: 'track',
    limit: '1',
  })}`;

  const searchRes = await spotifyGet(searchUrl);
  if (!searchRes.ok) {
    const text = await searchRes.text();
    throwSpotifyHttpError('Search', searchRes.status, text);
  }

  const searchJson = await searchRes.json();
  const items = searchJson?.tracks?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { genre: null, reason: 'no_track' };
  }

  const firstTrack = items[0];
  const artists = firstTrack?.artists;
  if (!Array.isArray(artists) || artists.length === 0) {
    return { genre: null, reason: 'no_artist' };
  }

  const seen = new Set();
  const artistIdsOrdered = [];
  for (const a of artists) {
    if (a?.id && !seen.has(a.id)) {
      seen.add(a.id);
      artistIdsOrdered.push(a.id);
    }
  }
  if (artistIdsOrdered.length === 0) {
    return { genre: null, reason: 'no_artist' };
  }

  for (const id of artistIdsOrdered.slice(0, 50)) {
    const artistUrl = `${SPOTIFY_API}/artists/${encodeURIComponent(id)}`;
    const artistRes = await spotifyGet(artistUrl);

    if (!artistRes.ok) {
      const text = await artistRes.text();
      throwSpotifyHttpError('Artist', artistRes.status, text);
    }

    const artistJson = await artistRes.json();
    const genres = artistJson?.genres;
    if (Array.isArray(genres) && genres.length > 0) {
      return { genre: genres[0], reason: null };
    }
  }

  return { genre: null, reason: 'empty_genres' };
}

async function main() {
  console.log(DRY_RUN ? 'Mode DRY-RUN : aucune écriture en base.\n' : 'Mise à jour des genres (Spotify).\n');
  console.log(`Délai entre requêtes Spotify : ${DELAY_MS} ms`);
  if (LIMIT != null && !Number.isNaN(LIMIT)) {
    console.log(`Limite de morceaux : ${LIMIT}`);
  }
  if (MAX_API_REQUESTS != null) {
    console.log(
      `Plafond requêtes API (GET api.spotify.com uniquement) : ${MAX_API_REQUESTS}`
    );
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
  let skippedNoMatch = 0;
  let skippedNoGenre = 0;
  let errors = 0;
  let stoppedByApiCap = false;
  let stoppedBySpotifyPremium403 = false;

  for (let i = 0; i < tracks.length; i++) {
    const tr = tracks[i];
    const label = `"${tr.title}" — ${tr.artist.name}`;
    process.stdout.write(`[${i + 1}/${tracks.length}] ${label} … `);

    try {
      const { genre, reason } = await fetchGenreForTrack(tr.title, tr.artist.name);

      if (genre == null) {
        if (reason === 'empty_genres') {
          skippedNoGenre++;
          console.log(
            'aucun genre dans l’API Spotify pour les artistes du morceau (souvent vide côté API).'
          );
        } else {
          skippedNoMatch++;
          console.log(
            reason === 'no_track'
              ? 'aucun morceau trouvé sur Spotify.'
              : 'morceau sans artiste associé côté Spotify.'
          );
        }
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
      if (e.code === 'MAX_API_REQUESTS') {
        stoppedByApiCap = true;
        console.log(
          `\nArrêt : plafond de ${MAX_API_REQUESTS} requête(s) vers api.spotify.com atteint.`
        );
        break;
      }
      if (e.code === 'SPOTIFY_PREMIUM_403') {
        stoppedBySpotifyPremium403 = true;
        errors++;
        console.log(`erreur: ${e.message}`);
        if (e.hint) {
          console.log(`\n→ ${e.hint}`);
        }
        console.log('\nArrêt : l’API Spotify refuse les requêtes tant que le statut Premium du compte développeur n’est pas pris en compte.');
        break;
      }
      errors++;
      console.log(`erreur: ${e.message}`);
    }
  }

  console.log('\n--- Résumé ---');
  if (stoppedBySpotifyPremium403) {
    console.log(
      'Spotify a renvoyé 403 (Premium requis pour le propriétaire de l’app). Réessaie plus tard ou vérifie le compte sur developer.spotify.com.'
    );
  }
  if (stoppedByApiCap) {
    console.log(`Requêtes API Spotify utilisées : ${spotifyApiRequestCount} / ${MAX_API_REQUESTS}`);
  } else if (MAX_API_REQUESTS != null) {
    console.log(`Requêtes API Spotify utilisées : ${spotifyApiRequestCount}`);
  }
  console.log(DRY_RUN ? `Serait mis à jour : ${updated}` : `Mis à jour : ${updated}`);
  console.log(`Sans correspondance / pas d’artiste : ${skippedNoMatch}`);
  console.log(`Sans genre exploitable (API Spotify vide pour tous les artistes du morceau) : ${skippedNoGenre}`);
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
