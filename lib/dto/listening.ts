/**
 * Data Transfer Objects (DTOs) for listening data
 * These DTOs provide a clean API surface without exposing Prisma models directly
 */

// Re-export Zod schemas and validation functions for convenience
export {
  ListenDtoSchema,
  AggregatedListenDtoSchema,
  DailyListenDtoSchema,
  WeeklyListenDtoSchema,
  MonthlyListenDtoSchema,
  OverviewStatsDtoSchema,
  ListensQueryParamsSchema,
  ListensResponseSchema,
  AggregatedListensResponseSchema,
  validateDto,
  safeValidateDto,
} from './schemas';

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

/**
 * Statistics for overview page
 */
export interface OverviewStatsDto {
  totalListens: number;
  uniqueArtists: number;
  uniqueTracks: number;
  totalPlayTime: number; // Total play time in seconds
}

/**
 * Represents temporal analysis data (day of week and hour of day aggregations)
 */
export interface TemporalAnalysisDto {
  byDayOfWeek: DayOfWeekAggregationDto[];
  byHourOfDay: HourOfDayAggregationDto[];
  peakDay: DayOfWeekAggregationDto | null;
  peakHour: HourOfDayAggregationDto | null;
}

/**
 * Aggregation by day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export interface DayOfWeekAggregationDto {
  dayOfWeek: number; // 0-6 (0 = dimanche, 1 = lundi, etc.)
  dayName: string; // Nom du jour en français
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
}/**
 * Aggregation by hour of day (0-23)
 */
export interface HourOfDayAggregationDto {
  hour: number; // 0-23
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
}/**
 * Represents a top artist with listen count
 */
export interface TopArtistDto {
  artistId: string;
  artistName: string;
  listenCount: number;
}