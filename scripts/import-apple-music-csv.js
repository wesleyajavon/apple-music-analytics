#!/usr/bin/env node

/**
 * Importe les données Apple Music depuis le fichier CSV filtré vers la base de données.
 *
 * Crée les enregistrements Artist, Track et Listen manquants. Les écoutes sont
 * enregistrées avec source "lastfm" pour cohérence avec le reste de l'application.
 *
 * Voir docs/APPLE_MUSIC_CSV_IMPORT.md pour la documentation complète.
 *
 * Usage:
 *   node scripts/import-apple-music-csv.js --userId "user_xxx"
 *   node scripts/import-apple-music-csv.js --userId "user_xxx" --input "apple-music-play-history-backfill.csv"
 *   node scripts/import-apple-music-csv.js --userId "user_xxx" --only-empty-days
 *   node scripts/import-apple-music-csv.js --userId "user_xxx" --resilient
 *   node scripts/import-apple-music-csv.js --userId "user_xxx" --dry-run
 *
 *   --resilient : traite un enregistrement à la fois sans transaction (plus lent,
 *                 mais évite "Server has closed the connection" avec Neon).
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

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

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non trouvée. Vérifiez .env.local");
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// --- CSV column indices (0-based) ---
const COUNTRY_INDEX = 0;
const DATE_PLAYED_INDEX = 3;
const HOURS_INDEX = 4;
const PLAY_COUNT_INDEX = 8;
const TRACK_DESCRIPTION_INDEX = 12;

const DEFAULT_INPUT = path.join(
  __dirname,
  "..",
  "apple-music-play-history-filtered.csv"
);

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    input: DEFAULT_INPUT,
    userId: null,
    dryRun: false,
    onlyEmptyDays: false,
    resilient: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) config.input = args[++i];
    else if (args[i] === "--userId" && args[i + 1]) config.userId = args[++i];
    else if (args[i] === "--dry-run") config.dryRun = true;
    else if (args[i] === "--only-empty-days") config.onlyEmptyDays = true;
    else if (args[i] === "--resilient") config.resilient = true;
  }

  return config;
}

/**
 * Parse une ligne CSV en gérant les champs entre guillemets.
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse "Artist name - Track name" en { artistName, trackName }.
 * Split sur le premier " - " uniquement.
 */
function parseTrackDescription(description) {
  if (!description || typeof description !== "string") {
    return { artistName: null, trackName: null };
  }
  const sep = " - ";
  const idx = description.indexOf(sep);
  if (idx === -1) {
    return { artistName: description.trim(), trackName: "" };
  }
  return {
    artistName: description.slice(0, idx).trim(),
    trackName: description.slice(idx + sep.length).trim(),
  };
}

/**
 * Parse la colonne Hours : "22" ou "3, 19, 20" -> [22] ou [3, 19, 20]
 */
function parseHours(hoursStr) {
  if (!hoursStr) return [];
  return hoursStr
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 23);
}

/**
 * Génère un playedAt à partir de Date Played (YYYYMMDD) et une heure.
 * Minutes, secondes et millisecondes aléatoires pour compléter les données
 * manquantes et réduire le risque de doublons.
 */
function buildPlayedAt(dateStr, hour) {
  if (!dateStr || dateStr.length !== 8) return null;
  const y = parseInt(dateStr.slice(0, 4), 10);
  const m = parseInt(dateStr.slice(4, 6), 10) - 1;
  const d = parseInt(dateStr.slice(6, 8), 10);
  const min = Math.floor(Math.random() * 60);
  const sec = Math.floor(Math.random() * 60);
  const ms = Math.floor(Math.random() * 1000);
  return new Date(y, m, d, hour, min, sec, ms);
}

/**
 * Convertit une Date en clé YYYYMMDD.
 */
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Retourne l'ensemble des dates (YYYYMMDD) ayant au moins une écoute pour l'utilisateur.
 */
async function getDatesWithListens(userId) {
  const listens = await prisma.listen.findMany({
    where: { userId },
    select: { playedAt: true },
  });
  return new Set(listens.map((l) => toDateKey(l.playedAt)));
}

