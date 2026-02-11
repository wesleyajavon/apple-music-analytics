#!/usr/bin/env node

/**
 * Script pour nettoyer les écoutes excessives du 2 février 2026
 *
 * Ce jour a été pollué par des imports Last.fm en doublon. Le script :
 * 1. Déduplique : même piste dans la même heure = doublon (on conserve la première)
 * 2. Cap à un nombre aléatoire entre 80 et 120 écoutes max pour ce jour
 *
 * Usage:
 *   node scripts/clean-excessive-feb2.js
 *   node scripts/clean-excessive-feb2.js --userId "user_123"
 *   node scripts/clean-excessive-feb2.js --dry-run
 *
 * --date: date au format YYYY-MM-DD (défaut: 2026-02-02)
 * --userId: optionnel si un seul utilisateur en base
 * --dry-run: affiche sans supprimer
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

// Random max between 80 and 120 (inclusive)
function getRandomMax() {
  return Math.floor(Math.random() * (120 - 80 + 1)) + 80;
}

const MAX_PER_DAY = getRandomMax();

// Resolve userId
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
    '  node scripts/clean-excessive-feb2.js --date "2026-02-02" --userId "user_123"'
  );
  process.exit(1);
}

// Parse date
const [year, month, day] = dateArg.split("-").map(Number);
const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

if (isNaN(startDate.getTime())) {
  console.error(`❌ Date invalide: ${dateArg} (format attendu: YYYY-MM-DD)`);
  process.exit(1);
}

const prisma = new PrismaClient();

async function cleanExcessiveFeb2() {
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

    console.log("🔍 Nettoyage des écoutes excessives du 2 février 2026\n");
    console.log("📋 Configuration:");
    console.log(`   User ID: ${effectiveUserId}`);
    console.log(`   Utilisateur: ${user.name || user.email || "N/A"}`);
    console.log(`   Date cible: ${dateArg}`);
    console.log(
      `   Max écoutes (aléatoire): ${MAX_PER_DAY} (entre 80 et 120)`
    );
    console.log(
      `   Mode: ${dryRun ? "DRY RUN (aucune suppression)" : "SUPPRESSION RÉELLE"}\n`
    );

    // 1. Get listen count for the date
    const listens = await prisma.listen.findMany({
      where: {
        userId: effectiveUserId,
        source: "lastfm",
        playedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true, trackId: true, playedAt: true },
      orderBy: { playedAt: "asc" },
    });

    if (listens.length === 0) {
      console.log(`✅ Aucune écoute trouvée pour le ${dateArg}.`);
      return;
    }

    // 2. Deduplicate: same track within same hour = duplicate. Keep first.
    const deduped = [];
    const seen = new Set(); // key: trackId|hour

    for (const listen of listens) {
      const hourKey = `${listen.trackId}|${listen.playedAt.getUTCHours()}`;
      if (seen.has(hourKey)) continue;
      seen.add(hourKey);
      deduped.push(listen);
    }

    // 3. Cap at MAX_PER_DAY.
    const toKeep = deduped.slice(0, MAX_PER_DAY);
    const toDelete = listens.filter(
      (l) => !toKeep.some((k) => k.id === l.id)
    );

    if (toDelete.length === 0) {
      console.log(
        `✅ Aucun nettoyage nécessaire pour le ${dateArg}. ${listens.length} écoutes (après déduplication: ${deduped.length}).`
      );
      return;
    }

    console.log("📊 Statistiques:");
    console.log(`   Total écoutes: ${listens.length}`);
    console.log(`   Après déduplication: ${deduped.length}`);
    console.log(`   Conservées (cap à ${MAX_PER_DAY}): ${toKeep.length}`);
    console.log(`   À supprimer: ${toDelete.length}\n`);

    if (dryRun) {
      console.log("=".repeat(50));
      console.log("🔍 [DRY RUN] Aucune suppression effectuée.");
      console.log(
        `   ${toDelete.length} écoute(s) seraient supprimée(s) sur le ${dateArg}`
      );
      console.log(
        "\n   Relancez sans --dry-run pour effectuer la suppression"
      );
      console.log("=".repeat(50));
      return;
    }

    // 4. Delete
    const idsToDelete = toDelete.map((l) => l.id);
    const deleteResult = await prisma.listen.deleteMany({
      where: { id: { in: idsToDelete } },
    });

    console.log("=".repeat(50));
    console.log("✅ Nettoyage terminé !");
    console.log(`   Écoutes supprimées: ${deleteResult.count}`);
    console.log(`   Écoutes conservées: ${toKeep.length}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanExcessiveFeb2().catch((error) => {
  console.error("\n❌ Erreur fatale:", error);
  process.exit(1);
});
