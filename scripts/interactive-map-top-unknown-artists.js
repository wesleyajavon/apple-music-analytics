#!/usr/bin/env node

/**
 * N artistes les plus écoutés dont le genre résolu est encore « Unknown »
 * (Track.genre NULL et pas d’entrée dans ARTIST_TO_GENRE_MAP), puis saisie interactive
 * pour ajouter des lignes dans lib/services/genre/genre-service.ts.
 *
 * Prérequis : DATABASE_URL dans .env / .env.local
 *
 * Usage :
 *   node scripts/interactive-map-top-unknown-artists.js
 *   node scripts/interactive-map-top-unknown-artists.js --limit 200
 *   node scripts/interactive-map-top-unknown-artists.js --dry-run --limit 200
 *
 * Chaque genre validé est écrit tout de suite dans genre-service.ts (un Ctrl+C ne fait
 * pas perdre les choix déjà confirmés).
 *
 * Menu des numéros : docs/GENRE_PICK_MENU.md (régénérer avec node scripts/generate-genre-pick-menu-doc.mjs)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { PrismaClient, Prisma } = require('@prisma/client');

function getArg(argv, name) {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = argv.indexOf(`--${name}`);
  if (idx !== -1 && argv[idx + 1] != null && !argv[idx + 1].startsWith('--')) {
    return argv[idx + 1];
  }
  return undefined;
}

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
const DRY_RUN = args.includes('--dry-run');

const limitRaw = getArg(args, 'limit');
const parsedLimit = limitRaw != null ? parseInt(String(limitRaw), 10) : 10;
const TOP_LIMIT = Number.isFinite(parsedLimit) && parsedLimit >= 1
  ? Math.min(parsedLimit, 10_000)
  : 10;

const GENRE_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'lib',
  'services',
  'genre',
  'genre-service.ts'
);
const GENRE_JSON_PATH = path.join(__dirname, '..', 'lib', 'data', 'genre-normalization.json');

function loadCanonicalGenres() {
  const data = JSON.parse(fs.readFileSync(GENRE_JSON_PATH, 'utf8'));
  return (data.groups || []).map((g) => g.canonical);
}

function parseArtistMapFromGenreService(content) {
  const startMarker = 'export const ARTIST_TO_GENRE_MAP: Record<string, string> = {';
  const start = content.indexOf(startMarker);
  if (start === -1) return {};
  const blockStart = content.indexOf('{', start) + 1;
  const endMarker = '// Ajoutez plus de mappings selon vos besoins';
  const end = content.indexOf(endMarker, blockStart);
  if (end === -1) return {};
  const block = content.slice(blockStart, end);
  const map = {};
  const re = /"([^"]+)":\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

function insertMappingsIntoGenreService(filePath, newEntries) {
  let content = fs.readFileSync(filePath, 'utf8');
  const anchor = '  // Ajoutez plus de mappings selon vos besoins';
  if (!content.includes(anchor)) {
    throw new Error(`Ancre introuvable dans genre-service.ts : ${anchor}`);
  }
  const lines = newEntries
    .map(([artist, genre]) => `  ${JSON.stringify(artist)}: ${JSON.stringify(genre)},`)
    .join('\n');
  content = content.replace(anchor, `${lines}\n${anchor}`);
  fs.writeFileSync(filePath, content, 'utf8');
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function fetchTopUnknownArtists(prisma, mapEntries, limit) {
  if (mapEntries.length === 0) {
    const rows = await prisma.$queryRaw`
      SELECT a.name::text AS name, COUNT(*)::bigint AS count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE t.genre IS NULL
      GROUP BY a.name
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    }));
  }

  const valuesParts = mapEntries.map(([artist, genre]) =>
    Prisma.sql`(${artist}, ${genre})`
  );

  const rows = await prisma.$queryRaw`
    SELECT a.name::text AS name, COUNT(*)::bigint AS count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    LEFT JOIN (
      VALUES ${Prisma.join(valuesParts)}
    ) AS genre_map(artist_name, genre) ON a.name = genre_map.artist_name
    WHERE COALESCE(t.genre, genre_map.genre, 'Unknown') = 'Unknown'
    GROUP BY a.name
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    name: r.name,
    count: Number(r.count),
  }));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL est requis.');
    process.exit(1);
  }

  const canonicals = loadCanonicalGenres();
  if (canonicals.length === 0) {
    console.error('Aucun genre canonique dans genre-normalization.json');
    process.exit(1);
  }

  const genreServiceContent = fs.readFileSync(GENRE_SERVICE_PATH, 'utf8');
  const existingMap = parseArtistMapFromGenreService(genreServiceContent);
  const mapEntries = Object.entries(existingMap);

  const prisma = new PrismaClient();
  try {
    const artists = await fetchTopUnknownArtists(prisma, mapEntries, TOP_LIMIT);

    if (artists.length === 0) {
      console.log(
        'Aucun artiste « Unknown » trouvé (ou moins de 1 écoute). Rien à faire.'
      );
      return;
    }

    console.log(`\n(Limite : ${TOP_LIMIT} artiste(s) les plus écoutés en Unknown)\n`);

    console.log('\n── Genres (numéro → libellé canonique) — voir aussi docs/GENRE_PICK_MENU.md ──\n');
    canonicals.forEach((g, i) => {
      console.log(`  ${String(i + 1).padStart(2, ' ')}  ${g}`);
    });
    console.log('\n  0  ignorer cet artiste\n');

    console.log(
      `── Top ${artists.length} artiste(s) encore Unknown (par nombre d’écoutes) ──\n`
    );
    artists.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.name}  —  ${a.count.toLocaleString('fr-FR')} écoutes`);
    });
    console.log('');

    if (DRY_RUN) {
      console.log('Mode --dry-run : aucune modification de fichier.');
      return;
    }

    console.log(
      'Chaque genre choisi est enregistré immédiatement dans genre-service.ts (interruption = pas de perte des choix déjà validés).\n'
    );

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let persistedCount = 0;

    const onSigInt = () => {
      console.log(
        '\n\nInterruption (Ctrl+C) : les mappings déjà validés sont enregistrés dans ' +
          path.relative(process.cwd(), GENRE_SERVICE_PATH) +
          '.'
      );
      process.removeListener('SIGINT', onSigInt);
      rl.close();
      prisma.$disconnect().finally(() => process.exit(130));
    };
    process.once('SIGINT', onSigInt);

    try {
      for (const artist of artists) {
        if (existingMap[artist.name] != null) {
          console.log(`(Déjà mappé : ${artist.name} → ${existingMap[artist.name]}, ignoré.)`);
          continue;
        }

        let genre = null;
        for (;;) {
          const raw = (
            await ask(
              rl,
              `Genre pour « ${artist.name} » [1-${canonicals.length}, 0=skip] : `
            )
          ).trim();

          if (raw === '' || raw === '0') {
            console.log('  → ignoré.\n');
            break;
          }

          const n = parseInt(raw, 10);
          if (Number.isNaN(n) || n < 1 || n > canonicals.length) {
            console.log(
              `  Entrée invalide : entrez un entier entre 1 et ${canonicals.length}, ou 0 pour ignorer.`
            );
            continue;
          }

          genre = canonicals[n - 1];
          insertMappingsIntoGenreService(GENRE_SERVICE_PATH, [[artist.name, genre]]);
          existingMap[artist.name] = genre;
          persistedCount += 1;
          console.log(`  → ${JSON.stringify(genre)}\n`);
          break;
        }
      }
    } finally {
      process.removeListener('SIGINT', onSigInt);
      rl.close();
    }

    if (persistedCount === 0) {
      console.log('Aucun mapping ajouté.');
      return;
    }

    console.log(
      `\n${persistedCount} mapping(s) enregistré(s) dans ${path.relative(process.cwd(), GENRE_SERVICE_PATH)} (écriture au fil de l’eau).`
    );
    console.log(
      'Pensez à lancer : npx eslint lib/services/genre/genre-service.ts --fix  (si besoin)\n'
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
