/**
 * Pour les artistes les plus écoutés en base : recherche Spotify (Client Credentials),
 * récupération d’une image haute définition et mise à jour de Artist.imageUrl.
 *
 * Variables : DATABASE_URL, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 *
 * Usage :
 *   npx tsx scripts/enrich-artist-images-spotify.ts --dry-run --limit 50
 *   npx tsx scripts/enrich-artist-images-spotify.ts --limit 100 --delay-ms 500
 *   npx tsx scripts/enrich-artist-images-spotify.ts --user-id <uuid> --limit 30
 *   --artist-detail-concurrency 3   (défaut 3, max 3 : requêtes GET /artists/{id} en parallèle)
 *
 * Si Node affiche ECANCELED pendant le chargement (souvent avec iCloud Drive / lecteurs réseau),
 * essayez : node --import tsx scripts/enrich-artist-images-spotify.ts …
 * ou clonez le dépôt hors du dossier Documents synchronisé.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { PrismaClient } from "@prisma/client";

import {
  enrichTopUserArtistsFromSpotify,
  queryTopArtistRowsByListenCount,
} from "../lib/services/spotify/artist-image-enrichment";

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

function hasFlag(flag: string) {
  return args.includes(`--${flag}`);
}

const DRY_RUN = hasFlag("dry-run");
const FORCE = hasFlag("force");
const LIMIT_RAW = getArg("limit");
const LIMIT =
  LIMIT_RAW != null && LIMIT_RAW !== "" ? parseInt(LIMIT_RAW, 10) : 50;
const DELAY_MS = Math.max(
  0,
  parseInt(getArg("delay-ms") || "400", 10) || 400
);
const USER_ID = getArg("user-id")?.trim() || undefined;

const ARTIST_DETAIL_CONCURRENCY = Math.min(
  3,
  Math.max(
    1,
    parseInt(getArg("artist-detail-concurrency") || "3", 10) || 3
  )
);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL est requis.");
  process.exit(1);
}

const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET sont requis (flux client_credentials)."
  );
  process.exit(1);
}

if (Number.isNaN(LIMIT) || LIMIT < 1 || LIMIT > 500) {
  console.error("--limit doit être entre 1 et 500.");
  process.exit(1);
}

let prisma: PrismaClient | undefined;

async function main() {
  const { PrismaClient: PC } = await import("@prisma/client");
  const db = new PC();
  prisma = db;

  console.log(
    DRY_RUN
      ? "Mode DRY-RUN : aucune écriture en base.\n"
      : FORCE
        ? "Mise à jour des images (--force : même si imageUrl existe déjà).\n"
        : "Mise à jour de Artist.imageUrl si vide uniquement.\n"
  );
  console.log(`Top artistes par nombre d’écoutes : ${LIMIT}`);
  if (USER_ID) console.log(`Filtre userId : ${USER_ID}`);
  console.log(`Délai entre recherches : ${DELAY_MS} ms`);
  console.log(
    `Détails artiste : GET /v1/artists/{id} (max ${ARTIST_DETAIL_CONCURRENCY} requête(s) parallèle(s))\n`
  );

  const rows = await queryTopArtistRowsByListenCount({
    userId: USER_ID,
    limit: LIMIT,
    db,
  });

  if (rows.length === 0) {
    console.log("Aucun artiste (aucune écoute correspondante).");
    return;
  }

  console.log(`${rows.length} artiste(s) sélectionné(s).\n`);

  const needPreview = FORCE
    ? rows.length
    : rows.filter((r) => !r.image_url?.trim()).length;
  console.log(
    needPreview
      ? `${needPreview} artiste(s) seront interrogé(s) sur Spotify (${rows.length - needPreview} ignorés sans besoin).\n`
      : "Toutes les lignes ont déjà une image (utilise --force pour remplacer).\n"
  );

  const r = await enrichTopUserArtistsFromSpotify({
    userId: USER_ID,
    clientId: clientId!,
    clientSecret: clientSecret!,
    limit: LIMIT,
    force: FORCE,
    delayMs: DELAY_MS,
    artistDetailConcurrency: ARTIST_DETAIL_CONCURRENCY,
    dryRun: DRY_RUN,
    db,
    log: console.error,
  });

  console.log("\n--- Résumé ---");
  console.log(`Écoutes : top ${rows.length} artiste(s) chargé(s)`);
  console.log(
    DRY_RUN ? `Serait mis à jour : ${r.updated}` : `Mis à jour : ${r.updated}`
  );
  console.log(`Sans image Spotify : ${r.skippedNoImageUrl}`);
  console.log(`Recherche sans match : ${r.skippedNoSpotifyMatch}`);
  console.log(`Erreurs recherche : ${r.searchFailures}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
