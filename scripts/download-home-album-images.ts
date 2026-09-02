/**
 * Télécharge les pochettes Spotify des albums de démo home.
 * Usage: npx tsx scripts/download-home-album-images.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchSpotifyClientCredentialsToken,
  getSpotifyClientCredentialsFromEnv,
} from "../lib/services/spotify/artist-image-enrichment";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "brand", "home-albums");

const ALBUMS = [
  {
    slug: "when-we-all-fall-asleep",
    spotifyId: "0S0KGZnfBGSIssfF54WSJh",
    searchQuery: "WHEN WE ALL FALL ASLEEP WHERE DO WE GO Billie Eilish",
  },
  {
    slug: "views",
    spotifyId: "40GMAhriYJRO1rsY4YdrZb",
    searchQuery: "Views Drake",
  },
  {
    slug: "midnights",
    spotifyId: "4moVP48t9bji7djUc5VOvi",
    searchQuery: "Midnights Taylor Swift",
  },
  {
    slug: "after-hours",
    spotifyId: "4yP0jdRZyAZbwwQWdQ3FK5",
    searchQuery: "After Hours The Weeknd",
  },
  {
    slug: "un-verano-sin-ti",
    spotifyId: "3RQQmkQEvNCY4prGKE6oc5",
    searchQuery: "Un Verano Sin Ti Bad Bunny",
  },
  {
    slug: "blonde",
    spotifyId: "3mH6qwIyU6g8T19OGkvjC8",
    searchQuery: "Blonde Frank Ocean",
  },
  {
    slug: "in-rainbows",
    spotifyId: "5vkqYmiPBYRbWjKVBQsks8",
    searchQuery: "In Rainbows Radiohead",
  },
  {
    slug: "22-a-million",
    spotifyId: "4sLtYO2jDdzF9GKibVJKzO",
    searchQuery: "22 A Million Bon Iver",
  },
  {
    slug: "random-access-memories",
    spotifyId: "4m2880jivSbbyEGAKfITCa",
    searchQuery: "Random Access Memories Daft Punk",
  },
  {
    slug: "rumours",
    spotifyId: "1bt6q2SruMsBtceG00X1Ap",
    searchQuery: "Rumours Fleetwood Mac",
  },
  {
    slug: "to-pimp-a-butterfly",
    spotifyId: "7ycBtnsMtyVbbwTfJwRjSP",
    searchQuery: "To Pimp a Butterfly Kendrick Lamar",
  },
] as const;

function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(__dirname, "..", name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
    break;
  }
}

function pickBestImage(
  images: Array<{ url?: string; width?: number; height?: number }> | undefined
): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort(
    (a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
  );
  return sorted[0]?.url?.trim() ?? null;
}

async function resolveAlbumImageUrl(
  token: string,
  album: (typeof ALBUMS)[number]
): Promise<string> {
  const detailRes = await fetch(
    `https://api.spotify.com/v1/albums/${encodeURIComponent(album.spotifyId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (detailRes.ok) {
    const data = (await detailRes.json()) as {
      images?: Array<{ url?: string; width?: number; height?: number }>;
    };
    const best = pickBestImage(data.images);
    if (best) return best;
  }

  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?type=album&limit=5&q=${encodeURIComponent(album.searchQuery)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) {
    throw new Error(`${album.slug}: search HTTP ${searchRes.status}`);
  }

  const searchData = (await searchRes.json()) as {
    albums?: {
      items?: Array<{
        images?: Array<{ url?: string; width?: number; height?: number }>;
      }>;
    };
  };

  const items = searchData.albums?.items ?? [];
  const best = pickBestImage(items[0]?.images);
  if (!best) throw new Error(`${album.slug}: pas d'image Spotify`);
  return best;
}

async function main() {
  loadEnvFile();
  const creds = getSpotifyClientCredentialsFromEnv();
  if (!creds) {
    throw new Error("SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET requis.");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const token = await fetchSpotifyClientCredentialsToken(
    creds.clientId,
    creds.clientSecret
  );

  for (const album of ALBUMS) {
    const outPath = path.join(OUT_DIR, `${album.slug}.jpg`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      console.log(`· ${album.slug} déjà présent — ignoré`);
      continue;
    }

    const best = await resolveAlbumImageUrl(token, album);

    const imgRes = await fetch(best);
    if (!imgRes.ok) throw new Error(`${album.slug}: download HTTP ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`✓ ${album.slug} → ${outPath} (${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
