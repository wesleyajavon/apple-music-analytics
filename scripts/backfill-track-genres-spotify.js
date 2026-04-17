#!/usr/bin/env node

/**
 * Remplit Track.genre pour les morceaux sans genre, via Spotify Web API (Client Credentials).
 *
 * Mode recommandé (post-import utilisateur) :
 * - Priorise les artistes "unknown" avec le plus d'écoutes de l'utilisateur (`--user-id`)
 * - Tente de résoudre le genre artiste via:
 *   1) GET /v1/search?type=artist&q=artist:"Name"
 *   2) GET /v1/artists/{id}
 * - Applique le genre trouvé à tous les tracks sans genre de cet artiste
 * - S'arrête quand le taux de tracks unknown de l'utilisateur atteint la cible (`--target-unknown-pct`)
 *
 * L'endpoint de référence utilisé est bien GET /v1/artists/{id}:
 * https://developer.spotify.com/documentation/web-api/reference/get-an-artist
 *
 * Variables d’environnement :
 *   DATABASE_URL, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 *
 * Usage :
 *   node scripts/backfill-track-genres-spotify.js --user-id=<uuid>
 *   node scripts/backfill-track-genres-spotify.js --user-id=<uuid> --target-unknown-pct 12
 *   node scripts/backfill-track-genres-spotify.js --dry-run
 *   node scripts/backfill-track-genres-spotify.js --user-id=<uuid> --max-artists 200
 *   node scripts/backfill-track-genres-spotify.js --delay-ms 300 --max-api-requests 250
 *
 * Notes:
 * - `genres` côté Spotify peut être vide (champ annoncé comme deprecated). Dans ce cas on skippe.
 * - `--max-api-requests` plafonne les requêtes GET vers api.spotify.com.
 * - sans `--user-id`, le script repasse en mode fallback "par track" (ancien comportement).
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
const USER_ID = getArg('user-id');
const TARGET_UNKNOWN_PCT = parseFloat(getArg('target-unknown-pct') || '15');
const MAX_ARTISTS = getArg('max-artists') != null ? parseInt(getArg('max-artists'), 10) : undefined;
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

if (Number.isNaN(TARGET_UNKNOWN_PCT) || TARGET_UNKNOWN_PCT < 0 || TARGET_UNKNOWN_PCT > 100) {
  console.error('--target-unknown-pct doit être un nombre entre 0 et 100.');
  process.exit(1);
}

if (MAX_ARTISTS != null && (Number.isNaN(MAX_ARTISTS) || MAX_ARTISTS < 1)) {
  console.error('--max-artists doit être un entier >= 1.');
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

function normalizeText(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
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

function buildArtistSearchQuery(artistName) {
  const a = sanitizeForQuery(artistName);
  return `artist:"${a}"`;
}

async function searchArtistOnSpotify(artistName) {
  const q = buildArtistSearchQuery(artistName);
  const searchUrl = `${SPOTIFY_API}/search?${new URLSearchParams({
    q,
    type: 'artist',
    limit: '5',
  })}`;
  const res = await spotifyGet(searchUrl);
  if (!res.ok) {
    const text = await res.text();
    throwSpotifyHttpError('Search artist', res.status, text);
  }
  const json = await res.json();
  const items = json?.artists?.items;
  if (!Array.isArray(items) || items.length === 0) return null;

  const target = normalizeText(artistName);
  let best = null;
  let bestScore = -1;
  for (const it of items) {
    if (!it?.id || !it?.name) continue;
    const candidate = normalizeText(it.name);
    let score = 0;
    if (candidate === target) score = 100;
    else if (candidate.includes(target) || target.includes(candidate)) score = 70;
    else score = 10;
    const popularity = typeof it.popularity === 'number' ? it.popularity : 0;
    score += Math.min(20, Math.floor(popularity / 5));
    if (score > bestScore) {
      best = it;
      bestScore = score;
    }
  }
  return best;
}

async function fetchPrimaryGenreForArtistName(artistName) {
  const artistHit = await searchArtistOnSpotify(artistName);
  if (!artistHit?.id) {
    return { genre: null, reason: 'no_artist_match' };
  }
  const artistUrl = `${SPOTIFY_API}/artists/${encodeURIComponent(artistHit.id)}`;
  const artistRes = await spotifyGet(artistUrl);
  if (!artistRes.ok) {
    const text = await artistRes.text();
    throwSpotifyHttpError('Get artist', artistRes.status, text);
  }
  const artistJson = await artistRes.json();
  const genres = artistJson?.genres;
  if (!Array.isArray(genres) || genres.length === 0) {
    return { genre: null, reason: 'empty_genres' };
  }
  return { genre: genres[0], reason: null };
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

async function getUserUnknownTrackStats(userId) {
  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT l."trackId")::int AS total
    FROM "Listen" l
    WHERE l."userId" = ${userId}
  `;
  const unknownRows = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT l."trackId")::int AS unknown
    FROM "Listen" l
    JOIN "Track" t ON t.id = l."trackId"
    WHERE l."userId" = ${userId}
      AND t."genre" IS NULL
  `;
  const total = totalRows?.[0]?.total ?? 0;
  const unknown = unknownRows?.[0]?.unknown ?? 0;
  const ratio = total > 0 ? (unknown / total) * 100 : 0;
  return { total, unknown, ratio };
}

async function getTopUnknownArtistsByUserListens(userId, take) {
  const rows = await prisma.$queryRaw`
    SELECT
      a.id AS "artistId",
      a.name AS "artistName",
      COUNT(l.id)::int AS "unknownListens"
    FROM "Listen" l
    JOIN "Track" t ON t.id = l."trackId"
    JOIN "Artist" a ON a.id = t."artistId"
    WHERE l."userId" = ${userId}
      AND t."genre" IS NULL
    GROUP BY a.id, a.name
    ORDER BY COUNT(l.id) DESC, a.name ASC
    LIMIT ${take}
  `;
  return rows;
}

async function applyGenreToArtistUnknownTracks(artistId, genre) {
  const res = await prisma.track.updateMany({
    where: { artistId, genre: null },
    data: { genre },
  });
  return res.count;
}

async function runUserPriorityMode() {
  console.log(DRY_RUN ? 'Mode DRY-RUN : aucune écriture en base.\n' : 'Mise à jour des genres (Spotify, priorité utilisateur).\n');
  console.log(`Utilisateur : ${USER_ID}`);
  console.log(`Seuil cible unknown tracks : ${TARGET_UNKNOWN_PCT.toFixed(2)}%`);
  if (MAX_ARTISTS != null) {
    console.log(`Max artistes à tenter : ${MAX_ARTISTS}`);
  }
  console.log(`Délai entre requêtes Spotify : ${DELAY_MS} ms`);
  if (MAX_API_REQUESTS != null) {
    console.log(`Plafond requêtes api.spotify.com : ${MAX_API_REQUESTS}`);
  }
  console.log('');

  const initial = await getUserUnknownTrackStats(USER_ID);
  console.log(`Tracks distincts (user) : ${initial.total}`);
  console.log(`Tracks unknown (user) : ${initial.unknown} (${initial.ratio.toFixed(2)}%)`);
  if (initial.total === 0) {
    console.log('Aucune écoute trouvée pour cet utilisateur.');
    return;
  }
  if (initial.ratio <= TARGET_UNKNOWN_PCT) {
    console.log('Le seuil cible est déjà atteint. Rien à faire.');
    return;
  }

  const artistTake = MAX_ARTISTS != null ? MAX_ARTISTS : 2000;
  const candidates = await getTopUnknownArtistsByUserListens(USER_ID, artistTake);
  if (!candidates.length) {
    console.log('Aucun artiste unknown à traiter.');
    return;
  }

  console.log(`Artistes unknown candidats : ${candidates.length}\n`);

  let mappedArtists = 0;
  let updatedTracks = 0;
  let skippedNoGenre = 0;
  let skippedNoMatch = 0;
  let errors = 0;
  let stoppedByApiCap = false;
  let stoppedBySpotifyPremium403 = false;

  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i];
    const artistId = row.artistId;
    const artistName = row.artistName;
    const unknownListens = row.unknownListens;

    process.stdout.write(
      `[${i + 1}/${candidates.length}] ${artistName} (${unknownListens} listens unknown) ... `
    );

    try {
      const { genre, reason } = await fetchPrimaryGenreForArtistName(artistName);
      if (!genre) {
        if (reason === 'empty_genres') {
          skippedNoGenre++;
          console.log('aucun genre exploitable (genres Spotify vides).');
        } else {
          skippedNoMatch++;
          console.log('pas de match artiste fiable sur Spotify.');
        }
        continue;
      }

      const affected = DRY_RUN ? 0 : await applyGenreToArtistUnknownTracks(artistId, genre);
      mappedArtists++;
      updatedTracks += affected;
      console.log(DRY_RUN ? `serait mappé -> "${genre}"` : `-> "${genre}" (${affected} track(s) mis à jour)`);

      const stats = await getUserUnknownTrackStats(USER_ID);
      console.log(
        `   unknown user: ${stats.unknown}/${stats.total} (${stats.ratio.toFixed(2)}%)`
      );
      if (stats.ratio <= TARGET_UNKNOWN_PCT) {
        console.log('Seuil cible atteint, arrêt du traitement.');
        break;
      }
    } catch (e) {
      if (e.code === 'MAX_API_REQUESTS') {
        stoppedByApiCap = true;
        console.log(`\nArrêt: plafond de ${MAX_API_REQUESTS} requête(s) api.spotify.com atteint.`);
        break;
      }
      if (e.code === 'SPOTIFY_PREMIUM_403') {
        stoppedBySpotifyPremium403 = true;
        errors++;
        console.log(`erreur: ${e.message}`);
        if (e.hint) console.log(`\n-> ${e.hint}`);
        break;
      }
      errors++;
      console.log(`erreur: ${e.message}`);
    }
  }

  const final = await getUserUnknownTrackStats(USER_ID);
  console.log('\n--- Résumé ---');
  if (stoppedBySpotifyPremium403) {
    console.log('Spotify 403 Premium propriétaire app: vérifier le compte developer.spotify.com.');
  }
  if (stoppedByApiCap) {
    console.log(`Requêtes API Spotify utilisées: ${spotifyApiRequestCount} / ${MAX_API_REQUESTS}`);
  } else if (MAX_API_REQUESTS != null) {
    console.log(`Requêtes API Spotify utilisées: ${spotifyApiRequestCount}`);
  }
  console.log(`Artistes mappés: ${mappedArtists}`);
  console.log(DRY_RUN ? `Tracks qui seraient mis à jour: (estimés via updateMany désactivé)` : `Tracks mis à jour: ${updatedTracks}`);
  console.log(`Artistes sans match: ${skippedNoMatch}`);
  console.log(`Artistes sans genres exploitables: ${skippedNoGenre}`);
  console.log(`Erreurs: ${errors}`);
  console.log(
    `Unknown user final: ${final.unknown}/${final.total} (${final.ratio.toFixed(2)}%), cible ${TARGET_UNKNOWN_PCT.toFixed(2)}%`
  );
}

async function main() {
  if (USER_ID) {
    await runUserPriorityMode();
    return;
  }

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
