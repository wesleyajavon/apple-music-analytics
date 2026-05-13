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
 *
 * Si Node affiche ECANCELED pendant le chargement (souvent avec iCloud Drive / lecteurs réseau),
 * essayez : node --import tsx scripts/enrich-artist-images-spotify.ts …
 * ou clonez le dépôt hors du dossier Documents synchronisé.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { PrismaClient } from "@prisma/client";

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
  LIMIT_RAW != null && LIMIT_RAW !== ""
    ? parseInt(LIMIT_RAW, 10)
    : 50;
const DELAY_MS = Math.max(0, parseInt(getArg("delay-ms") || "400", 10) || 400);
const USER_ID = getArg("user-id")?.trim() || undefined;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchClientCredentialsToken(): Promise<string> {
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const basic = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
    "base64"
  );

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Spotify token: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }

  const data = JSON.parse(text) as { access_token?: string };
  const token = data.access_token?.trim();
  if (!token) throw new Error("Spotify token: réponse sans access_token");
  return token;
}

type SpotifyImage = { url?: string; width?: number | null; height?: number | null };

type SpotifyArtistItem = {
  id: string;
  name?: string;
  images?: SpotifyImage[];
};

function pickBestImageUrl(images: SpotifyImage[] | undefined): string | null {
  if (!images?.length) return null;
  let best: SpotifyImage | undefined;
  let bestArea = -1;
  for (const img of images) {
    const w = img.width ?? 0;
    const h = img.height ?? 0;
    const area =
      w > 0 && h > 0 ? w * h : 0;
    if (area > bestArea && img.url) {
      bestArea = area;
      best = img;
    }
  }
  if (best?.url?.trim()) return best.url.trim();
  for (let i = images.length - 1; i >= 0; i--) {
    const u = images[i]?.url?.trim();
    if (u) return u;
  }
  return null;
}

function buildArtistSearchQuery(artistName: string): string {
  const t = artistName.trim();
  const escaped = t.replace(/"/g, "").trim();
  return `artist:"${escaped}"`;
}

async function spotifySearchFirstArtist(
  accessToken: string,
  artistName: string,
  retries: number
): Promise<{ id: string; name: string; imageUrl: string | null } | null> {
  const params = new URLSearchParams({
    q: buildArtistSearchQuery(artistName),
    type: "artist",
    limit: "3",
  });
  const url = `https://api.spotify.com/v1/search?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 5000;
    if (retries > 0) {
      await sleep(waitMs);
      return spotifySearchFirstArtist(accessToken, artistName, retries - 1);
    }
    throw new Error("Spotify 429 Rate limit après nouvel essai.");
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `Spotify search: HTTP ${res.status} — ${text.slice(0, 280)}`
    );
  }

  const data = JSON.parse(text) as {
    artists?: { items?: SpotifyArtistItem[] };
  };
  const items = data.artists?.items ?? [];
  if (items.length === 0) return null;

  const target = artistName.trim().toLowerCase();
  const exact = items.find(
    (it) => (it.name ?? "").trim().toLowerCase() === target
  );
  const pick = exact ?? items[0]!;
  const imageUrl = pickBestImageUrl(pick.images);

  return {
    id: pick.id,
    name: pick.name ?? artistName,
    imageUrl,
  };
}

async function fetchArtistsBulk(
  accessToken: string,
  ids: string[],
  retries: number
): Promise<Map<string, { imageUrl: string | null }>> {
  const out = new Map<string, { imageUrl: string | null }>();
  if (ids.length === 0) return out;

  const params = new URLSearchParams({ ids: ids.join(",") });
  const url = `https://api.spotify.com/v1/artists?${params.toString()}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 5000;
    await sleep(waitMs);
    return fetchArtistsBulk(accessToken, ids, retries - 1);
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `Spotify artists bulk: HTTP ${res.status} — ${text.slice(0, 280)}`
    );
  }

  const data = JSON.parse(text) as { artists?: (SpotifyArtistItem | null)[] };
  for (const a of data.artists ?? []) {
    if (!a?.id) continue;
    out.set(a.id, { imageUrl: pickBestImageUrl(a.images) });
  }
  return out;
}

