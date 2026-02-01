/**
 * Configuration constants for the application
 * Centralizes magic numbers and hardcoded values for better maintainability
 */

/**
 * Shared Recharts tooltip styles
 * Explicit colors for readability in both light and dark mode
 */
export const CHART_TOOLTIP_STYLES = {
  contentStyle: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    padding: "12px 16px",
  },
  labelStyle: {
    color: "#111827",
    fontWeight: 600,
    marginBottom: "6px",
  },
  itemStyle: {
    color: "#374151",
    fontSize: "13px",
  },
} as const;

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
  GENRE_TRENDS: 2 * 60 * 1000, // 2 minutes - same as timeline
  OVERVIEW: 5 * 60 * 1000, // 5 minutes - overview statistics change infrequently
} as const;




