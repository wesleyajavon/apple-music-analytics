import { describe, expect, it } from "vitest";
import { parseSpotifyStreamingHistoryAudioJson } from "@/lib/services/listening/parse-spotify-streaming-history-json";
import { parseApplePlayHistoryDailyTracksCsv } from "@/lib/services/listening/parse-apple-play-history-daily-csv";

describe("parseSpotifyStreamingHistoryAudioJson", () => {
  it("parses valid audio rows with ts and ms_played", () => {
    const json = JSON.stringify([
      {
        ts: "2021-06-15T14:22:01Z",
        ms_played: 120_000,
        master_metadata_track_name: "Song A",
        master_metadata_album_artist_name: "Artist A",
      },
      {
        ts: "2021-06-15T15:00:00Z",
        ms_played: 500,
        master_metadata_track_name: "Too short",
        master_metadata_album_artist_name: "Artist B",
      },
      {
        ts: "2021-06-15T16:00:00Z",
        ms_played: 60_000,
        master_metadata_track_name: null,
        master_metadata_album_artist_name: "Podcast",
      },
    ]);
    const rows = parseSpotifyStreamingHistoryAudioJson(json);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.trackName).toBe("Song A");
    expect(rows[0]!.artistName).toBe("Artist A");
    expect(rows[0]!.playedAt.toISOString()).toContain("2021-06-15T14:22:01");
  });

  it("returns empty for invalid JSON", () => {
    expect(parseSpotifyStreamingHistoryAudioJson("not json")).toEqual([]);
  });
});

describe("parseApplePlayHistoryDailyTracksCsv", () => {
  it("parses a minimal daily play row", () => {
    const csv = [
      "Country,Store,?,Date Played,Hours,?,?,?,Play Count,?,?,?,Track Description",
      'US,US,ignored,20240115,"14",x,x,x,1,x,x,x,"Artist X - Track Y"',
    ].join("\n");
    const rows = parseApplePlayHistoryDailyTracksCsv(csv);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.artistName).toBe("Artist X");
    expect(rows[0]!.trackName).toBe("Track Y");
    expect(rows[0]!.playedAt.getUTCFullYear()).toBe(2024);
    expect(rows[0]!.playedAt.getUTCMonth()).toBe(0);
    expect(rows[0]!.playedAt.getUTCDate()).toBe(15);
  });
});
