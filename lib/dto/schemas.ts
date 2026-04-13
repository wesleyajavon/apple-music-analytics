/**
 * Zod schemas for runtime validation of DTOs
 * Provides type-safe validation at runtime in addition to TypeScript compile-time checks
 */

import { z } from 'zod';
import { LISTEN_RECORD_SOURCES } from '@/lib/constants/listen-source';

const listenSourceEnum = z.enum(LISTEN_RECORD_SOURCES);

/**
 * Schema for ListenDto
 */
export const ListenDtoSchema = z.object({
  id: z.string(),
  trackTitle: z.string(),
  artistName: z.string(),
  playedAt: z.string().datetime(),
  source: listenSourceEnum,
});

/**
 * Schema for AggregatedListenDto
 */
export const AggregatedListenDtoSchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
  uniqueTracks: z.number().int().nonnegative(),
  uniqueArtists: z.number().int().nonnegative(),
});

/**
 * Schema for DailyListenDto
 */
export const DailyListenDtoSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  listens: z.number().int().nonnegative(),
  uniqueTracks: z.number().int().nonnegative(),
  uniqueArtists: z.number().int().nonnegative(),
});

/**
 * Schema for WeeklyListenDto
 */
export const WeeklyListenDtoSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  listens: z.number().int().nonnegative(),
  uniqueTracks: z.number().int().nonnegative(),
  uniqueArtists: z.number().int().nonnegative(),
  dailyBreakdown: z.array(DailyListenDtoSchema),
});

/**
 * Schema for MonthlyListenDto
 */
export const MonthlyListenDtoSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  listens: z.number().int().nonnegative(),
  uniqueTracks: z.number().int().nonnegative(),
  uniqueArtists: z.number().int().nonnegative(),
  dailyBreakdown: z.array(DailyListenDtoSchema),
});

/**
 * Schema for OverviewStatsDto
 */
export const OverviewStatsDtoSchema = z.object({
  totalListens: z.number().int().nonnegative(),
  uniqueArtists: z.number().int().nonnegative(),
  uniqueTracks: z.number().int().nonnegative(),
  totalPlayTime: z.number().int().nonnegative(), // in seconds
});

/**
 * Schema for ListensQueryParams
 */
export const ListensQueryParamsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  source: listenSourceEnum.optional(),
});

/**
 * Schema for ListensResponse
 */
export const ListensResponseSchema = z.object({
  data: z.array(ListenDtoSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

/**
 * Schema for AggregatedListensResponse
 */
export const AggregatedListensResponseSchema = z.object({
  data: z.array(AggregatedListenDtoSchema),
  period: z.enum(['day', 'week', 'month']),
  startDate: z.string(),
  endDate: z.string(),
});

/**
 * Schema for ArtistNode
 */
export const ArtistNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  genre: z.string(),
  genres: z.array(z.string()).optional(),
  playCount: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional(),
  mbid: z.string().optional(),
});

/**
 * Schema for ArtistEdge
 */
export const ArtistEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  weight: z.number().nonnegative(),
  type: z.enum(['genre', 'proximity', 'both']),
  sharedGenres: z.array(z.string()).optional(),
  proximityScore: z.number().nonnegative().optional(),
});

/**
 * Schema for ArtistNetworkGraph
 */
export const ArtistNetworkGraphSchema = z.object({
  nodes: z.array(ArtistNodeSchema),
  edges: z.array(ArtistEdgeSchema),
  metadata: z.object({
    totalArtists: z.number().int().nonnegative(),
    totalConnections: z.number().int().nonnegative(),
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
  }),
});

/**
 * Schema for GenreDistributionDto
 */
export const GenreDistributionDtoSchema = z.object({
  genre: z.string(),
  count: z.number().int().nonnegative(),
  percentage: z.number().nonnegative().max(100),
});

export const GenreSpotlightArtistDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  listenCount: z.number().int().nonnegative(),
});

export const GenreTopArtistsEntrySchema = z.object({
  genre: z.string(),
  artists: z.array(GenreSpotlightArtistDtoSchema),
});

/**
 * Schema for GenreDistributionResponse
 */
export const GenreDistributionResponseSchema = z.object({
  data: z.array(GenreDistributionDtoSchema),
  totalListens: z.number().int().nonnegative(),
  topArtistsForTopGenres: z.array(GenreTopArtistsEntrySchema).optional(),
});

/**
 * Schema for ReplayTopArtistInput
 */
export const ReplayTopArtistInputSchema = z.object({
  name: z.string().min(1),
  playCount: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
});

/**
 * Schema for ReplayTopTrackInput
 */
export const ReplayTopTrackInputSchema = z.object({
  title: z.string().min(1),
  artistName: z.string().min(1),
  playCount: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  duration: z.number().int().nonnegative().optional(),
});

/**
 * Schema for ReplayTopAlbumInput
 */
export const ReplayTopAlbumInputSchema = z.object({
  name: z.string().min(1),
  artistName: z.string().min(1),
  playCount: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
});

/**
 * Schema for ReplayYearlyInput
 */
export const ReplayYearlyInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  totalPlayTime: z.number().int().nonnegative(), // in seconds
  totalPlays: z.number().int().nonnegative(),
  topArtists: z.array(ReplayTopArtistInputSchema),
  topTracks: z.array(ReplayTopTrackInputSchema),
  topAlbums: z.array(ReplayTopAlbumInputSchema),
});

/**
 * Helper function to validate and parse data using a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws ZodError if validation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const listen = validateDto(ListenDtoSchema, rawData);
 *   // listen is now type-safe and validated
 * } catch (error) {
 *   // Handle validation error
 * }
 * ```
 */
export function validateDto<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Helper function to safely validate data using a Zod schema
 * Returns a result object instead of throwing
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and data or error
 * 
 * @example
 * ```typescript
 * const result = safeValidateDto(ListenDtoSchema, rawData);
 * if (result.success) {
 *   // Use result.data
 * } else {
 *   // Handle result.error
 * }
 * ```
 */
export function safeValidateDto<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}



