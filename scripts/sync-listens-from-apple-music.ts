#!/usr/bin/env npx tsx
/**
 * Synchronise les écoutes Apple Music manquantes depuis l'export CSV
 * « Apple Music - Play History Daily Tracks.csv ».
 *
 * Pour chaque environnement ciblé :
 * 1. Résout l'utilisateur en base via son email
 * 2. Trouve la dernière écoute enregistrée
 * 3. Filtre le CSV aux jours postérieurs à cette date
 * 4. Importe les écoutes manquantes (déduplication automatique)
 *
 * Usage :
 *   npx tsx scripts/sync-listens-from-apple-music.ts
 *   npx tsx scripts/sync-listens-from-apple-music.ts --env both
 *   npx tsx scripts/sync-listens-from-apple-music.ts --env prod --dry-run
 *   npx tsx scripts/sync-listens-from-apple-music.ts --status-only
 *   npx tsx scripts/sync-listens-from-apple-music.ts --input "/chemin/vers/fichier.csv"
 *
 * Options :
 *   --env dev|prod|both   Fichier d'env (.env.local / .env). Défaut : both
 *   --email               Email utilisateur (défaut : wesleyajavon2203@hotmail.com)
 *   --input               Chemin vers le CSV Daily Tracks
 *   --from                Date ISO ou YYYYMMDD forcée (inclusive, ignore la dernière écoute)
 *   --dry-run             Simule sans écrire en base
 *   --status-only         Affiche l'état sans importer
 *   --batch-size          Taille des lots d'import (défaut : 500)
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { parseApplePlayHistoryDailyTracksCsv } from "@/lib/services/listening/parse-apple-play-history-daily-csv";
import type { NormalizedListenInput } from "@/lib/services/listening/onboarding-import-types";

const DATE_PLAYED_INDEX = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

type TargetEnv = "dev" | "prod";

const DEFAULT_EMAIL = "wesleyajavon2203@hotmail.com";
const DEFAULT_INPUT = path.join(
  process.env.HOME || "",
  "Downloads",
  "Informations sur les services multimédia Apple Lot 1 sur 6",
  "Apple_Media_Services",
  "Apple Music Activity",
  "Apple Music - Play History Daily Tracks.csv"
);

const args = process.argv.slice(2);

function getArg(key: string): string | undefined {
  const equalFormat = args.find((arg) => arg.startsWith(`--${key}=`));
  if (equalFormat) {
    return equalFormat.split("=").slice(1).join("=");
  }
  const keyIndex = args.indexOf(`--${key}`);
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    return args[keyIndex + 1];
  }
  return undefined;
}

function hasFlag(flag: string): boolean {
  return args.includes(`--${flag}`);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
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

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function parseFromDateKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{8}$/.test(trimmed)) return trimmed;
  const d = parseFromDate(trimmed);
  return d ? toDateKey(d) : null;
}

function parseFromDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (/^\d{8}$/.test(trimmed)) {
    const y = parseInt(trimmed.slice(0, 4), 10);
    const m = parseInt(trimmed.slice(4, 6), 10) - 1;
    const d = parseInt(trimmed.slice(6, 8), 10);
    return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  }
  if (/^\d{10,13}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    const ms = trimmed.length === 13 ? n : n * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

/**
 * Filtre le CSV Daily Tracks aux lignes dont Date Played est strictement après minDateKey.
 */
function filterDailyTracksCsvAfterDate(
  csvText: string,
  minDateKey: string,
  inclusive = false
): { filteredCsv: string; keptLines: number; skippedLines: number; maxDateKey: string | null } {
  const text = csvText.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      filteredCsv: "",
      keptLines: 0,
      skippedLines: 0,
      maxDateKey: null,
    };
  }

  const header = lines[0]!;
  const kept: string[] = [header];
  let keptLines = 0;
  let skippedLines = 0;
  let maxDateKey: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    const fields = parseCSVLine(line);
    const datePlayed = fields[DATE_PLAYED_INDEX];

    if (!datePlayed || datePlayed.length !== 8) {
      skippedLines++;
      continue;
    }

    if (maxDateKey === null || datePlayed > maxDateKey) {
      maxDateKey = datePlayed;
    }

    const keep = inclusive
      ? datePlayed >= minDateKey
      : datePlayed > minDateKey;

    if (keep) {
      kept.push(line);
      keptLines++;
    } else {
      skippedLines++;
    }
  }

  return {
    filteredCsv: kept.join("\n"),
    keptLines,
    skippedLines,
    maxDateKey,
  };
}