async function getTopArtistRows(
  prisma: PrismaClient,
  Prisma: typeof import("@prisma/client").Prisma,
  opts: {
    userId?: string;
    limit: number;
  }
): Promise<
  Array<{ artist_id: string; artist_name: string; image_url: string | null }>
> {
  const { userId, limit } = opts;
  const query = Prisma.sql`
    SELECT 
      a.id AS artist_id,
      a.name AS artist_name,
      a."imageUrl" AS image_url
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE 1=1
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY a.id, a.name, a."imageUrl"
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}
  `;

  return prisma.$queryRaw(query);
}

function chunkIds<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const { PrismaClient: PC, Prisma: PrismaNs } = await import("@prisma/client");
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
  console.log(`Délai entre recherches : ${DELAY_MS} ms\n`);

  let accessToken = await fetchClientCredentialsToken();

  const rows = await getTopArtistRows(db, PrismaNs, {
    userId: USER_ID,
    limit: LIMIT,
  });

  if (rows.length === 0) {
    console.log("Aucun artiste (aucune écoute correspondante).");
    return;
  }

  console.log(`${rows.length} artiste(s) à traiter.\n`);

  const needSearch: typeof rows = [];
  for (const row of rows) {
    const hasImg = Boolean(row.image_url?.trim());
    if (!FORCE && hasImg) continue;
    needSearch.push(row);
  }

  console.log(
    needSearch.length
      ? `${needSearch.length} artiste(s) à enrichir (${rows.length - needSearch.length} ignoré(s) sans besoin).\n`
      : "Toutes les lignes ont déjà une image (utilise --force pour remplacer).\n"
  );

  const spotifyIdByDbId = new Map<string, string>();
  let searchFailures = 0;
  let noMatch = 0;

  for (let i = 0; i < needSearch.length; i++) {
    const row = needSearch[i]!;
    const label = row.artist_name;
    process.stdout.write(
      `[${i + 1}/${needSearch.length}] recherche Spotify : "${label}" … `
    );

    await sleep(DELAY_MS);

    try {
      let match = await spotifySearchFirstArtist(accessToken, label, 2);

      if (!match?.id) {
        noMatch++;
        console.log("aucun résultat.");
        continue;
      }

      spotifyIdByDbId.set(row.artist_id, match.id);

      console.log(`→ id ${match.id}${match.imageUrl ? " (+ images search)" : " (sans image search)"}`);
    } catch (e) {
      searchFailures++;
      console.log(`erreur: ${(e as Error).message}`);
    }
  }

  const ids = [...new Set(spotifyIdByDbId.values())];

  console.log(`\nRécupération détaillée GET /artists pour ${ids.length} id(s)…\n`);

  const imageBySpotifyId = new Map<string, string | null>();
  for (const part of chunkIds(ids, 50)) {
    await sleep(DELAY_MS);
    try {
      const bulk = await fetchArtistsBulk(accessToken, part, 2);
      for (const [id, v] of bulk) imageBySpotifyId.set(id, v.imageUrl);
    } catch (e) {
      console.error(`Bulk artists erreur: ${(e as Error).message}`);
    }
  }

  let updated = 0;
  let skippedNoUrl = 0;

  for (const row of needSearch) {
    const sid = spotifyIdByDbId.get(row.artist_id);
    if (!sid) continue;

    let url = imageBySpotifyId.get(sid) ?? null;
    if (!url?.trim()) {
      skippedNoUrl++;
      continue;
    }
    url = url.trim();

    if (DRY_RUN) {
      updated++;
      continue;
    }

    await db.artist.update({
      where: { id: row.artist_id },
      data: { imageUrl: url },
    });
    updated++;
  }

  console.log("\n--- Résumé ---");
  console.log(`Écoutes : top ${rows.length} artiste(s) chargé(s)`);
  console.log(DRY_RUN ? `Serait mis à jour : ${updated}` : `Mis à jour : ${updated}`);
  console.log(`Sans image Spotify : ${skippedNoUrl}`);
  console.log(`Recherche sans match : ${noMatch}`);
  console.log(`Erreurs recherche : ${searchFailures}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
