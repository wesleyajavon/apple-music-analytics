#!/usr/bin/env node

/**
 * Filtre le CSV Apple Music Play History Daily Tracks par plage de dates.
 *
 * Usage:
 *   node scripts/filter-apple-music-play-history.js
 *   node scripts/filter-apple-music-play-history.js --input "/chemin/vers/fichier.csv"
 *   node scripts/filter-apple-music-play-history.js --start "2025-12-21" --end "2026-03-04"
 *   node scripts/filter-apple-music-play-history.js --start-from-db --end-from-csv --userId "xxx"
 *   node scripts/filter-apple-music-play-history.js --start-from-csv --end-from-db --userId "xxx"
 *
 * Plage par défaut: 21 février 2026 au 4 mars 2026 (inclus)
 * --start-from-db : date de la 1re écoute en DB (nécessite --userId)
 * --end-from-csv  : date max du fichier CSV
 * --start-from-csv: date min du fichier CSV (1re ligne de données)
 * --end-from-db   : date de la 1re écoute en DB (nécessite --userId)
 * --dry-run       : affiche la plage et le nombre de lignes sans écrire le fichier
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Dates au format YYYYMMDD (format Apple dans le CSV)
const DEFAULT_START_DATE = "20260221"; // 21 février 2026
const DEFAULT_END_DATE = "20260304"; // 4 mars 2026

// Chemin par défaut vers le fichier Apple Music
const DEFAULT_INPUT = path.join(
  process.env.HOME || "",
  "Downloads",
  "Informations sur les services multimédia Apple Lot 1 sur 2",
  "Apple_Media_Services",
  "Apple Music Activity",
  "Apple Music - Play History Daily Tracks.csv"
);

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
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key.trim()]) process.env[key.trim()] = value;
        }
      }
    });
  }
}

function parseArgs() {
  loadEnvFile();
  const args = process.argv.slice(2);
  const config = {
    input: DEFAULT_INPUT,
    output: null,
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
    startFromDb: false,
    endFromCsv: false,
    startFromCsv: false,
    endFromDb: false,
    dryRun: false,
    userId: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) config.input = args[++i];
    else if (args[i] === "--output" && args[i + 1]) config.output = args[++i];
    else if (args[i] === "--start" && args[i + 1])
      config.startDate = args[++i].replace(/-/g, "");
    else if (args[i] === "--end" && args[i + 1])
      config.endDate = args[++i].replace(/-/g, "");
    else if (args[i] === "--start-from-db") config.startFromDb = true;
    else if (args[i] === "--end-from-csv") config.endFromCsv = true;
    else if (args[i] === "--start-from-csv") config.startFromCsv = true;
    else if (args[i] === "--end-from-db") config.endFromDb = true;
    else if (args[i] === "--dry-run") config.dryRun = true;
    else if (args[i] === "--userId" && args[i + 1]) config.userId = args[++i];
  }

  // Output par défaut: racine du projet
  if (!config.output) {
    const projectRoot = path.join(__dirname, "..");
    let baseName = "apple-music-play-history-filtered.csv";
    if (config.startFromCsv && config.endFromDb)
      baseName = "apple-music-play-history-backfill-historical.csv";
    else if (config.startFromDb && config.endFromCsv)
      baseName = "apple-music-play-history-backfill.csv";
    config.output = path.join(projectRoot, baseName);
  }

  return config;
}

/**
 * Parse une ligne CSV en gérant les champs entre guillemets (virgules à l'intérieur).
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
 * Index de la colonne "Date Played" dans le CSV (0-based).
 */
const DATE_PLAYED_INDEX = 3;

/**
 * Récupère la date la plus ancienne des Listens en DB pour l'utilisateur.
 * @returns {Promise<string>} YYYYMMDD
 */
async function getEarliestListenDateFromDb(userId) {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const row = await prisma.listen.findFirst({
    where: { userId },
    orderBy: { playedAt: "asc" },
    select: { playedAt: true },
  });
  await prisma.$disconnect();
  if (!row) return null;
  const d = row.playedAt;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Scanne le CSV pour trouver la date minimale (Date Played).
 * @returns {Promise<string>} YYYYMMDD
 */
async function getMinDateFromCsv(inputPath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });
  let minDate = "99999999";
  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === 1) continue;
    const fields = parseCSVLine(line);
    const d = fields[DATE_PLAYED_INDEX];
    if (d && d.length === 8 && d < minDate) minDate = d;
  }
  return minDate === "99999999" ? null : minDate;
}

