import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCachedArtistTrendsCommentary,
  setCachedArtistTrendsCommentary,
} from "../artist-trends-commentary-cache";
import type { ArtistTrendsCompactPayload } from "@/lib/dto/artist-trends-ai";

function samplePayload(id: string): ArtistTrendsCompactPayload {
  return {
    meta: {
      period: "month",
      timeFilterMode: "all_time",
      rangeStart: "2024-01-01",
      rangeEnd: "2024-12-31",
      bucketCount: 12,
      selectedArtistCount: 1,
      artistsCapped: false,
      timelineMode: "full",
      maxTimelineBuckets: 24,
    },
    perArtist: [
      {
        artistId: id,
        artistName: "Artist",
        totalListens: 1,
        shareOfSelectionPct: 100,
        firstHalfListens: 1,
        secondHalfListens: 0,
        delta: 0,
        deltaPercent: 0,
        direction: "stable",
        peakBucketDate: "2024-06-01",
        peakBucketLabel: "Jun",
        peakListenCount: 1,
      },
    ],
    timeline: [],
  };
}

describe("artist-trends-commentary-cache", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores and reads commentary for tech mode in memory", async () => {
    const p = samplePayload("artist-cache-1");
    await setCachedArtistTrendsCommentary(p, "cached-tech", "en", false);
    expect(await getCachedArtistTrendsCommentary(p, "en", false)).toBe(
      "cached-tech"
    );
  });

  it("uses separate keys for light vs tech", async () => {
    const p = samplePayload("artist-cache-2");
    await setCachedArtistTrendsCommentary(p, "heavy", "en", false);
    await setCachedArtistTrendsCommentary(p, "light", "en", true);
    expect(await getCachedArtistTrendsCommentary(p, "en", false)).toBe("heavy");
    expect(await getCachedArtistTrendsCommentary(p, "en", true)).toBe("light");
  });

  it("drops expired memory entries", async () => {
    const p = samplePayload("artist-cache-3");
    const t0 = 1_700_000_000_000;
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(t0)
      .mockReturnValueOnce(t0 + 25 * 60 * 60 * 1000);
    await setCachedArtistTrendsCommentary(p, "old", "en", false);
    expect(await getCachedArtistTrendsCommentary(p, "en", false)).toBeNull();
  });
});
