import type { GenreTrendPeriod } from "@/lib/services/listening/listening-stats";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";

export type GenreTrendsTimeFilterMode = "all_time" | "custom_range";

export type GenreTrendsPerGenreMetrics = {
  genre: string;
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

export type GenreTrendsCompactPayload = {
  meta: {
    period: GenreTrendPeriod;
    timeFilterMode: GenreTrendsTimeFilterMode;
    /** ISO date YYYY-MM-DD */
    rangeStart: string;
    /** ISO date YYYY-MM-DD */
    rangeEnd: string;
    bucketCount: number;
    selectedGenreCount: number;
    genresCapped: boolean;
    cappedToTopN?: number;
    timelineMode: "full" | "downsampled";
    timelineStride?: number;
    /** Max buckets included in prompt (safety cap) */
    maxTimelineBuckets: number;
  };
  perGenre: GenreTrendsPerGenreMetrics[];
  /** Sparse listens per bucket for chart genres only; bounded length */
  timeline: Array<{
    date: string;
    formattedDate: string;
    listens: Record<string, number>;
  }>;
};

/**
 * GET /api/ai/genre-trends-commentary
 * Query: `mode=technical` | `light` | omit (`both`) — contrôle quelles variantes sont renvoyées par requête (cache Redis inchangé par mode).
 */
export type GenreTrendsCommentaryApiResponse = {
  commentary: string | null;
  commentaryLight: string | null;
  commentaryCached?: boolean;
  commentaryLightCached?: boolean;
  /** True when Groq AI is off (env, browser toggle, or missing consent). */
  aiUnavailable?: boolean;
  aiUnavailableReason?: AiUnavailableReason;
};
