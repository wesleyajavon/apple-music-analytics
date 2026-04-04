/**
 * DTOs for AI Insights feature
 * Input: aggregated analytics only (no raw listening events)
 */

/**
 * Genre distribution item (top N genres with count and percentage)
 */
export interface GenreDistributionItem {
  genre: string;
  count: number;
  percentage: number;
}

/**
 * Listening by time of day (hour 0-23 with listen count)
 */
export interface TimeOfDayItem {
  hour: number;
  listens: number;
}

/**
 * Top artist with genre (for cluster representation)
 */
export interface TopArtistItem {
  artistName: string;
  listenCount: number;
  genre?: string;
}

/**
 * Year-over-year delta (percent change)
 */
export interface YearOverYearDelta {
  metric: string;
  currentValue: number;
  previousValue: number;
  percentChange: number;
}

/**
 * Input payload for POST /api/ai/insights
 * Contains ONLY aggregated analytics - no raw events
 */
export interface AiInsightsInput {
  /** Date range for the analytics */
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;
  };
  /** Top genres with distribution (e.g. top 10) */
  genreDistribution: GenreDistributionItem[];
  /** Listening by hour of day (0-23) */
  listeningByTimeOfDay: TimeOfDayItem[];
  /** Top artists (e.g. top 10-15) with optional genre */
  topArtists: TopArtistItem[];
  /** Year-over-year or period-over-period deltas */
  yearOverYearDeltas?: YearOverYearDelta[];
  /** Optional: peak day/hour from temporal analysis */
  peakDay?: { dayName: string; listens: number };
  peakHour?: { hour: number; listens: number };
}

/**
 * AI-generated insight (single bullet point)
 */
export interface AiInsightItem {
  text: string;
}

/**
 * Response from POST /api/ai/insights
 */
export interface AiInsightsResponse {
  insights: string[]; // 3-5 bullet points
  cached: boolean; // Whether response was served from cache
  /** True when AI is disabled (AI_MASTER_ENABLED / cookie). */
  aiUnavailable?: boolean;
}
