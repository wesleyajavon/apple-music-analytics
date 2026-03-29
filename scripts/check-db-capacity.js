#!/usr/bin/env node

/**
 * Vérifie si la base de données peut accueillir un import massif.
 * Affiche l'utilisation actuelle et une estimation pour l'import prévu.
 *
 * Usage:
 *   node scripts/check-db-capacity.js
 *   node scripts/check-db-capacity.js --listens 272250
 */

const fs = require("fs");
const path = require("path");

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

loadEnvFile();

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL non trouvée. Vérifiez .env.local");
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  let listens = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--listens" && args[i + 1]) {
      listens = parseInt(args[++i], 10);
    }
  }
  return { listens };
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}

/**
 * Estimation approximative de l'espace pour N écoutes.
 * - Listen: ~120 bytes/row + index
 * - Track: ~200 bytes/row (beaucoup seront réutilisés)
 * - Artist: ~150 bytes/row (beaucoup seront réutilisés)
 * Pour 272k listens, environ 30-50k tracks/artists uniques.
 * Avec index et overhead PostgreSQL: ~2-3x les données brutes.
 */
function estimateStorageForListens(count) {
  const bytesPerListen = 150; // Listen row + index overhead
  const uniqueTracksRatio = 0.25; // ~25% de tracks uniques
  const bytesPerTrack = 220;
  const bytesPerArtist = 160;
  const uniqueArtistsRatio = 0.15;
  const pgOverhead = 2.5;

  const listenBytes = count * bytesPerListen;
  const trackBytes = count * uniqueTracksRatio * bytesPerTrack;
  const artistBytes = count * uniqueArtistsRatio * bytesPerArtist;
  const totalRaw = listenBytes + trackBytes + artistBytes;

  return Math.round(totalRaw * pgOverhead);
}

async function main() {
  const { listens } = parseArgs();

  console.log("📊 Vérification de la capacité de la base de données\n");

  try {
    const [dbSize, tableSizes, counts] = await Promise.all([
      prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`,
      prisma.$queryRawUnsafe(`
        SELECT
          relname as table_name,
          pg_total_relation_size(relid) as total_size
        FROM pg_catalog.pg_statio_user_tables
        WHERE relname IN ('Listen', 'Track', 'Artist', 'User')
        ORDER BY relname
      `),
      prisma.$queryRaw`
        SELECT
          (SELECT COUNT(*)::bigint FROM "Listen") as listens,
          (SELECT COUNT(*)::bigint FROM "Track") as tracks,
          (SELECT COUNT(*)::bigint FROM "Artist") as artists
      `,
    ]);

    const dbBytes = Number(dbSize[0]?.size ?? 0);
    const dbFormatted = formatBytes(dbBytes);

    console.log("─ Utilisation actuelle ─");
    console.log(`  Base totale:      ${dbFormatted}`);
    console.log("");

    console.log("  Par table:");
    for (const row of tableSizes) {
      const size = formatBytes(Number(row.total_size));
      console.log(`    ${row.table_name.padEnd(10)} ${size}`);
    }
    console.log("");

    const c = counts[0];
    const nListens = Number(c?.listens ?? 0);
    const nTracks = Number(c?.tracks ?? 0);
    const nArtists = Number(c?.artists ?? 0);

    console.log("  Enregistrements:");
    console.log(`    Listen:   ${nListens.toLocaleString()}`);
    console.log(`    Track:    ${nTracks.toLocaleString()}`);
    console.log(`    Artist:   ${nArtists.toLocaleString()}`);
    console.log("");

    if (listens && listens > 0) {
      const estimatedBytes = estimateStorageForListens(listens);
      const estimatedFormatted = formatBytes(estimatedBytes);
      const projectedTotal = dbBytes + estimatedBytes;
      const projectedFormatted = formatBytes(projectedTotal);

      console.log("─ Estimation pour l'import ─");
      console.log(`  Écoutes à importer: ${listens.toLocaleString()}`);
      console.log(`  Espace estimé:       ~${estimatedFormatted}`);
      console.log(`  Total projeté:      ~${projectedFormatted}`);
      console.log("");

      // Neon limits (check docs for current values)
      const neonFreeGb = 0.5;
      const neonScaleGb = 10;
      console.log("  Limites Neon (à vérifier sur dashboard.neon.tech):");
      console.log(`    Plan Free:  ~${neonFreeGb} GB`);
      console.log(`    Plan Scale: ~${neonScaleGb} GB`);
      console.log("");

      const estimatedGb = estimatedBytes / (1024 * 1024 * 1024);
      if (projectedTotal > neonFreeGb * 1024 * 1024 * 1024) {
        console.log(
          "  ⚠️  L'import pourrait dépasser la limite du plan Free."
        );
        console.log(
          "     Vérifiez votre quota sur https://console.neon.tech ou envisagez"
        );
        console.log("     d'importer par lots (filtrer par plage de dates).");
      } else {
        console.log(
          "  ✓ L'estimation reste dans les limites usuelles. Surveillez"
        );
        console.log("    l'import et le dashboard Neon en cas de ralentissement.");
      }
    } else {
      console.log("  Pour estimer un import, lancez :");
      console.log(
        '  node scripts/check-db-capacity.js --listens 272250'
      );
    }

    console.log("");
  } catch (err) {
    console.error("Erreur:", err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
