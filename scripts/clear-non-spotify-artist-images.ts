/**
 * Met Artist.imageUrl à null si l’URL n’est pas un CDN Spotify (Last.fm, Replay, etc.).
 *
 * Usage :
 *   npx tsx scripts/clear-non-spotify-artist-images.ts --dry-run
 *   npx tsx scripts/clear-non-spotify-artist-images.ts
 *   npx tsx scripts/clear-non-spotify-artist-images.ts --database-url "postgresql://..."
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { PrismaClient } from "@prisma/client";

import { clearNonSpotifyArtistImageUrls } from "../lib/services/spotify/artist-image-enrichment";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const DRY_RUN = args.includes("--dry-run");
const DATABASE_URL_OVERRIDE = getArg("database-url")?.trim() || undefined;
if (DATABASE_URL_OVERRIDE) {
  process.env.DATABASE_URL = DATABASE_URL_OVERRIDE;
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL est requis.");
  process.exit(1);
}

let prisma: PrismaClient | undefined;

async function main() {
  const { PrismaClient: PC } = await import("@prisma/client");
  const db = new PC();
  prisma = db;

  if (DRY_RUN) {
    console.log("Mode DRY-RUN : aucune écriture.\n");
  }

  const r = await clearNonSpotifyArtistImageUrls({ db, dryRun: DRY_RUN });

  console.log(`Artistes avec imageUrl : ${r.scanned}`);
  console.log(
    DRY_RUN
      ? `À vider (non-Spotify) : ${r.cleared}`
      : `Vidés (non-Spotify) : ${r.cleared}`
  );
  if (r.sampleHosts.length > 0) {
    console.log(`Hôtes concernés : ${r.sampleHosts.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
