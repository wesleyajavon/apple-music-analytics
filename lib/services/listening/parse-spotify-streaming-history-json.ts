import type { NormalizedListenInput } from "./onboarding-import-types";

/** Aligné sur l’export « Extended streaming history » (fichiers Streaming_History_Audio_*.json). */
const MIN_MS_PLAYED = 30_000;

type SpotifyHistoryRow = {
  ts?: string;
  endTime?: string;
  ms_played?: number;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
};

function parseSpotifyTimestamp(row: SpotifyHistoryRow): Date | null {
  if (row.ts) {
    const d = new Date(row.ts);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (row.endTime) {
    const m = row.endTime.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})/);
    if (m) {
      return new Date(
        Date.UTC(
          Number(m[1]),
          Number(m[2]) - 1,
          Number(m[3]),
          Number(m[4]),
          Number(m[5]),
          0,
          0
        )
      );
    }
  }
  return null;
}

/**
 * Parse le contenu JSON d’un fichier Streaming_History_Audio_*.json.
 */
export function parseSpotifyStreamingHistoryAudioJson(
  jsonText: string
): NormalizedListenInput[] {
  let arr: unknown;
  try {
    arr = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const out: NormalizedListenInput[] = [];
  for (const item of arr) {
    const row = item as SpotifyHistoryRow;
    const ms = row.ms_played ?? 0;
    if (ms < MIN_MS_PLAYED) continue;

    const track = row.master_metadata_track_name?.trim();
    const artist = row.master_metadata_album_artist_name?.trim();
    if (!track || !artist) continue;

    const playedAt = parseSpotifyTimestamp(row);
    if (!playedAt || Number.isNaN(playedAt.getTime())) continue;

    out.push({ artistName: artist, trackName: track, playedAt });
  }
  return out;
}
