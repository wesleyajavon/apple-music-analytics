#!/usr/bin/env node

/**
 * Deux modes :
 *
 * 1) Artistes (défaut)
 *    N artistes les plus écoutés dont le genre résolu est encore « Unknown »
 *    (Track.genre NULL et pas d’entrée dans ARTIST_TO_GENRE_MAP), puis saisie interactive
 *    pour ajouter des lignes dans lib/services/genre/genre-service.ts.
 *
 * 2) Morceaux (--tracks)
 *    Morceaux sans genre (Track.genre NULL) ayant au moins une écoute dans une plage de dates,
 *    par lots (défaut 10) ; chaque choix met à jour Track.genre en base (libellés canoniques
 *    depuis docs/GENRE_PICK_MENU.md (table « # » → genre), mêmes numéros que le mode artistes).
 *
 * Prérequis : DATABASE_URL dans .env / .env.local
 *
 * Usage :
 *   node scripts/interactive-map-top-unknown-artists.js
 *   node scripts/interactive-map-top-unknown-artists.js --limit 200
 *   node scripts/interactive-map-top-unknown-artists.js --user-id=<uuid> --start-date=2025-02-01
 *   node scripts/interactive-map-top-unknown-artists.js --dry-run --limit 200
 *
 *   node scripts/interactive-map-top-unknown-artists.js --tracks
 *   node scripts/interactive-map-top-unknown-artists.js --tracks --batch-size 10
 *   node scripts/interactive-map-top-unknown-artists.js --tracks --start-date=2026-03-01
 *   node scripts/interactive-map-top-unknown-artists.js --tracks --user-id=<uuid> --start-date=2025-02-01 --end-date=2026-04-15
 *   node scripts/interactive-map-top-unknown-artists.js --tracks --dry-run
 *
 * Chaque genre validé est écrit tout de suite (fichier genre-service en mode artiste,
 * base en mode --tracks) ; Ctrl+C ne fait pas perdre les choix déjà confirmés.
 *
 * Menu des numéros : le script lit la table dans docs/GENRE_PICK_MENU.md (régénérer depuis le JSON avec
 * node scripts/generate-genre-pick-menu-doc.mjs après un changement de normalisation).
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
const TRACKS_MODE = args.includes('--tracks');

const limitRaw = getArg(args, 'limit');
const parsedLimit = limitRaw != null ? parseInt(String(limitRaw), 10) : 10;
const TOP_LIMIT = Number.isFinite(parsedLimit) && parsedLimit >= 1
  ? Math.min(parsedLimit, 10_000)
  : 10;

const batchRaw = getArg(args, 'batch-size');
const parsedBatch = batchRaw != null ? parseInt(String(batchRaw), 10) : 10;
const TRACK_BATCH_SIZE = Number.isFinite(parsedBatch) && parsedBatch >= 1
  ? Math.min(parsedBatch, 500)
  : 10;

function defaultStartOfMarchUtc() {
  const y = new Date().getUTCFullYear();
  return new Date(Date.UTC(y, 2, 1, 0, 0, 0, 0));
}

function parseDateRange(defaultStartDateFactory) {
  const startDateRaw = getArg(args, 'start-date');
  const startDate = startDateRaw
    ? new Date(`${String(startDateRaw).trim()}T00:00:00.000Z`)
    : defaultStartDateFactory();

  const endDateRaw = getArg(args, 'end-date');
  const endDate = endDateRaw
    ? new Date(`${String(endDateRaw).trim()}T23:59:59.999Z`)
    : new Date();

  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Date de début invalide (--start-date=YYYY-MM-DD).');
  }
  if (Number.isNaN(endDate.getTime())) {
    throw new Error('Date de fin invalide (--end-date=YYYY-MM-DD).');
  }

  return { startDateRaw, startDate, endDateRaw, endDate };
}

function buildPeriodLabel(startDate, endDateRaw, endDate) {
  return endDateRaw
    ? `${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`
    : `${startDate.toISOString().slice(0, 10)} → maintenant`;
}

const USER_ID = getArg(args, 'user-id');

const GENRE_SERVICE_PATH = path.join(
  __dirname,
  '..',
  'lib',
  'services',
  'genre',
  'genre-service.ts'
);
const GENRE_PICK_MENU_PATH = path.join(__dirname, '..', 'docs', 'GENRE_PICK_MENU.md');

/**
 * Lit la table « | # | Genre | » dans GENRE_PICK_MENU.md (ordre = numéros de saisie interactifs).
 * Les `|` échappés dans une cellule (`\|`) sont restaurés dans le libellé.
 */