function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@").slice(0, 72);
}

function loadEnvFile(envFile: string): void {
  if (!fs.existsSync(envFile)) {
    throw new Error(`Fichier d'environnement introuvable : ${envFile}`);
  }

  const envContent = fs.readFileSync(envFile, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) return;

    const eqIndex = trimmedLine.indexOf("=");
    if (eqIndex === -1) return;

    const key = trimmedLine.slice(0, eqIndex).trim();
    const value = trimmedLine
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key) process.env[key] = value;
  });
}

function envFileForTarget(target: TargetEnv): string {
  return target === "dev"
    ? path.join(ROOT_DIR, ".env.local")
    : path.join(ROOT_DIR, ".env");
}

function forwardArgsForChild(target: TargetEnv): string[] {
  const forwarded: string[] = [`--env=${target}`];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--env") {
      i++;
      continue;
    }
    if (arg.startsWith("--env=")) continue;

    if (arg.startsWith("--") && !arg.includes("=")) {
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        forwarded.push(arg, next);
        i++;
        continue;
      }
    }
    forwarded.push(arg);
  }

  return forwarded;
}

function spawnChildForEnv(target: TargetEnv): void {
  const envFile = envFileForTarget(target);
  const childArgs = [
    "dotenv-cli",
    "-e",
    envFile,
    "--override",
    "--",
    "tsx",
    path.join("scripts", "sync-listens-from-apple-music.ts"),
    ...forwardArgsForChild(target),
  ];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`▶ Lancement sync Apple Music — environnement : ${target.toUpperCase()}`);
  console.log(`  Fichier env : ${path.basename(envFile)}`);
  console.log(`${"=".repeat(60)}\n`);

  execFileSync("npx", childArgs, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: process.env,
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getLastListen(prisma: PrismaClient, userId: string) {
  return prisma.listen.findFirst({
    where: { userId },
    orderBy: { playedAt: "desc" },
    select: {
      playedAt: true,
      source: true,
      track: {
        select: {
          title: true,
          artist: { select: { name: true } },
        },
      },
    },
  });
}

async function syncForEnv(target: TargetEnv): Promise<void> {
  const envFile = envFileForTarget(target);
  loadEnvFile(envFile);

  const email = getArg("email") ?? DEFAULT_EMAIL;
  const inputPath = getArg("input") ?? DEFAULT_INPUT;
  const dryRun = hasFlag("dry-run");
  const statusOnly = hasFlag("status-only");
  const fromArg = getArg("from");
  const batchSize = parseInt(getArg("batch-size") ?? "500", 10);

  if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL manquante dans ${path.basename(envFile)}`);
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Fichier CSV introuvable : ${inputPath}`);
  }

  const prisma = new PrismaClient();

  try {
    console.log(`\n📦 Environnement : ${target.toUpperCase()}`);
    console.log(`   DB : ${maskDatabaseUrl(process.env.DATABASE_URL)}...`);
    console.log(`   Email : ${email}`);
    console.log(`   CSV : ${inputPath}`);
    if (dryRun) console.log("   Mode : DRY-RUN");
    if (statusOnly) console.log("   Mode : STATUS ONLY");
    console.log("");

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new Error(`Aucun utilisateur trouvé pour l'email "${email}"`);
    }

    const listenCount = await prisma.listen.count({
      where: { userId: user.id },
    });
    const lastListen = await getLastListen(prisma, user.id);

    console.log(`👤 ${user.name ?? "(sans nom)"} — ${user.id}`);
    console.log(`   Écoutes totales : ${listenCount.toLocaleString("fr-FR")}`);

    if (lastListen) {
      console.log(
        `   Dernière écoute : ${lastListen.playedAt.toISOString()} (${lastListen.source})`
      );
      console.log(
        `   Titre : ${lastListen.track.artist.name} — ${lastListen.track.title}`
      );
    } else {
      console.log("   Dernière écoute : (aucune)");
    }

    const csvText = fs.readFileSync(inputPath, "utf8");

    let minDateKey: string;
    let inclusiveFrom = false;

    if (fromArg) {
      const parsed = parseFromDateKey(fromArg);
      if (!parsed) {
        throw new Error(`--from invalide : "${fromArg}" (ISO, YYYY-MM-DD ou YYYYMMDD)`);
      }
      minDateKey = parsed;
      inclusiveFrom = true;
      console.log(`\n📌 Rattrapage forcé depuis le : ${minDateKey} (inclus)`);
    } else if (lastListen) {
      minDateKey = toDateKey(lastListen.playedAt);
      console.log(
        `\n🔄 Import incrémental après le : ${minDateKey} (jour de la dernière écoute exclu)`
      );
      console.log(`   Dernière écoute en base : ${lastListen.playedAt.toISOString()}`);
    } else {
      minDateKey = "00000000";
      inclusiveFrom = true;
      console.log("\n⚠️  Aucune écoute en base — import de tout le CSV");
    }

    const { filteredCsv, keptLines, skippedLines, maxDateKey } =
      filterDailyTracksCsvAfterDate(csvText, minDateKey, inclusiveFrom);

    console.log(`\n📄 CSV Daily Tracks`);
    console.log(`   Lignes conservées : ${keptLines.toLocaleString("fr-FR")}`);
    console.log(`   Lignes ignorées : ${skippedLines.toLocaleString("fr-FR")}`);
    if (maxDateKey) {
      console.log(`   Date max CSV : ${maxDateKey}`);
    }

    const rowsToImport = parseApplePlayHistoryDailyTracksCsv(filteredCsv);
    console.log(
      `   Écoutes à traiter : ${rowsToImport.length.toLocaleString("fr-FR")}`
    );

    if (statusOnly) {
      if (rowsToImport.length > 0) {
        const sample = rowsToImport
          .sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime())
          .slice(0, 3);
        console.log("\n   Premières écoutes qui seraient importées :");
        for (const row of sample) {
          console.log(
            `     ${row.playedAt.toISOString()} — ${row.artistName} — ${row.trackName}`
          );
        }
      }
      return;
    }

    if (rowsToImport.length === 0) {
      console.log("\n✅ Rien à importer — la base est déjà à jour pour ce CSV.\n");
      return;
    }

    const { importOnboardingListens } = await import(
      "@/lib/services/listening/import-onboarding-listens"
    );

    let totalImported = 0;
    let totalSkippedDuplicates = 0;
    let totalSkippedInvalid = 0;
    const batches = chunk(rowsToImport, batchSize);

    console.log(`\n🚀 Import en ${batches.length} lot(s) de ${batchSize} max.\n`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;

      if (dryRun) {
        totalImported += batch.length;
        process.stdout.write(
          `\r   Lot ${i + 1}/${batches.length} — simulation : ${totalImported} écoutes`
        );
        continue;
      }

      const result = await importOnboardingListens(user.id, "lastfm", batch);
      totalImported += result.imported;
      totalSkippedDuplicates += result.skippedDuplicates;
      totalSkippedInvalid += result.skippedInvalid;

      process.stdout.write(
        `\r   Lot ${i + 1}/${batches.length} — +${totalImported} importés, ${totalSkippedDuplicates} doublons`
      );
    }

    if (!dryRun) {
      process.stdout.write("\n");
    } else {
      console.log("");
    }

    const updatedLastListen = dryRun
      ? null
      : await getLastListen(prisma, user.id);

    console.log(`\n${"─".repeat(50)}`);
    console.log(dryRun ? "🔍 Simulation terminée" : "🎉 Sync terminée");
    console.log(
      dryRun
        ? `   Seraient importés : ${totalImported}`
        : `   Importés : ${totalImported}`
    );
    if (!dryRun) {
      console.log(`   Doublons ignorés : ${totalSkippedDuplicates}`);
      if (totalSkippedInvalid > 0) {
        console.log(`   Lignes invalides : ${totalSkippedInvalid}`);
      }
    }
    if (!dryRun && updatedLastListen) {
      console.log(
        `   Nouvelle dernière écoute : ${updatedLastListen.playedAt.toISOString()}`
      );
      console.log(
        `   ${updatedLastListen.track.artist.name} — ${updatedLastListen.track.title}`
      );
    }
    console.log(`${"─".repeat(50)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const envArg = (getArg("env") ?? "both").toLowerCase();

  if (envArg === "both") {
    spawnChildForEnv("dev");
    spawnChildForEnv("prod");
    console.log("\n✅ Sync Apple Music dev + prod terminée.\n");
    return;
  }

  if (envArg !== "dev" && envArg !== "prod") {
    console.error('❌ --env doit être "dev", "prod" ou "both"');
    process.exit(1);
  }

  await syncForEnv(envArg);
}

main().catch((error) => {
  console.error("\n❌ Erreur fatale:", error instanceof Error ? error.message : error);
  process.exit(1);
});
