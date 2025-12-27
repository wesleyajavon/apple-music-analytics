/**
 * Query keys centralisés pour TanStack Query
 * Permet une meilleure organisation et évite les erreurs de typage
 */

export const listeningKeys = {
  all: ["listening"] as const,
  lists: () => [...listeningKeys.all, "list"] as const,
  list: (filters?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    source?: "lastfm" | "apple_music_replay";
    limit?: number;
    offset?: number;
  }) => [...listeningKeys.lists(), filters] as const,
  aggregated: (params?: {
    startDate?: string;
    endDate?: string;
    period?: "day" | "week" | "month";
    userId?: string;
  }) => [...listeningKeys.all, "aggregated", params] as const,
  timeline: (params?: {
    startDate?: string;
    endDate?: string;
    period?: "day" | "week" | "month";
    userId?: string;
  }) => [...listeningKeys.all, "timeline", params] as const,
  genres: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => [...listeningKeys.all, "genres", params] as const,
  overview: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => [...listeningKeys.all, "overview", params] as const,
} as const;

export const networkKeys = {
  all: ["network"] as const,
  graph: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    minPlayCount?: number;
    maxArtists?: number;
    proximityWindowMinutes?: number;
    minEdgeWeight?: number;
  }) => [...networkKeys.all, "graph", params] as const,
} as const;

