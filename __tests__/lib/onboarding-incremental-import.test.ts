import { describe, expect, it } from "vitest";
import { filterAppleDailyTracksCsvAfterDate } from "@/lib/services/listening/filter-apple-daily-tracks-csv-after-date";
import { filterNormalizedListensAfterCursor } from "@/lib/services/listening/filter-normalized-listens-after-cursor";
import { playedAtToDateKey } from "@/lib/services/listening/onboarding-import-cursor-utils";
import { parseOnboardingImportMode } from "@/lib/services/listening/onboarding-import-mode";
import {
  onboardingImportSourcesForProvider,
  ONBOARDING_APPLE_IMPORT_SOURCES,
} from "@/lib/services/listening/onboarding-import-cursor-utils";

describe("onboardingImportSourcesForProvider", () => {
  it("includes legacy lastfm for Apple detection", () => {
    expect(ONBOARDING_APPLE_IMPORT_SOURCES).toContain("lastfm");
    expect(onboardingImportSourcesForProvider("apple")).toContain("lastfm");
    expect(onboardingImportSourcesForProvider("apple")).toContain("apple_music_export");
  });

  it("scopes Spotify to export and web api sources", () => {
    expect(onboardingImportSourcesForProvider("spotify")).toEqual([
      "spotify_export",
      "spotify_web_api",
    ]);
  });
});

describe("parseOnboardingImportMode", () => {
  it("defaults to full", () => {
    expect(parseOnboardingImportMode(undefined)).toBe("full");
    expect(parseOnboardingImportMode("invalid")).toBe("full");
  });

  it("accepts incremental", () => {
    expect(parseOnboardingImportMode("incremental")).toBe("incremental");
  });
});

describe("filterAppleDailyTracksCsvAfterDate", () => {
  const csv = [
    "Country,Store,?,Date Played,Hours,?,?,?,Play Count,?,?,?,Track Description",
    'US,US,ignored,20240110,"14",x,x,x,1,x,x,x,"Artist A - Old"',
    'US,US,ignored,20240115,"14",x,x,x,1,x,x,x,"Artist B - Mid"',
    'US,US,ignored,20240120,"14",x,x,x,1,x,x,x,"Artist C - New"',
  ].join("\n");

  it("keeps rows on and after minDateKey when inclusive", () => {
    const { filteredCsv, keptLines, skippedLines } = filterAppleDailyTracksCsvAfterDate(
      csv,
      "20240115",
      true
    );
    expect(keptLines).toBe(2);
    expect(skippedLines).toBe(1);
    expect(filteredCsv).toContain("Artist B - Mid");
    expect(filteredCsv).toContain("Artist C - New");
    expect(filteredCsv).not.toContain("Artist A - Old");
  });
});

describe("filterNormalizedListensAfterCursor", () => {
  it("drops rows at or before cursor minus margin", () => {
    const cursor = new Date("2024-06-01T12:00:00.000Z");
    const rows = [
      {
        artistName: "A",
        trackName: "Old",
        playedAt: new Date("2024-06-01T11:00:00.000Z"),
      },
      {
        artistName: "B",
        trackName: "New",
        playedAt: new Date("2024-06-01T12:30:00.000Z"),
      },
    ];
    const { rows: kept, skipped } = filterNormalizedListensAfterCursor(rows, cursor);
    expect(skipped).toBe(1);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.trackName).toBe("New");
  });
});

describe("playedAtToDateKey", () => {
  it("formats UTC date as YYYYMMDD", () => {
    expect(playedAtToDateKey(new Date("2024-01-15T23:59:59.000Z"))).toBe("20240115");
  });
});