/**
 * Lit le CSV et produit des enregistrements { artistName, trackName, playedAt } à importer.
 */
async function* readCSVRecords(inputPath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === 1) continue; // skip header

    const fields = parseCSVLine(line);
    const datePlayed = fields[DATE_PLAYED_INDEX];
    const hoursStr = fields[HOURS_INDEX];
    const playCount = parseInt(fields[PLAY_COUNT_INDEX], 10) || 1;
    const description = fields[TRACK_DESCRIPTION_INDEX];

    const { artistName, trackName } = parseTrackDescription(description);
    if (!artistName || !trackName) continue;

    const hours = parseHours(hoursStr);
    if (hours.length === 0) continue;

    for (let i = 0; i < playCount; i++) {
      const hour = hours[i % hours.length];
      const playedAt = buildPlayedAt(datePlayed, hour);
      if (playedAt) {
        yield { artistName, trackName, playedAt };
      }
    }
  }
}

/**
 * Trouve ou crée l'artiste (recherche insensible à la casse via nameLower).
 */
async function findOrCreateArtist(tx, artistName) {
  const nameLower = artistName.toLowerCase();
  return tx.artist.upsert({
    where: { nameLower },
    update: { name: artistName },
    create: { name: artistName, nameLower },
  });
}

/**
 * Trouve ou crée la piste (vérifie l'existence avant de créer).
 * Utilise titleLower pour une recherche insensible à la casse.
 */
async function findOrCreateTrack(tx, artistId, trackName) {
  const titleLower = trackName.toLowerCase();
  const existing = await tx.track.findFirst({
    where: {
      artistId,
      titleLower,
    },
  });
  if (existing) return existing;

  return tx.track.create({
    data: {
      title: trackName,
      titleLower,
      artistId,
    },
  });
}


