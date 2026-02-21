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
  genreTrends: (params?: {
    startDate?: string;
    endDate?: string;
    period?: "day" | "week" | "month";
    genres?: string[];
    userId?: string;
  }) => [...listeningKeys.all, "genreTrends", params] as const,
  overview: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => [...listeningKeys.all, "overview", params] as const,
  temporalAnalysis: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => [...listeningKeys.all, "temporalAnalysis", params] as const,
} as const;

export const tasteProfileKeys = {
  all: ["ai", "taste-profile"] as const,
  list: (params?: {
    startDate?: string;
    endDate?: string;
    tone?: "analytical" | "casual" | "poetic";
    locale?: string;
  }) => [...tasteProfileKeys.all, params] as const,
} as const;

export const predictionKeys = {
  all: ["predictions"] as const,
  listeningHabit: (params?: { userId?: string; explain?: boolean; locale?: string }) =>
    [...predictionKeys.all, "listening-habit", params] as const,
} as const;

export const tasteEvolutionKeys = {
  all: ["analytics", "taste-evolution"] as const,
  list: (params?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    locale?: string;
  }) => [...tasteEvolutionKeys.all, params] as const,
} as const;
