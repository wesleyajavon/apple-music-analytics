/**
 * Télécharge les images Spotify des artistes de démo auth (The Weeknd, Bad Bunny, GIMS).
 * Usage: npx tsx scripts/download-auth-artist-images.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchSpotifyClientCredentialsToken,
  getSpotifyClientCredentialsFromEnv,
} from "../lib/services/spotify/artist-image-enrichment";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "brand", "auth-artists");

const ARTISTS = [
  { slug: "the-weeknd", spotifyId: "1Xyo4u8uXC1ZmMpatF05PJ", searchName: "The Weeknd" },
  { slug: "bad-bunny", spotifyId: "4q3ewBCX7sLwd24euuV69X", searchName: "Bad Bunny" },
  { slug: "gims", spotifyId: "0SwykdGDI2qV4Km3n05qss", searchName: "GIMS" },
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

async function resolveArtistImageUrl(
  token: string,
  artist: (typeof ARTISTS)[number]
): Promise<string> {
  const detailRes = await fetch(
    `https://api.spotify.com/v1/artists/${encodeURIComponent(artist.spotifyId)}`,
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
    `https://api.spotify.com/v1/search?type=artist&limit=5&q=${encodeURIComponent(artist.searchName)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!searchRes.ok) {
    throw new Error(`${artist.slug}: search HTTP ${searchRes.status}`);
  }

  const searchData = (await searchRes.json()) as {
    artists?: {
      items?: Array<{
        name?: string;
        images?: Array<{ url?: string; width?: number; height?: number }>;
      }>;
    };
  };

  const items = searchData.artists?.items ?? [];
  const match =
    items.find((item) =>
      item.name?.toLowerCase().includes(artist.searchName.toLowerCase())
    ) ?? items[0];

  const best = pickBestImage(match?.images);
  if (!best) throw new Error(`${artist.slug}: pas d'image Spotify`);
  return best;
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

  for (const artist of ARTISTS) {
    const outPath = path.join(OUT_DIR, `${artist.slug}.jpg`);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      console.log(`· ${artist.slug} déjà présent — ignoré`);
      continue;
    }

    const best = await resolveArtistImageUrl(token, artist);

    const imgRes = await fetch(best);
    if (!imgRes.ok) throw new Error(`${artist.slug}: download HTTP ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`✓ ${artist.slug} → ${outPath} (${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