/**
 * Scanne le CSV pour trouver la date maximale (Date Played).
 * @returns {Promise<string>} YYYYMMDD
 */
async function getMaxDateFromCsv(inputPath) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputPath),
    crlfDelay: Infinity,
  });
  let maxDate = "00000000";
  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === 1) continue;
    const fields = parseCSVLine(line);
    const d = fields[DATE_PLAYED_INDEX];
    if (d && d.length === 8 && d > maxDate) maxDate = d;
  }
  return maxDate === "00000000" ? null : maxDate;
}

async function filterPlayHistory(config) {
  let {
    input,
    output,
    startDate,
    endDate,
    startFromDb,
    endFromCsv,
    startFromCsv,
    endFromDb,
    dryRun,
    userId,
  } = config;

  if (startFromDb) {
    if (!userId) {
      console.error("❌ --start-from-db requiert --userId");
      process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL manquante pour --start-from-db");
      process.exit(1);
    }
    const dbStart = await getEarliestListenDateFromDb(userId);
    if (!dbStart) {
      console.error("❌ Aucune écoute trouvée en DB pour cet utilisateur");
      process.exit(1);
    }
    startDate = dbStart;
    console.log(`   Date début (DB): ${startDate}`);
  }

  if (endFromCsv) {
    const csvEnd = await getMaxDateFromCsv(input);
    if (!csvEnd) {
      console.error("❌ Aucune date valide trouvée dans le CSV");
      process.exit(1);
    }
    endDate = csvEnd;
    console.log(`   Date fin (CSV): ${endDate}`);
  }

  if (startFromCsv) {
    const csvStart = await getMinDateFromCsv(input);
    if (!csvStart) {
      console.error("❌ Aucune date valide trouvée dans le CSV");
      process.exit(1);
    }
    startDate = csvStart;
    console.log(`   Date début (CSV): ${startDate}`);
  }

  if (endFromDb) {
    if (!userId) {
      console.error("❌ --end-from-db requiert --userId");
      process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL manquante pour --end-from-db");
      process.exit(1);
    }
    const dbEnd = await getEarliestListenDateFromDb(userId);
    if (!dbEnd) {
      console.error("❌ Aucune écoute trouvée en DB pour cet utilisateur");
      process.exit(1);
    }
    endDate = dbEnd;
    console.log(`   Date fin (DB): ${endDate}`);
  }

  if (!fs.existsSync(input)) {
    console.error(`Fichier introuvable: ${input}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log("🔍 Mode DRY-RUN : aucun fichier ne sera écrit\n");
  }

  const writeStream = dryRun ? null : fs.createWriteStream(output, { flags: "w" });
  const rl = readline.createInterface({
    input: fs.createReadStream(input),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let headerLine = null;
  let keptCount = 0;
  let skippedCount = 0;

  for await (const line of rl) {
    lineNumber++;
    if (lineNumber === 1) {
      headerLine = line;
      if (writeStream) writeStream.write(line + "\n");
      continue;
    }

    const fields = parseCSVLine(line);
    const datePlayed = fields[DATE_PLAYED_INDEX];

    if (!datePlayed || datePlayed.length !== 8) {
      skippedCount++;
      continue;
    }

    const dateNum = datePlayed;
    if (dateNum >= startDate && dateNum <= endDate) {
      if (writeStream) writeStream.write(line + "\n");
      keptCount++;
    } else {
      skippedCount++;
    }
  }

  if (writeStream) {
    writeStream.end();
    await new Promise((resolve) => writeStream.on("finish", resolve));
  }

  console.log(`Filtrage terminé.`);
  console.log(`  Plage: ${startDate} → ${endDate}`);
  console.log(`  Lignes conservées: ${keptCount}`);
  console.log(`  Lignes ignorées:   ${skippedCount}`);
  if (!dryRun) {
    console.log(`  Fichier de sortie: ${output}`);
  } else {
    console.log(`  (DRY-RUN) Fichier qui serait créé: ${output}`);
  }
}

const config = parseArgs();
filterPlayHistory(config).catch((err) => {
  console.error(err);
  process.exit(1);
});
