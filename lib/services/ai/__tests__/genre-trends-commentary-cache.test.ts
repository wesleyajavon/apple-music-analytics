import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCachedGenreTrendsCommentary,
  setCachedGenreTrendsCommentary,
} from "../genre-trends-commentary-cache";
import type { GenreTrendsCompactPayload } from "@/lib/dto/genre-trends-ai";

function samplePayload(id: string): GenreTrendsCompactPayload {
  return {
    meta: {
      period: "month",
      timeFilterMode: "all_time",
      rangeStart: "2024-01-01",
      rangeEnd: "2024-12-31",
      bucketCount: 12,
      selectedGenreCount: 1,
      genresCapped: false,
      timelineMode: "full",
      maxTimelineBuckets: 24,
    },
    perGenre: [
      {
        genre: `Genre ${id}`,
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

describe("genre-trends-commentary-cache", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores and reads commentary in memory", async () => {
    const p = samplePayload("g1");
    await setCachedGenreTrendsCommentary(p, "hello-genre", "fr", false);
    expect(await getCachedGenreTrendsCommentary(p, "fr", false)).toBe(
      "hello-genre"
    );
  });

  it("separates locales in the cache key", async () => {
    const p = samplePayload("g2");
    await setCachedGenreTrendsCommentary(p, "only-fr", "fr", false);
    expect(await getCachedGenreTrendsCommentary(p, "en", false)).toBeNull();
  });

  it("expires memory entries after TTL", async () => {
    const p = samplePayload("g3");
    const t0 = 1_700_000_000_000;
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(t0)
      .mockReturnValueOnce(t0 + 25 * 60 * 60 * 1000);
    await setCachedGenreTrendsCommentary(p, "stale", "en", true);
    expect(await getCachedGenreTrendsCommentary(p, "en", true)).toBeNull();
  });
});