async function runImport(config) {
  const { input, userId, dryRun, onlyEmptyDays, resilient } = config;

  if (!fs.existsSync(input)) {
    console.error(`❌ Fichier introuvable: ${input}`);
    process.exit(1);
  }

  if (!userId) {
    console.error("❌ --userId est requis");
    console.error("   Ex: node scripts/import-apple-music-csv.js --userId \"user_xxx\"");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    console.error(`❌ Utilisateur non trouvé: ${userId}`);
    process.exit(1);
  }

  let datesWithListens = null;
  if (onlyEmptyDays) {
    console.log("   Chargement des dates déjà remplies en DB...");
    datesWithListens = await getDatesWithListens(userId);
    console.log(`   ${datesWithListens.size} dates avec au moins une écoute\n`);
  }

  console.log(dryRun ? "🔍 Mode DRY-RUN\n" : "🚀 Import Apple Music CSV\n");
  console.log(`   User ID: ${userId}`);
  console.log(`   Fichier: ${input}`);
  console.log(`   Source Listen: lastfm`);
  if (onlyEmptyDays) console.log(`   Mode: uniquement les jours vides`);
  if (resilient) console.log(`   Mode: resilient (sans transaction, plus lent mais robuste)`);
  console.log("");

  let imported = 0;
  let skipped = 0;
  let skippedFilledDays = 0;
  let errors = [];
  const BATCH_SIZE = 30;
  const TX_TIMEOUT_MS = 60000;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;
  let batch = [];

  function isConnectionError(err) {
    const msg = (err?.message || String(err)).toLowerCase();
    return /connection|closed|timeout|ECONNRESET|ETIMEDOUT/i.test(msg);
  }

  async function runBatchTransaction(b) {
    return prisma.$transaction(
      async (tx) => {
        let batchImported = 0;
        let batchSkipped = 0;

        for (const { artistName, trackName, playedAt } of b) {
          try {
            const artist = await findOrCreateArtist(tx, artistName);
            const track = await findOrCreateTrack(tx, artist.id, trackName);

            const existingListen = await tx.listen.findFirst({
              where: {
                userId,
                trackId: track.id,
                playedAt,
                source: "lastfm",
              },
            });

            if (existingListen) {
              batchSkipped++;
              continue;
            }

            await tx.listen.create({
              data: {
                userId,
                trackId: track.id,
                playedAt,
                source: "lastfm",
              },
            });
            batchImported++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`${artistName} - ${trackName}: ${msg}`);
          }
        }

        return { batchImported, batchSkipped };
      },
      { maxWait: TX_TIMEOUT_MS, timeout: TX_TIMEOUT_MS }
    );
  }

  for await (const record of readCSVRecords(input)) {
    if (onlyEmptyDays && datesWithListens?.has(toDateKey(record.playedAt))) {
      skippedFilledDays++;
      continue;
    }

    if (resilient) {
      if (dryRun) {
        imported++;
        continue;
      }
      try {
        const artist = await findOrCreateArtist(prisma, record.artistName);
        const track = await findOrCreateTrack(prisma, artist.id, record.trackName);
        const existingListen = await prisma.listen.findFirst({
          where: {
            userId,
            trackId: track.id,
            playedAt: record.playedAt,
            source: "lastfm",
          },
        });
        if (existingListen) {
          skipped++;
        } else {
          await prisma.listen.create({
            data: {
              userId,
              trackId: track.id,
              playedAt: record.playedAt,
              source: "lastfm",
            },
          });
          imported++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${record.artistName} - ${record.trackName}: ${msg}`);
      }
      const skipMsg = onlyEmptyDays ? `, ${skippedFilledDays} jour(s) déjà remplis` : "";
      process.stdout.write(`\r   Traité: ${imported} importés, ${skipped} ignorés${skipMsg}`);
      continue;
    }

    batch.push(record);
    if (batch.length < BATCH_SIZE) continue;

    if (dryRun) {
      imported += batch.length;
      batch = [];
      continue;
    }

    if (dryRun) {
      imported += batch.length;
      batch = [];
      continue;
    }

    let retries = 0;
    let done = false;

    while (!done) {
      try {
        const result = await runBatchTransaction(batch);
        imported += result.batchImported;
        skipped += result.batchSkipped;
        done = true;
      } catch (err) {
        if (isConnectionError(err) && retries < MAX_RETRIES) {
          retries++;
          console.error(
            `\n   ⚠️  Connexion perdue, retry ${retries}/${MAX_RETRIES} dans ${RETRY_DELAY_MS / 1000}s...`
          );
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          await prisma.$disconnect();
          await prisma.$connect();
        } else {
          console.error("Erreur batch:", err?.message || err);
          errors.push(`Batch: ${err?.message || err}`);
          done = true;
        }
      }
    }

    batch = [];
    const skipMsg = onlyEmptyDays
      ? `, ${skippedFilledDays} jour(s) déjà remplis`
      : "";
    process.stdout.write(`\r   Traité: ${imported} importés, ${skipped} ignorés${skipMsg}`);
  }

  // Dernier batch
  if (batch.length > 0 && !dryRun) {
    let retries = 0;
    let done = false;

    while (!done) {
      try {
        const result = await runBatchTransaction(batch);
        imported += result.batchImported;
        skipped += result.batchSkipped;
        done = true;
      } catch (err) {
        if (isConnectionError(err) && retries < MAX_RETRIES) {
          retries++;
          console.error(
            `\n   ⚠️  Connexion perdue (dernier batch), retry ${retries}/${MAX_RETRIES}...`
          );
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          await prisma.$disconnect();
          await prisma.$connect();
        } else {
          errors.push(`Dernier batch: ${err?.message || err}`);
          done = true;
        }
      }
    }
  }

  if (dryRun) {
    console.log(`\n   (DRY-RUN) ${imported} écoutes seraient importées`);
    return;
  }

  console.log(`\n\n✅ Import terminé`);
  console.log(`   Importées: ${imported}`);
  console.log(`   Ignorées (doublons): ${skipped}`);
  if (onlyEmptyDays && skippedFilledDays > 0) {
    console.log(`   Ignorées (jour déjà rempli): ${skippedFilledDays}`);
  }
  if (errors.length > 0) {
    console.log(`   Erreurs: ${errors.length}`);
    errors.slice(0, 10).forEach((e) => console.error(`     - ${e}`));
    if (errors.length > 10) {
      console.error(`     ... et ${errors.length - 10} autres`);
    }
  }
}

const config = parseArgs();
runImport(config)
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
