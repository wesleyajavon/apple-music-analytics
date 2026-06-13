/**
 * Télécharge les pochettes Spotify des albums de démo home (classiques iconiques).
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
    slug: "abbey-road",
    spotifyId: "0ETLXbWvGoJL5uzREpyKJ8",
    searchQuery: "Abbey Road The Beatles",
  },
  {
    slug: "thriller",
    spotifyId: "2ANVost0y2y52ema1FvVjS",
    searchQuery: "Thriller Michael Jackson",
  },
  {
    slug: "dark-side",
    spotifyId: "4LH4d3cOWNNsVw41Gqt2kj",
    searchQuery: "The Dark Side of the Moon Pink Floyd",
  },
  {
    slug: "nevermind",
    spotifyId: "2UJwKSBler6H8DPHv4wOvf",
    searchQuery: "Nevermind Nirvana",
  },
  {
    slug: "back-in-black",
    spotifyId: "5arCyd4Bx5TkMNgRuHtygE",
    searchQuery: "Back in Black AC/DC",
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
