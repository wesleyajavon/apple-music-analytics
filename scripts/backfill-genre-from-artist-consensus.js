#!/usr/bin/env node

/**
 * Remplit Track.genre manquant en réutilisant les genres déjà connus **pour le même artiste**.
 *
 * Idée : parmi les morceaux où `genre` est renseigné, on calcule un **consensus** par artiste
 * (genre le plus représentatif), puis on l’applique aux morceaux du même artiste où `genre` est NULL.
 *
 * Stratégies :
 *   --strategy track-count   : le genre le plus fréquent (nombre de **morceaux** étiquetés).
 *   --strategy listen-weighted (défaut) : on pondère chaque morceau étiqueté par
 *     (nombre d’écoutes + 1), puis on somme par genre — reflète mieux ce que tu écoutes vraiment.
 *
 * Options :
 *   --min-known-tracks N : n’appliquer le consensus que si l’artiste a au moins N morceaux déjà
 *     avec un genre non vide (réduit le bruit quand un seul morceau a un tag douteux). Défaut : 1.
 *   --dry-run : affiche les comptes sans UPDATE.
 *
 * Limite : les artistes **sans aucun** morceau avec genre restent inchangés (il faudrait APIs / LLM).
 *
 * Les stats « Unknown » viennent de COALESCE(t.genre, 'Unknown') : corriger `Track.genre` suffit.
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
const STRATEGY = getArg('strategy') || 'listen-weighted';
const MIN_KNOWN = Math.max(
  1,
  parseInt(getArg('min-known-tracks') || '1', 10) || 1
);

if (!['track-count', 'listen-weighted'].includes(STRATEGY)) {
  console.error('--strategy doit être track-count ou listen-weighted.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est requis.');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * CTE `winner` : ("artistId", winning_genre)
 * @param {'track-count'|'listen-weighted'} strategy
 * @param {number} minKnown
 */
function buildWinnerCte(strategy, minKnown) {
  const artistEligible = `
    artist_eligible AS (
      SELECT "artistId"
      FROM "Track"
      WHERE genre IS NOT NULL AND BTRIM(genre) <> ''
      GROUP BY "artistId"
      HAVING COUNT(*) >= ${minKnown}
    )`;

  if (strategy === 'track-count') {
    return `
      WITH ${artistEligible},
      genre_counts AS (
        SELECT t."artistId", t.genre, COUNT(*)::bigint AS weight
        FROM "Track" t
        INNER JOIN artist_eligible ae ON ae."artistId" = t."artistId"
        WHERE t.genre IS NOT NULL AND BTRIM(t.genre) <> ''
        GROUP BY t."artistId", t.genre
      ),
      ranked AS (
        SELECT
          "artistId",
          genre,
          ROW_NUMBER() OVER (
            PARTITION BY "artistId"
            ORDER BY weight DESC, genre ASC
          ) AS rn
        FROM genre_counts
      ),
      winner AS (
        SELECT "artistId", genre AS winning_genre
        FROM ranked
        WHERE rn = 1
      )`;
  }

  return `
    WITH ${artistEligible},
    listen_counts AS (
      SELECT "trackId", COUNT(*)::bigint AS cnt
      FROM "Listen"
      GROUP BY "trackId"
    ),
    per_labeled_track AS (
      SELECT
        t."artistId",
        t.genre,
        COALESCE(lc.cnt, 0)::bigint + 1 AS weight
      FROM "Track" t
      INNER JOIN artist_eligible ae ON ae."artistId" = t."artistId"
      LEFT JOIN listen_counts lc ON lc."trackId" = t.id
      WHERE t.genre IS NOT NULL AND BTRIM(t.genre) <> ''
    ),
    genre_weights AS (
      SELECT "artistId", genre, SUM(weight) AS weight
      FROM per_labeled_track
      GROUP BY "artistId", genre
    ),
    ranked AS (
      SELECT
        "artistId",
        genre,
        ROW_NUMBER() OVER (
          PARTITION BY "artistId"
          ORDER BY weight DESC, genre ASC
        ) AS rn
      FROM genre_weights
    ),
    winner AS (
      SELECT "artistId", genre AS winning_genre
      FROM ranked
      WHERE rn = 1
    )`;
}

async function main() {
  console.log('Backfill genre par consensus artiste (données déjà présentes en base).\n');
  console.log(`Stratégie : ${STRATEGY}`);
  console.log(`Morceaux étiquetés minimum par artiste (éligible) : ${MIN_KNOWN}`);
  console.log(DRY_RUN ? 'Mode DRY-RUN : aucun UPDATE.\n' : 'Écriture en base activée.\n');

  const winnerCte = buildWinnerCte(STRATEGY, MIN_KNOWN);

  const countSql = `
    ${winnerCte}
    SELECT COUNT(*)::bigint AS n
    FROM "Track" t
    INNER JOIN winner w ON w."artistId" = t."artistId"
    WHERE t.genre IS NULL
  `;

  const previewSql = `
    ${winnerCte}
    SELECT t.id, t.title, a.name AS artist, w.winning_genre
    FROM "Track" t
    INNER JOIN "Artist" a ON a.id = t."artistId"
    INNER JOIN winner w ON w."artistId" = t."artistId"
    WHERE t.genre IS NULL
    LIMIT 15
  `;

  const countRows = await prisma.$queryRawUnsafe(countSql);
  const n = countRows[0]?.n ?? 0;
  console.log(`Morceaux sans genre qui peuvent recevoir un genre par consensus : ${n}`);

  if (Number(n) === 0) {
    await prisma.$disconnect();
    return;
  }

  const samples = await prisma.$queryRawUnsafe(previewSql);
  console.log('\nExemples (15 premiers) :');
  for (const row of samples) {
    console.log(
      `  → "${row.title}" — ${row.artist}  ⇒  ${row.winning_genre}`
    );
  }

  if (DRY_RUN) {
    console.log('\nRelance sans --dry-run pour appliquer les UPDATE.');
    await prisma.$disconnect();
    return;
  }

  const updateSql = `
    ${winnerCte}
    UPDATE "Track" t
    SET genre = w.winning_genre, "updatedAt" = NOW()
    FROM winner w
    WHERE t."artistId" = w."artistId"
      AND t.genre IS NULL
  `;

  const result = await prisma.$executeRawUnsafe(updateSql);
  console.log(`\nMise à jour terminée (lignes affectées côté driver : ${result}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
