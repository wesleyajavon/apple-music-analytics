import type { NormalizedListenInput } from "@/lib/services/listening/onboarding-import-types";

export type SpotifyRecentlyPlayedApiResponse = {
  items?: SpotifyPlayHistoryItem[];
  next?: string | null;
  cursors?: { after?: string; before?: string };
};

export type SpotifyPlayHistoryItem = {
  played_at?: string;
  track?: {
    type?: string;
    name?: string | null;
    artists?: Array<{ name?: string | null }>;
    is_local?: boolean;
  };
};

export function spotifyRecentlyPlayedItemsToNormalized(
  items: SpotifyPlayHistoryItem[]
): NormalizedListenInput[] {
  const out: NormalizedListenInput[] = [];
  for (const item of items) {
    const track = item.track;
    if (!track || track.type === "episode") continue;

    const title = track.name?.trim();
    const artistName = track.artists?.[0]?.name?.trim();
    if (!title || !artistName) continue;

    const playedRaw = item.played_at;
    if (!playedRaw) continue;

    const playedAt = new Date(playedRaw);
    if (Number.isNaN(playedAt.getTime())) continue;

    out.push({ artistName, trackName: title, playedAt });
  }
  return out;
}
