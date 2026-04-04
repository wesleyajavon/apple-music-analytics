import type { GenreTrendPeriod } from "@/lib/services/listening/listening-stats";

export type ArtistTrendsTimeFilterMode = "all_time" | "custom_range";

export type ArtistTrendsPerArtistMetrics = {
  artistId: string;
  artistName: string;
  totalListens: number;
  shareOfSelectionPct: number;
  firstHalfListens: number;
  secondHalfListens: number;
  delta: number;
  deltaPercent: number;
  direction: "up" | "down" | "stable";
  peakBucketDate: string;
  peakBucketLabel: string;
  peakListenCount: number;
};

export type ArtistTrendsCompactPayload = {
  meta: {
    period: GenreTrendPeriod;
    timeFilterMode: ArtistTrendsTimeFilterMode;
    rangeStart: string;
    rangeEnd: string;
    bucketCount: number;
    selectedArtistCount: number;
    artistsCapped: boolean;
    cappedToTopN?: number;
    timelineMode: "full" | "downsampled";
    timelineStride?: number;
    maxTimelineBuckets: number;
  };
  perArtist: ArtistTrendsPerArtistMetrics[];
  timeline: Array<{
    date: string;
    formattedDate: string;
    /** Display keys (artist names; disambiguated if duplicate names). */
    listens: Record<string, number>;
  }>;
};

/**
 * GET /api/ai/artist-trends-commentary
 * Query: `mode=technical` | `light` | omit (`both`).
 */
export type ArtistTrendsCommentaryApiResponse = {
  commentary: string | null;
  commentaryLight: string | null;
  commentaryCached?: boolean;
  commentaryLightCached?: boolean;
  aiUnavailable?: boolean;
};
