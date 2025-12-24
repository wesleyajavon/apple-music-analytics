/**
 * Data Transfer Objects (DTOs) for listening data
 * These DTOs provide a clean API surface without exposing Prisma models directly
 */

/**
 * Represents a single listen entry
 */
export interface ListenDto {
  id: string;
  trackTitle: string;
  artistName: string;
  playedAt: string; // ISO 8601 date string
  source: "lastfm" | "apple_music_replay";
}

/**
 * Represents aggregated listening data for a time period
 */
export interface AggregatedListenDto {
  date: string; // ISO 8601 date string (YYYY-MM-DD)
  count: number;
  uniqueTracks: number;
  uniqueArtists: number;
}

/**
 * Represents daily aggregated listening data
 */
export interface DailyListenDto {
  date: string; // YYYY-MM-DD
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
}

/**
 * Represents weekly aggregated listening data
 */
export interface WeeklyListenDto {
  weekStart: string; // YYYY-MM-DD (Monday of the week)
  weekEnd: string; // YYYY-MM-DD (Sunday of the week)
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
  dailyBreakdown: DailyListenDto[];
}

/**
 * Represents monthly aggregated listening data
 */
export interface MonthlyListenDto {
  month: string; // YYYY-MM
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
  dailyBreakdown: DailyListenDto[];
}

/**
 * Query parameters for fetching listens
 */
export interface ListensQueryParams {
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string
  userId?: string;
  limit?: number;
  offset?: number;
  source?: "lastfm" | "apple_music_replay";
}

/**
 * Response wrapper for listens API
 */
export interface ListensResponse {
  data: ListenDto[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Response wrapper for aggregated listens
 */
export interface AggregatedListensResponse {
  data: AggregatedListenDto[];
  period: "day" | "week" | "month";
  startDate: string;
  endDate: string;
}

