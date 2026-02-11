#!/usr/bin/env node

/**
 * Script pour remplir les jours sans écoutes (3-8 février 2026)
 *
 * Last.fm n'a pas enregistré les écoutes pendant ces jours. Le script insère
 * un nombre aléatoire d'écoutes (entre 20 et 120) par jour, en choisissant
 * des pistes aléatoirement parmi celles déjà présentes en base.
 *
 * Usage:
 *   node scripts/fill-empty-days.js
 *   node scripts/fill-empty-days.js --userId "user_123"
 *   node scripts/fill-empty-days.js --dry-run
 *
 * --startDate: date de début YYYY-MM-DD (défaut: 2026-02-03)
 * --endDate: date de fin YYYY-MM-DD (défaut: 2026-02-08)
 * --userId: optionnel si un seul utilisateur en base
 * --dry-run: affiche sans insérer
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
const startDateArg = getArg("startDate") || "2026-02-03";
const endDateArg = getArg("endDate") || "2026-02-08";
const dryRun = getArg("dry-run") === true;

// Random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    '  node scripts/fill-empty-days.js --userId "user_123"'
  );
  process.exit(1);
}

// Generate array of dates between start and end (inclusive)
// Returns Date objects at UTC midnight for each day
function getDateRange(startStr, endStr) {
  const dates = [];
  const [startY, startM, startD] = startStr.split("-").map(Number);
  const [endY, endM, endD] = endStr.split("-").map(Number);

  const start = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0, 0));
  const end = new Date(Date.UTC(endY, endM - 1, endD, 0, 0, 0, 0));

  if (start > end) {
    throw new Error(`startDate (${startStr}) doit être <= endDate (${endStr})`);
  }

  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

const prisma = new PrismaClient();

async function fillEmptyDays() {
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

    const dateRange = getDateRange(startDateArg, endDateArg);

    console.log("🔍 Remplissage des jours sans écoutes\n");
    console.log("📋 Configuration:");
    console.log(`   User ID: ${effectiveUserId}`);
    console.log(`   Utilisateur: ${user.name || user.email || "N/A"}`);
    console.log(
      `   Période: ${startDateArg} → ${endDateArg} (${dateRange.length} jours)`
    );
    console.log(
      `   Mode: ${dryRun ? "DRY RUN (aucune insertion)" : "INSERTION RÉELLE"}\n`
    );

    // 1. Get all track IDs from the database (tracks that have been listened to)
    const tracks = await prisma.track.findMany({
      select: { id: true },
    });

    if (tracks.length === 0) {
      console.error("❌ Aucune piste trouvée en base de données");
      process.exit(1);
    }

    const trackIds = tracks.map((t) => t.id);
    console.log(`   Pistes disponibles: ${trackIds.length}\n`);

    let totalInserted = 0;

    for (const date of dateRange) {
      const dateStr = date.toISOString().split("T")[0];

      // 2. Check if day already has listens (UTC)
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const existingCount = await prisma.listen.count({
        where: {
          userId: effectiveUserId,
          playedAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });

      if (existingCount > 0) {
        console.log(`   ${dateStr}: ${existingCount} écoutes déjà présentes → ignoré`);
        continue;
      }

      // 3. Random count between 20 and 120
      const countToInsert = randomInt(20, 120);

      // 4. Pick random tracks (with replacement - same track can be listened multiple times)
      const selectedTrackIds = [];
      for (let i = 0; i < countToInsert; i++) {
        const idx = Math.floor(Math.random() * trackIds.length);
        selectedTrackIds.push(trackIds[idx]);
      }

      // 5. Generate random timestamps within the day (UTC)
      const dayStartTs = new Date(date);
      const dayEndTs = new Date(date);
      dayEndTs.setUTCHours(23, 59, 59, 999);

      const listensToCreate = selectedTrackIds.map((trackId) => {
        const randomMs =
          dayStartTs.getTime() +
          Math.random() * (dayEndTs.getTime() - dayStartTs.getTime());
        return {
          userId: effectiveUserId,
          trackId,
          playedAt: new Date(randomMs),
          source: "lastfm",
        };
      });

      // Sort by playedAt for realistic order
      listensToCreate.sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime());

      if (dryRun) {
        console.log(
          `   ${dateStr}: [DRY RUN] ${countToInsert} écoutes seraient insérées`
        );
        totalInserted += countToInsert;
        continue;
      }

      // 6. Insert (batch for performance)
      await prisma.listen.createMany({
        data: listensToCreate,
      });

      console.log(`   ${dateStr}: ${countToInsert} écoutes insérées ✓`);
      totalInserted += countToInsert;
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Remplissage terminé !");
    console.log(`   Total écoutes ${dryRun ? "simulées" : "insérées"}: ${totalInserted}`);
    if (dryRun) {
      console.log(
        "\n   ⚠️  Mode DRY RUN - aucune donnée n'a été insérée"
      );
      console.log("   Relancez sans --dry-run pour effectuer l'insertion");
    }
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fillEmptyDays().catch((error) => {
  console.error("\n❌ Erreur fatale:", error);
  process.exit(1);
});
