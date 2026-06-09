#!/usr/bin/env npx tsx
/**
 * Synchronise les écoutes Last.fm manquantes pour un utilisateur identifié par email.
 *
 * Pour chaque environnement ciblé :
 * 1. Résout l'utilisateur en base via son email
 * 2. Trouve la dernière écoute Last.fm enregistrée
 * 3. Récupère les scrobbles Last.fm postérieurs et les importe (déduplication automatique)
 *
 * Usage :
 *   npx tsx scripts/sync-listens-from-lastfm.ts
 *   npx tsx scripts/sync-listens-from-lastfm.ts --env dev
 *   npx tsx scripts/sync-listens-from-lastfm.ts --env prod
 *   npx tsx scripts/sync-listens-from-lastfm.ts --env both
 *   npx tsx scripts/sync-listens-from-lastfm.ts --dry-run
 *   npx tsx scripts/sync-listens-from-lastfm.ts --status-only
 *   npx tsx scripts/sync-listens-from-lastfm.ts --from "2026-04-01"
 *
 * Options :
 *   --env dev|prod|both   Fichier d'env ciblé (.env.local / .env). Défaut : both
 *   --email               Email de l'utilisateur (défaut : wesleyajavon2203@hotmail.com)
 *   --username            Pseudo Last.fm (défaut : LASTFM_USER ou LASTFM_USERNAME dans l'env)
 *   --from                Date de départ forcée (ISO ou unix seconds) — ignore la dernière écoute
 *   --dry-run             Simule l'import sans écrire en base
 *   --status-only         Affiche l'état actuel sans importer
 *   --max-pages           Limite de pages Last.fm par run (défaut : 100, 200 scrobbles/page)
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

type TargetEnv = "dev" | "prod";

const DEFAULT_EMAIL = "wesleyajavon2203@hotmail.com";
const PAGE_LIMIT = 200;
const PAGE_DELAY_MS = 2000;

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

function parseFromTimestamp(raw: string): number | null {
  const trimmed = raw.trim();
  if (/^\d{10,13}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return trimmed.length === 13 ? Math.floor(n / 1000) : n;
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@").slice(0, 72);
}

function loadEnvFile(envFile: string, overwrite = true): void {
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

    if (!key) return;
    if (overwrite || !process.env[key]) {
      process.env[key] = value;
    }
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
    path.join("scripts", "sync-listens-from-lastfm.ts"),
    ...forwardArgsForChild(target),
  ];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`▶ Lancement sync — environnement : ${target.toUpperCase()}`);
  console.log(`  Fichier env : ${path.basename(envFile)}`);
  console.log(`${"=".repeat(60)}\n`);

  execFileSync("npx", childArgs, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: process.env,
  });
}

async function getLastLastFmListen(prisma: PrismaClient, userId: string) {
  return prisma.listen.findFirst({
    where: {
      userId,
      source: "lastfm",
    },
    orderBy: { playedAt: "desc" },
    select: {
      playedAt: true,
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
  loadEnvFile(envFile, true);

  const email = getArg("email") ?? DEFAULT_EMAIL;
  const username =
    getArg("username") ??
    process.env.LASTFM_USER ??
    process.env.LASTFM_USERNAME;
  const dryRun = hasFlag("dry-run");
  const statusOnly = hasFlag("status-only");
  const fromArg = getArg("from");
  const maxPages = parseInt(getArg("max-pages") ?? "100", 10);

  if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL manquante dans ${path.basename(envFile)}`);
  }

  if (!username) {
    throw new Error(
      "Pseudo Last.fm requis : --username ou LASTFM_USER / LASTFM_USERNAME dans l'env"
    );
  }

  const { importLastFmTracks, isLastFmConfigured } = await import(
    "@/lib/services/lastfm"
  );

  if (!isLastFmConfigured()) {
    throw new Error(
      "LASTFM_API_KEY et LASTFM_API_SECRET doivent être configurés dans l'environnement ciblé"
    );
  }

  const prisma = new PrismaClient();

  try {
    console.log(`\n📦 Environnement : ${target.toUpperCase()}`);
    console.log(`   DB : ${maskDatabaseUrl(process.env.DATABASE_URL)}...`);
    console.log(`   Email : ${email}`);
    console.log(`   Last.fm : ${username}`);
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
    const lastListen = await getLastLastFmListen(prisma, user.id);

    console.log(`👤 ${user.name ?? "(sans nom)"} — ${user.id}`);
    console.log(`   Écoutes totales : ${listenCount.toLocaleString("fr-FR")}`);

    if (lastListen) {
      console.log(
        `   Dernière écoute Last.fm : ${lastListen.playedAt.toISOString()}`
      );
      console.log(
        `   Titre : ${lastListen.track.artist.name} — ${lastListen.track.title}`
      );
    } else {
      console.log("   Dernière écoute Last.fm : (aucune)");
    }

    if (statusOnly) {
      return;
    }

    let fromTimestamp: number;

    if (fromArg) {
      const parsed = parseFromTimestamp(fromArg);
      if (parsed === null) {
        throw new Error(`--from invalide : "${fromArg}"`);
      }
      fromTimestamp = parsed;
      console.log(
        `\n📌 Rattrapage forcé depuis : ${new Date(fromTimestamp * 1000).toISOString()}`
      );
    } else if (lastListen) {
      fromTimestamp = Math.floor(lastListen.playedAt.getTime() / 1000) - 1;
      console.log(
        `\n🔄 Import incrémental depuis : ${new Date(fromTimestamp * 1000).toISOString()}`
      );
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      fromTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
      console.log(
        `\n⚠️  Aucune écoute Last.fm — import des 30 derniers jours depuis : ${thirtyDaysAgo.toISOString()}`
      );
    }

    let page = 1;
    let totalPages = 1;
    let totalImported = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    console.log(`   Limite : ${maxPages} pages (${maxPages * PAGE_LIMIT} scrobbles max.)\n`);

    do {
      process.stdout.write(`📄 Page ${page}/${totalPages}... `);

      const result = await importLastFmTracks(user.id, {
        username,
        limit: PAGE_LIMIT,
        page,
        from: fromTimestamp,
        dryRun,
      });

      if (!result.success && result.errors.length > 0) {
        console.log("❌");
        allErrors.push(...result.errors);
        break;
      }

      totalImported += result.imported;
      totalSkipped += result.skipped;
      totalPages = result.totalPages ?? totalPages;

      console.log(
        dryRun
          ? `✅ (simulation) +${result.imported} / ignorés ${result.skipped}`
          : `✅ +${result.imported} / ignorés ${result.skipped}`
      );

      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
      }

      const reachedPageLimit = page >= maxPages && page < totalPages;
      const hasMorePages = page < totalPages;

      page++;

      if (reachedPageLimit) {
        console.warn(
          `\n⚠️  Limite de pages atteinte (${maxPages}). Relancez le script pour continuer.`
        );
        break;
      }

      if (hasMorePages) {
        await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
      }
    } while (page <= totalPages);

    const updatedLastListen = dryRun
      ? null
      : await getLastLastFmListen(prisma, user.id);

    console.log(`\n${"─".repeat(50)}`);
    console.log(dryRun ? "🔍 Simulation terminée" : "🎉 Sync terminée");
    console.log(
      dryRun
        ? `   Seraient importés : ${totalImported}`
        : `   Importés : ${totalImported}`
    );
    console.log(`   Ignorés (doublons) : ${totalSkipped}`);
    console.log(`   Pages traitées : ${page - 1}/${totalPages}`);

    if (!dryRun && updatedLastListen) {
      console.log(
        `   Nouvelle dernière écoute : ${updatedLastListen.playedAt.toISOString()}`
      );
      console.log(
        `   ${updatedLastListen.track.artist.name} — ${updatedLastListen.track.title}`
      );
    }

    if (allErrors.length > 0) {
      console.log(`   Erreurs : ${allErrors.length}`);
      allErrors.slice(0, 5).forEach((err, i) => console.log(`     ${i + 1}. ${err}`));
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
    console.log("\n✅ Sync dev + prod terminée.\n");
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
