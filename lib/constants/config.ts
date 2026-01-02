/**
 * Configuration constants for the application
 * Centralizes magic numbers and hardcoded values for better maintainability
 */

/**
 * Default proximity window in minutes for artist network graph
 * Used to determine if two artists were listened to close in time
 */
export const DEFAULT_PROXIMITY_WINDOW_MINUTES = 30;

/**
 * Cache stale time configuration for React Query
 * Defines how long data is considered fresh before refetching
 */
export const CACHE_STALE_TIME = {
  TIMELINE: 2 * 60 * 1000, // 2 minutes - data depends on filters but relatively stable
  GENRES: 5 * 60 * 1000,   // 5 minutes - genre distribution changes infrequently
  OVERVIEW: 5 * 60 * 1000, // 5 minutes - overview statistics change infrequently
} as const;


