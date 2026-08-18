import { describe, it, expect } from "vitest";
import {
  buildOverviewPrimaryInsight,
  buildOverviewStatsChanges,
  calculateChange,
  formatListeningTime,
  getPreviousPeriod,
} from "@/lib/utils/overview-page";
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";

describe("calculateChange", () => {
  it("returns null when previous is 0", () => {
    expect(calculateChange(10, 0)).toBeNull();
  });

  it("returns a positive change", () => {
    const change = calculateChange(150, 100);
    expect(change).toEqual({
      value: 50,
      displayValue: "50.0",
      isPositive: true,
    });
  });

  it("caps extreme percentages", () => {
    const change = calculateChange(20000, 1);
    expect(change?.displayValue).toBe(">999");
    expect(change?.value).toBe(999);
    expect(change?.isPositive).toBe(true);
  });
});

describe("getPreviousPeriod", () => {
  it("returns a window of the same length ending the day before start", () => {
    expect(getPreviousPeriod("2024-02-11", "2024-02-20")).toEqual({
      prevStartDate: "2024-02-01",
      prevEndDate: "2024-02-10",
    });
  });

  it("returns null without both dates", () => {
    expect(getPreviousPeriod("2024-02-11")).toBeNull();
  });
});

describe("formatListeningTime", () => {
  it("formats hours and minutes", () => {
    expect(formatListeningTime(7380, "n/a")).toBe("2h 3min");
  });

  it("returns the fallback for empty time", () => {
    expect(formatListeningTime(0, "n/a")).toBe("n/a");
  });
});

describe("buildOverviewPrimaryInsight", () => {
  const labels = {
    topTrackEyebrow: "Top track",
    topTrackBody: "By Artist",
    topArtistEyebrow: "Top artist",
    topArtistBody: "Most streamed artist",
    libraryEyebrow: "This period",
    libraryBody: "Volume and variety",
    listens: "streams",
    totalListens: "Total streams",
  };

  const data = {
    totalListens: 42,
    uniqueArtists: 3,
    uniqueTracks: 8,
    totalPlayTime: 1000,
    topArtists: [],
  } as unknown as OverviewStatsWithTopArtists;

  it("prefers the top track", () => {
    const insight = buildOverviewPrimaryInsight({
      pageTitle: "Your music",
      locale: "en-US",
      data,
      topTrack: {
        trackId: "1",
        name: "Song",
        artistName: "Artist",
        count: 12,
        percentage: 20,
      },
      labels,
    });
    expect(insight.eyebrow).toBe("Top track");
    expect(insight.title).toBe("Song");
    expect(insight.metricLabel).toBe("streams");
  });
});

describe("buildOverviewStatsChanges", () => {
  it("returns null without a previous period", () => {
    expect(buildOverviewStatsChanges(null, undefined, undefined)).toBeNull();
  });
});
