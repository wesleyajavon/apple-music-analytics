#!/usr/bin/env node

/**
 * Script pour supprimer les écoutes en doublon (scrobbles Last.fm dupliqués)
 *
 * Un doublon est défini comme : même trackId repris dans une fenêtre de tolérance.
 * Ex: --tolerance 120 = même piste rejouée dans les 2 minutes = doublon.
 * On conserve la première occurrence (chronologique).
 *
 * Usage:
 *   node scripts/clean-duplicate-listens.js [--date "2026-02-02"]
 *   node scripts/clean-duplicate-listens.js --date "2026-02-02" --tolerance 120
 *   node scripts/clean-duplicate-listens.js --date "2026-02-02" --dry-run
 *
 * --date: date au format YYYY-MM-DD (défaut: 2026-02-02)
 * --tolerance: secondes - même piste dans cette fenêtre = doublon (défaut: 120)
 * --userId: optionnel si un seul utilisateur en base
 * --dry-run: affiche sans supprimer
 */

// Load environment variables from .env.local if available
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

if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@");
  console.log(`✓ DATABASE_URL chargée: ${maskedUrl.substring(0, 50)}...`);
} else {
  console.error(
    "❌ DATABASE_URL non trouvée dans les variables d'environnement"
  );
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(key) {
  const equalFormat = args.find((arg) => arg.startsWith(`--${key}=`));
  if (equalFormat) {
    return equalFormat.split("=")[1];
  }
  const keyIndex = args.indexOf(`--${key}`);
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    const nextArg = args[keyIndex + 1];
    if (!nextArg.startsWith("--")) {
      return nextArg;
    }
  }
  if (args.includes(`--${key}`)) {
    return true;
  }
  return undefined;
}

let userIdArg = getArg("userId");
const dateArg = getArg("date") || "2026-02-02";
const dryRun = getArg("dry-run") === true;
const toleranceArg = parseInt(getArg("tolerance") || "120", 10);
const TOLERANCE_SECONDS = isNaN(toleranceArg) || toleranceArg < 0 ? 120 : toleranceArg;

// Resolve userId: use provided value or first user if only one exists
async function resolveUserId(prismaClient) {
  if (userIdArg) return userIdArg;
  const users = await prismaClient.user.findMany({ take: 2 });
  if (users.length === 1) {
    return users[0].id;
  }
  if (users.length === 0) {
    console.error("❌ Aucun utilisateur trouvé dans la base de données");
    process.exit(1);
  }
  console.error(
    "❌ Erreur: userId est requis (plusieurs utilisateurs existent)"
  );
  console.error("\nUsage:");
  console.error(
    '  node scripts/clean-duplicate-listens.js --date "2026-02-02" --userId "user_123"'
  );
  process.exit(1);
}

// Parse date range
const [year, month, day] = dateArg.split("-").map(Number);
const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

if (isNaN(startDate.getTime())) {
  console.error(`❌ Date invalide: ${dateArg} (format attendu: YYYY-MM-DD)`);
  process.exit(1);
}

const prisma = new PrismaClient();

async function cleanDuplicateListens() {
  try {
    const effectiveUserId = await resolveUserId(prisma);
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
    });

    if (!user) {
      console.error(
        `❌ L'utilisateur avec l'ID "${effectiveUserId}" n'existe pas`
      );
      process.exit(1);
    }

    console.log("🔍 Suppression des doublons d'écoutes Last.fm\n");
    console.log("📋 Configuration:");
    console.log(`   User ID: ${effectiveUserId}`);
    console.log(`   Utilisateur: ${user.name || user.email || "N/A"}`);
    console.log(`   Date cible: ${dateArg}`);
    console.log(
      `   Tolérance: ${TOLERANCE_SECONDS}s (même piste dans cette fenêtre = doublon)`
    );
    console.log(
      `   Mode: ${dryRun ? "DRY RUN (aucune suppression)" : "SUPPRESSION RÉELLE"}\n`
    );

    // 1. Get all listens for the date (source=lastfm)
    const listens = await prisma.listen.findMany({
      where: {
        userId: effectiveUserId,
        source: "lastfm",
        playedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        track: {
          include: { artist: true },
        },
      },
      orderBy: { id: "asc" },
    });

    if (listens.length === 0) {
      console.log(`✅ Aucune écoute trouvée pour le ${dateArg}.`);
      return;
    }

    // 2. Find duplicates: same track within TOLERANCE_SECONDS = duplicate
    // Sort by playedAt to process chronologically
    const sorted = [...listens].sort(
      (a, b) =>
        a.playedAt.getTime() - b.playedAt.getTime() || a.id.localeCompare(b.id)
    );

    const lastKeptByTrack = new Map(); // trackId -> playedAt (ms) of last kept
    const toDelete = [];

    for (const listen of sorted) {
      const playedAtMs = listen.playedAt.getTime();
      const lastKept = lastKeptByTrack.get(listen.trackId);

      if (lastKept !== undefined) {
        const diffSeconds = (playedAtMs - lastKept) / 1000;
        if (diffSeconds <= TOLERANCE_SECONDS) {
          toDelete.push(listen);
          continue;
        }
      }

      lastKeptByTrack.set(listen.trackId, playedAtMs);
    }

    const uniqueCount = listens.length - toDelete.length;

    if (toDelete.length === 0) {
      console.log(
        `✅ Aucun doublon trouvé pour le ${dateArg}. ${listens.length} écoutes uniques.`
      );
      return;
    }

    console.log("📊 Statistiques:");
    console.log(`   Total écoutes: ${listens.length}`);
    console.log(`   Uniques (à conserver): ${uniqueCount}`);
    console.log(`   Doublons (à supprimer): ${toDelete.length}\n`);

    if (dryRun) {
      console.log("🔍 [DRY RUN] Exemples de doublons à supprimer:");
      const byTrack = new Map();
      for (const l of toDelete.slice(0, 10)) {
        const trackKey = `${l.track.artist.name} - ${l.track.title}`;
        const count = (byTrack.get(trackKey) || 0) + 1;
        byTrack.set(trackKey, count);
      }
      let shown = 0;
      for (const [track, count] of byTrack) {
        if (shown++ >= 5) break;
        console.log(`   - "${track}" (${count} doublon(s))`);
      }
      if (toDelete.length > 10) {
        console.log(`   ... et ${toDelete.length - 10} autres`);
      }
      console.log("\n   ⚠️  Relancez sans --dry-run pour effectuer la suppression");
      return;
    }

    // 3. Delete duplicates
    const idsToDelete = toDelete.map((l) => l.id);
    const deleteResult = await prisma.listen.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    console.log("=".repeat(50));
    console.log("✅ Nettoyage terminé !");
    console.log(`   Écoutes supprimées: ${deleteResult.count}`);
    console.log(`   Écoutes conservées: ${uniqueCount}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicateListens().catch((error) => {
  console.error("\n❌ Erreur fatale:", error);
  process.exit(1);
});