function loadCanonicalGenres() {
  if (!fs.existsSync(GENRE_PICK_MENU_PATH)) {
    throw new Error(
      `Fichier introuvable : ${GENRE_PICK_MENU_PATH}\n` +
        'Générez-le avec : node scripts/generate-genre-pick-menu-doc.mjs'
    );
  }
  const content = fs.readFileSync(GENRE_PICK_MENU_PATH, 'utf8');
  const rows = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const inner = trimmed.slice(1, -1);
    const firstPipe = inner.indexOf('|');
    if (firstPipe === -1) continue;
    const numPart = inner.slice(0, firstPipe).trim();
    const genrePart = inner.slice(firstPipe + 1).trim();
    if (numPart === '#' || numPart === '---') continue;
    const n = parseInt(numPart, 10);
    if (!Number.isFinite(n) || n < 1) continue;
    const genre = genrePart.replace(/\\\|/g, '|');
    rows.push({ n, genre });
  }
  rows.sort((a, b) => a.n - b.n);
  if (rows.length === 0) {
    throw new Error(
      `Aucune ligne de table valide dans ${GENRE_PICK_MENU_PATH} (section « ## Table » attendue).`
    );
  }
  const canonicals = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].n !== i + 1) {
      throw new Error(
        `Numéros non consécutifs dans GENRE_PICK_MENU.md : attendu ${i + 1}, trouvé ${rows[i].n}.`
      );
    }
    canonicals.push(rows[i].genre);
  }
  return canonicals;
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

async function fetchTopUnknownArtists(prisma, mapEntries, limit, userId, startDate, endDate) {
  const userSql = userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.empty;
  const startSql = startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.empty;
  const endSql = endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.empty;

  if (mapEntries.length === 0) {
    const rows = await prisma.$queryRaw`
      SELECT a.name::text AS name, COUNT(*)::bigint AS count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE t.genre IS NULL
        ${userSql}
        ${startSql}
        ${endSql}
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
      ${userSql}
      ${startSql}
      ${endSql}
    GROUP BY a.name
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    name: r.name,
    count: Number(r.count),
  }));
}

/**
 * Morceaux distincts sans genre, avec au moins une écoute dans [startDate, endDate],
 * triés par nombre d’écoutes dans la période (décroissant). Toujours LIMIT sans OFFSET :
 * après mise à jour du genre, le morceau sort du jeu.
 */
async function fetchTracksBatchWithoutGenreInPeriod(
  prisma,
  userId,
  startDate,
  endDate,
  batchSize,
  excludeIds
) {
  const ids = excludeIds && excludeIds.size > 0 ? Array.from(excludeIds) : [];
  const excludeSql =
    ids.length === 0
      ? Prisma.empty
      : Prisma.sql`AND t.id NOT IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}`))})`;

  const rows = await prisma.$queryRaw`
    SELECT
      t.id AS id,
      t.title AS title,
      a.name::text AS artist,
      COUNT(*)::bigint AS listens
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE t.genre IS NULL
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.empty}
      AND l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      ${excludeSql}
    GROUP BY t.id, t.title, a.name
    ORDER BY listens DESC, t.title ASC
    LIMIT ${batchSize}
  `;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    listens: Number(r.listens),
  }));
}

