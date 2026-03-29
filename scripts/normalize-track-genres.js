#!/usr/bin/env node

/**
 * Normalise les libellés de Track.genre selon lib/data/genre-normalization.json
 * (fusion hip hop / Hip-Hop → libellé canonique, etc.).
 *
 * Usage :
 *   node scripts/normalize-track-genres.js --dry-run
 *   node scripts/normalize-track-genres.js
 *
 * Le module TypeScript lib/services/genre/genre-normalization.ts expose normalizeGenreLabel()
 * pour réutiliser les mêmes règles côté app (affichage / nouvelles importations).
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

function hasFlag(flag) {
  return args.includes(`--${flag}`);
}

const DRY_RUN = hasFlag('dry-run');

const JSON_PATH = path.join(
  __dirname,
  '..',
  'lib',
  'data',
  'genre-normalization.json'
);

function normKey(s) {
  return String(s).trim().toLowerCase();
}

/**
 * @param {{ groups: Array<{ canonical: string, aliases: string[] }> }} data
 * @returns {{ map: Map<string, string>, errors: string[] }}
 */
function buildAliasToCanonicalMap(data) {
  const map = new Map();
  const errors = [];
  const seen = new Map();

  for (const g of data.groups || []) {
    const canonical = String(g.canonical).trim();
    const keys = new Set();
    keys.add(normKey(canonical));
    for (const a of g.aliases || []) {
      keys.add(normKey(a));
    }
    for (const k of keys) {
      if (seen.has(k) && seen.get(k) !== canonical) {
        errors.push(
          `Conflit : "${k}" → "${seen.get(k)}" et "${canonical}" (édite genre-normalization.json)`
        );
      } else {
        seen.set(k, canonical);
        map.set(k, canonical);
      }
    }
  }

  return { map, errors };
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est requis.');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  const data = JSON.parse(raw);
  const { map, errors } = buildAliasToCanonicalMap(data);

  if (errors.length > 0) {
    console.error('Erreurs dans genre-normalization.json :\n');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(
    `Mapping chargé : ${data.groups?.length || 0} groupe(s), ${map.size} clé(s) normalisée(s).\n`
  );

  /** @type {Array<{ canonical: string, keys: string[], count: bigint }>} */
  const plan = [];

  for (const g of data.groups || []) {
    const canonical = String(g.canonical).trim();
    const keys = new Set();
    keys.add(normKey(canonical));
    for (const a of g.aliases || []) {
      keys.add(normKey(a));
    }
    const keyList = [...keys];

    const placeholders = keyList.map((_, i) => `$${i + 2}`).join(', ');
    const countSql = `
      SELECT COUNT(*)::bigint AS n
      FROM "Track"
      WHERE genre IS NOT NULL
        AND BTRIM(genre) <> ''
        AND LOWER(TRIM(genre)) IN (${placeholders})
        AND TRIM(genre) <> $1
    `;
    const params = [canonical, ...keyList];
    const rows = await prisma.$queryRawUnsafe(countSql, ...params);
    const n = rows[0]?.n ?? 0;
    if (BigInt(n) > 0n) {
      plan.push({ canonical, keys: keyList, count: n });
    }
  }

  const total = plan.reduce((acc, p) => acc + BigInt(p.count), 0n);
  console.log(
    DRY_RUN
      ? `Serait mis à jour : ${total} ligne(s) de Track.`
      : `Mise à jour prévue : ${total} ligne(s) de Track.`
  );

  for (const p of plan) {
    console.log(`  - → "${p.canonical}" : ${p.count} morceau(x)`);
  }

  if (total === 0n) {
    console.log('\nRien à normaliser.');
    return;
  }

  if (DRY_RUN) {
    console.log('\nRelance sans --dry-run pour appliquer.');
    return;
  }

  let updatedTotal = 0n;
  for (const p of plan) {
    const placeholders = p.keys.map((_, i) => `$${i + 2}`).join(', ');
    const updateSql = `
      UPDATE "Track"
      SET genre = $1, "updatedAt" = NOW()
      WHERE genre IS NOT NULL
        AND BTRIM(genre) <> ''
        AND LOWER(TRIM(genre)) IN (${placeholders})
        AND TRIM(genre) <> $1
    `;
    const params = [p.canonical, ...p.keys];
    const n = await prisma.$executeRawUnsafe(updateSql, ...params);
    updatedTotal += BigInt(n);
  }

  console.log(`\nTerminé. Lignes mises à jour (total annoncé par le driver) : ${updatedTotal}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
