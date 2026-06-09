import { describe, expect, it } from "vitest";
import { parseOnboardingImportJsonBody } from "@/lib/services/listening/onboarding-import-json-body";
import { parseSpotifyStreamingHistoryAudioJson } from "@/lib/services/listening/parse-spotify-streaming-history-json";
import { parseApplePlayHistoryDailyTracksCsv } from "@/lib/services/listening/parse-apple-play-history-daily-csv";
import { parseAppleTrackPlayHistoryCsv } from "@/lib/services/listening/parse-apple-track-play-history-csv";
import { ONBOARDING_IMPORT_MAX_PARSED_ROWS } from "@/lib/services/listening/onboarding-import-constants";

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

  it("parses StreamingHistory_music_*.json style (camelCase, endTime)", () => {
    const json = JSON.stringify([
      {
        endTime: "2025-04-16 05:27",
        artistName: "Mac Gayver",
        trackName: "Loketo",
        msPlayed: 170_481,
      },
      {
        endTime: "2025-04-16 05:30",
        artistName: "Franglish",
        trackName: "Lego",
        msPlayed: 460,
      },
    ]);
    const rows = parseSpotifyStreamingHistoryAudioJson(json);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.trackName).toBe("Loketo");
    expect(rows[0]!.artistName).toBe("Mac Gayver");
  });

  it("returns empty for invalid JSON", () => {
    expect(parseSpotifyStreamingHistoryAudioJson("not json")).toEqual([]);
  });
});

describe("parseAppleTrackPlayHistoryCsv", () => {
  it("parses track play history rows and dedupes user-initiated duplicates", () => {
    const csv = [
      '"Track Name","Last Played Date","Is User Initiated"',
      '"Artist A - Song B",1734735040257,false',
      '"Artist A - Song B",1734735040257,true',
      '"Artist C - Track D",1627703651239,false',
    ].join("\n");
    const rows = parseAppleTrackPlayHistoryCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.artistName).toBe("Artist A");
    expect(rows[0]!.trackName).toBe("Song B");
    expect(rows[0]!.playedAt.getTime()).toBe(1734735040257);
    expect(rows[1]!.artistName).toBe("Artist C");
    expect(rows[1]!.trackName).toBe("Track D");
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

describe("parseOnboardingImportJsonBody", () => {
  it("keeps the full onboarding import limit aligned with large Apple exports", () => {
    expect(ONBOARDING_IMPORT_MAX_PARSED_ROWS).toBe(250_000);
  });

  it("parses rows and batch metadata", () => {
    const parsed = parseOnboardingImportJsonBody({
      provider: "spotify",
      batch: { index: 1, count: 3 },
      sessionTotalImported: 12,
      rows: [
        {
          artistName: " A ",
          trackName: " T ",
          playedAt: "2020-01-02T03:04:05.000Z",
        },
      ],
    });
    expect(parsed.provider).toBe("spotify");
    expect(parsed.batch).toEqual({ index: 1, count: 3 });
    expect(parsed.sessionTotalImported).toBe(12);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]!.artistName).toBe("A");
    expect(parsed.rows[0]!.trackName).toBe("T");
    expect(parsed.rows[0]!.playedAt.toISOString()).toBe("2020-01-02T03:04:05.000Z");
  });
});
