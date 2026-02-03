#!/usr/bin/env node

/**
 * Script pour supprimer les écoutes excessives dans la base de données
 *
 * Corrige les dates avec plus de 300 écoutes (limite par jour) en :
 * 1. Dédupliquant d'abord (même piste à la même heure = doublon)
 * 2. Si après déduplication il reste > 300, on garde les 300 premières (chronologiques)
 *
 * Un jour peut ainsi passer de 1200 à 130 écoutes après déduplication.
 *
 * Usage:
 *   node scripts/clean-excessive-listens.js [--userId "user_123"]
 *   node scripts/clean-excessive-listens.js --userId "user_123" --dry-run
 *   node scripts/clean-excessive-listens.js --userId "user_123" --startDate "2025-01-29" --endDate "2025-02-02"
 *   node scripts/clean-excessive-listens.js --userId "user_123" --maxPerDay 300
 *
 * userId: optionnel si un seul utilisateur existe en base
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
    // Next arg is a value only if it doesn't look like another flag
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
const dryRun = getArg("dry-run") === true;
const startDateArg = getArg("startDate") || "2025-01-29";
const endDateArg = getArg("endDate");
const maxPerDayArg = parseInt(getArg("maxPerDay") || "300", 10);

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
    '  node scripts/clean-excessive-listens.js --userId "user_123"'
  );
  process.exit(1);
}
const MAX_PER_DAY = isNaN(maxPerDayArg) || maxPerDayArg < 1 ? 300 : maxPerDayArg;

// Date range: start of Jan 29 to end of today (or endDate if provided)
const startDate = new Date(startDateArg);
if (isNaN(startDate.getTime())) {
  console.error(`❌ Date de début invalide: ${startDateArg}`);
  process.exit(1);
}
startDate.setHours(0, 0, 0, 0);

let endDate;
if (endDateArg) {
  endDate = new Date(endDateArg);
  if (isNaN(endDate.getTime())) {
    console.error(`❌ Date de fin invalide: ${endDateArg}`);
    process.exit(1);
  }
} else {
  endDate = new Date();
}
endDate.setHours(23, 59, 59, 999);

const prisma = new PrismaClient();

async function cleanExcessiveListens() {
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

    console.log("🔍 Analyse des écoutes par date...\n");
    console.log("📋 Configuration:");
    console.log(`   User ID: ${effectiveUserId}`);
    console.log(`   Utilisateur: ${user.name || user.email || "N/A"}`);
    console.log(
      `   Période: ${startDate.toLocaleDateString("fr-FR")} → ${endDate.toLocaleDateString("fr-FR")}`
    );
    console.log(`   Limite par jour: ${MAX_PER_DAY} écoutes`);
    console.log(
      `   Mode: ${dryRun ? "DRY RUN (aucune suppression)" : "SUPPRESSION RÉELLE"}\n`
    );

    // 1. Get dates with listen count >= MAX_PER_DAY (incl. exactly 300), with unique count after dedup
    const datesWithExcess = await prisma.$queryRaw`
      WITH daily AS (
        SELECT 
          ("playedAt" AT TIME ZONE 'UTC')::date as date,
          "trackId",
          "playedAt",
          id
        FROM "Listen"
        WHERE "userId" = ${effectiveUserId}
          AND "source" = 'lastfm'
          AND "playedAt" >= ${startDate}
          AND "playedAt" <= ${endDate}
      ),
      deduped AS (
        SELECT date, id,
          ROW_NUMBER() OVER (
            PARTITION BY date, "trackId", date_trunc('hour', "playedAt")
            ORDER BY id
          ) as dup_rn
        FROM daily
      ),
      unique_per_date AS (
        SELECT date, COUNT(*)::int as unique_count
        FROM deduped
        WHERE dup_rn = 1
        GROUP BY date
      ),
      total_per_date AS (
        SELECT date, COUNT(*)::int as total_count
        FROM daily
        GROUP BY date
      )
      SELECT 
        t.date::text,
        t.total_count as count,
        u.unique_count
      FROM total_per_date t
      JOIN unique_per_date u ON t.date = u.date
      WHERE t.total_count >= ${MAX_PER_DAY}
      ORDER BY t.date ASC
    `;

    if (datesWithExcess.length === 0) {
      console.log("✅ Aucune date avec un excès d'écoutes trouvée.");
      console.log("   Aucune action nécessaire.\n");
      return;
    }

    console.log(
      `📊 ${datesWithExcess.length} date(s) avec >= ${MAX_PER_DAY} écoutes:\n`
    );
    let totalToDelete = 0;
    datesWithExcess.forEach((row) => {
      const afterDedup = Math.min(row.unique_count, MAX_PER_DAY);
      const toDelete = row.count - afterDedup;
      totalToDelete += toDelete;
      const dedupInfo =
        row.unique_count < row.count
          ? ` → ${row.unique_count} uniques`
          : "";
      const capInfo =
        row.unique_count > MAX_PER_DAY
          ? ` → cap à ${MAX_PER_DAY}`
          : "";
      console.log(
        `   ${row.date}: ${row.count} écoutes${dedupInfo}${capInfo} (${toDelete} à supprimer)`
      );
    });
    console.log(`\n   Total à supprimer: ${totalToDelete} écoute(s)\n`);

    if (dryRun) {
      console.log("=".repeat(50));
      console.log("🔍 [DRY RUN] Résumé:");
      console.log(
        `   ${totalToDelete} écoute(s) seraient supprimée(s) sur ${datesWithExcess.length} date(s)`
      );
      console.log(
        "\n   ⚠️  Mode DRY RUN activé - aucune donnée n'a été supprimée"
      );
      console.log(
        "   Relancez le script sans --dry-run pour effectuer la suppression"
      );
      console.log("=".repeat(50));
      return;
    }

    // 2. Delete: deduplicate (trackId, hour) then cap at MAX_PER_DAY per date
    // Same track within same hour = duplicate. Keep one per unique, max 300/day.
    // Delete = all listens in affected dates that are NOT in the kept set
    const deleteResult = await prisma.$executeRaw`
      WITH daily AS (
        SELECT id, ("playedAt" AT TIME ZONE 'UTC')::date as date,
          "trackId", "playedAt"
        FROM "Listen"
        WHERE "userId" = ${effectiveUserId}
          AND "source" = 'lastfm'
          AND "playedAt" >= ${startDate}
          AND "playedAt" <= ${endDate}
      ),
      dates_over_limit AS (
        SELECT date FROM daily
        GROUP BY date
        HAVING COUNT(*) >= ${MAX_PER_DAY}
      ),
      deduped AS (
        SELECT id, date, "playedAt",
          ROW_NUMBER() OVER (
            PARTITION BY date, "trackId", date_trunc('hour', "playedAt")
            ORDER BY id
          ) as dup_rn
        FROM daily
        WHERE date IN (SELECT date FROM dates_over_limit)
      ),
      ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY date
            ORDER BY "playedAt" ASC, id
          ) as rn
        FROM deduped
        WHERE dup_rn = 1
      ),
      kept AS (
        SELECT id FROM ranked WHERE rn <= ${MAX_PER_DAY}
      ),
      to_delete AS (
        SELECT id FROM daily
        WHERE date IN (SELECT date FROM dates_over_limit)
        EXCEPT
        SELECT id FROM kept
      )
      DELETE FROM "Listen"
      WHERE id IN (SELECT id FROM to_delete)
    `;

    console.log("=".repeat(50));
    console.log("✅ Nettoyage terminé !");
    console.log("📊 Statistiques:");
    console.log(`   Écoutes supprimées: ${deleteResult}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n❌ Erreur fatale:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanExcessiveListens().catch((error) => {
  console.error("\n❌ Erreur fatale:", error);
  process.exit(1);
});