async function mainTracks() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL est requis.');
    process.exit(1);
  }

  let startDateRaw;
  let startDate;
  let endDateRaw;
  let endDate;
  try {
    ({ startDateRaw, startDate, endDateRaw, endDate } = parseDateRange(defaultStartOfMarchUtc));
  } catch (e) {
    console.error(e.message || String(e));
    process.exit(1);
  }

  const canonicals = loadCanonicalGenres();
  if (canonicals.length === 0) {
    console.error('Aucun genre valide dans docs/GENRE_PICK_MENU.md (table vide ?).');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const periodLabel = buildPeriodLabel(startDate, endDateRaw, endDate);
    const userScopeLabel = USER_ID ? `Utilisateur: ${USER_ID}` : 'Tous utilisateurs';
    console.log(
      `\nMode --tracks : morceaux sans genre, écoutes dans la période ${periodLabel}\n` +
        `${userScopeLabel}\n` +
        `(lots de ${TRACK_BATCH_SIZE}, tri par nombre d’écoutes dans la période).\n`
    );

    if (DRY_RUN) {
      console.log('Mode --dry-run : aucune mise à jour en base.\n');
    }

    console.log('\n── Genres (numéro → libellé canonique) — voir aussi docs/GENRE_PICK_MENU.md ──\n');
    canonicals.forEach((g, i) => {
      console.log(`  ${String(i + 1).padStart(2, ' ')}  ${g}`);
    });
    console.log('\n  0  ignorer ce morceau\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let persistedCount = 0;
    /** Morceaux déjà traités dans cette session (y compris ignorés), pour ne pas boucler. */
    const excludeIds = new Set();

    const onSigInt = () => {
      console.log(
        '\n\nInterruption (Ctrl+C) : les genres déjà enregistrés sur les morceaux le restent en base.'
      );
      process.removeListener('SIGINT', onSigInt);
      rl.close();
      prisma.$disconnect().finally(() => process.exit(130));
    };
    if (!DRY_RUN) {
      process.once('SIGINT', onSigInt);
    }

    try {
      for (;;) {
        const nowEnd = endDateRaw ? endDate : new Date();
        const batch = await fetchTracksBatchWithoutGenreInPeriod(
          prisma,
          USER_ID,
          startDate,
          nowEnd,
          TRACK_BATCH_SIZE,
          excludeIds
        );

        if (batch.length === 0) {
          if (persistedCount === 0 && excludeIds.size === 0) {
            console.log(
              'Aucun morceau sans genre avec écoute dans cette période. Rien à faire.'
            );
          }
          break;
        }

        console.log(
          `\n── Lot suivant (${batch.length} morceau(x)) — ${periodLabel} ──\n`
        );
        batch.forEach((tr, i) => {
          console.log(
            `  ${i + 1}. « ${tr.title} » — ${tr.artist}  (${tr.listens.toLocaleString('fr-FR')} écoutes dans la période)`
          );
        });
        console.log('');

        for (const tr of batch) {
          for (;;) {
            const raw = (
              await ask(
                rl,
                `Genre pour « ${tr.title} » (${tr.artist}) [1-${canonicals.length}, 0=skip] : `
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

            const genre = canonicals[n - 1];
            if (DRY_RUN) {
              console.log(`  (dry-run) serait : ${JSON.stringify(genre)}\n`);
            } else {
              await prisma.track.update({
                where: { id: tr.id },
                data: { genre },
              });
              persistedCount += 1;
              console.log(`  → ${JSON.stringify(genre)}\n`);
            }
            break;
          }
          excludeIds.add(tr.id);
        }
      }
    } finally {
      if (!DRY_RUN) {
        process.removeListener('SIGINT', onSigInt);
      }
      rl.close();
    }

    if (!DRY_RUN && persistedCount > 0) {
      console.log(`\n${persistedCount} morceau(x) mis à jour (Track.genre).`);
    } else if (!DRY_RUN && persistedCount === 0) {
      console.log('\nAucune mise à jour.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function mainArtists() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL est requis.');
    process.exit(1);
  }

  let startDate;
  let endDateRaw;
  let endDate;
  try {
    ({ startDate, endDateRaw, endDate } = parseDateRange(defaultStartOfMarchUtc));
  } catch (e) {
    console.error(e.message || String(e));
    process.exit(1);
  }

  const canonicals = loadCanonicalGenres();
  if (canonicals.length === 0) {
    console.error('Aucun genre valide dans docs/GENRE_PICK_MENU.md (table vide ?).');
    process.exit(1);
  }

  const genreServiceContent = fs.readFileSync(GENRE_SERVICE_PATH, 'utf8');
  const existingMap = parseArtistMapFromGenreService(genreServiceContent);
  const mapEntries = Object.entries(existingMap);

  const prisma = new PrismaClient();
  try {
    const artists = await fetchTopUnknownArtists(
      prisma,
      mapEntries,
      TOP_LIMIT,
      USER_ID,
      startDate,
      endDate
    );

    if (artists.length === 0) {
      console.log(
        'Aucun artiste « Unknown » trouvé (ou moins de 1 écoute). Rien à faire.'
      );
      return;
    }

    const periodLabel = buildPeriodLabel(startDate, endDateRaw, endDate);
    const userScopeLabel = USER_ID ? `Utilisateur: ${USER_ID}` : 'Tous utilisateurs';

    console.log(`\nPériode : ${periodLabel}`);
    console.log(`${userScopeLabel}`);
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

async function main() {
  if (TRACKS_MODE) {
    await mainTracks();
  } else {
    await mainArtists();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
