"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import {
  ArtistsResponseDto,
  ArtistSearchResponse,
  ArtistTrendsChartResponse,
  ArtistTrendsResponseDto,
  type ArtistUserInsightsDto,
} from "@/lib/dto/artist";
import type { ArtistTrendsCommentaryApiResponse } from "@/lib/dto/artist-trends-ai";
import { CACHE_STALE_TIME } from "@/lib/constants/config";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

/**
 * Query keys pour les artistes
 */
export const artistKeys = {
  all: ["artists"] as const,
  stats: (params: { startDate?: string; endDate?: string; userId?: string; limit?: number; offset?: number }) =>
    [...artistKeys.all, "stats", params] as const,
  trends: (params: {
    startDate?: string;
    endDate?: string;
    period?: string;
    topN?: number;
    userId?: string;
  }) => [...artistKeys.all, "trends", params] as const,
  trendsChart: (params: {
    startDate?: string;
    endDate?: string;
    period?: "day" | "week" | "month";
    artistIds?: string[];
    topN?: number;
    userId?: string;
  }) => [...artistKeys.all, "trendsChart", params] as const,
  artistTrendsCommentary: (params?: {
    startDate?: string;
    endDate?: string;
    period?: "day" | "week" | "month";
    artists?: string[];
    userId?: string;
    locale?: string;
    mode?: "technical" | "light" | "both";
  }) => [...artistKeys.all, "artistTrendsCommentary", params] as const,
  search: (q: string, limit?: number) => [...artistKeys.all, "search", q, limit] as const,
  insights: (params: {
    artistId: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }) => [...artistKeys.all, "insights", params] as const,
};

/**
 * Fonction pour récupérer les statistiques des artistes
 */
export async function fetchArtistStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  limit?: number,
  offset?: number
): Promise<ArtistsResponseDto> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);
  if (limit) searchParams.append("limit", limit.toString());
  if (offset != null) searchParams.append("offset", offset.toString());

  const queryString = searchParams.toString();
  const endpoint = `/artists${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<ArtistsResponseDto>(endpoint);
}

/**
 * Agrégés « votre relation avec cet artiste » (titres les plus joués, rythmes, sources).
 */
export async function fetchArtistUserInsights(
  artistId: string,
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<ArtistUserInsightsDto> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);
  const qs = searchParams.toString();
  const path = `/artists/${encodeURIComponent(artistId)}/insights${qs ? `?${qs}` : ""}`;
  return apiClient.get<ArtistUserInsightsDto>(path);
}

export function useArtistUserInsights(
  artistId: string | null,
  startDate?: string,
  endDate?: string,
  userId?: string,
  options?: Omit<
    UseQueryOptions<ArtistUserInsightsDto, Error>,
    "queryKey" | "queryFn" | "staleTime"
  >
) {
  const id = artistId ?? "";
  const { enabled: enabledOverride, ...queryOptions } = options ?? {};

  const queryKey = artistKeys.insights({
    artistId: id,
    startDate,
    endDate,
    userId,
  });

  return useQuery<ArtistUserInsightsDto, Error>({
    queryKey,
    queryFn: () => fetchArtistUserInsights(id, startDate, endDate, userId),
    staleTime: CACHE_STALE_TIME.OVERVIEW,
    enabled: !!artistId && (enabledOverride ?? true),
    ...queryOptions,
  });
}

/**
 * Hook pour récupérer les statistiques des artistes
 */
export function useArtistStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  limit?: number,
  offset?: number,
  options?: Omit<
    UseQueryOptions<ArtistsResponseDto, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const queryKey = artistKeys.stats({ startDate, endDate, userId, limit, offset });

  return useQuery<ArtistsResponseDto, Error>({
    queryKey,
    queryFn: () => fetchArtistStats(startDate, endDate, userId, limit, offset),
    staleTime: CACHE_STALE_TIME.OVERVIEW,
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Fonction pour récupérer les tendances des artistes
 */
async function fetchArtistTrends(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  topN?: number,
  userId?: string
): Promise<ArtistTrendsResponseDto> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (period) searchParams.append("period", period);
  if (topN) searchParams.append("topN", topN.toString());
  if (userId) searchParams.append("userId", userId);

  const queryString = searchParams.toString();
  const endpoint = `/artists/trends${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<ArtistTrendsResponseDto>(endpoint);
}

/**
 * Hook pour récupérer les tendances des artistes
 */
export function useArtistTrends(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  topN?: number,
  userId?: string,
  options?: Omit<
    UseQueryOptions<ArtistTrendsResponseDto, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const queryClient = useQueryClient();
  const queryKey = artistKeys.trends({ startDate, endDate, period, topN, userId });
  
  // Récupérer les données précédentes du cache pour les utiliser comme placeholder
  const previousData = queryClient.getQueryData<ArtistTrendsResponseDto>(queryKey);

  return useQuery<ArtistTrendsResponseDto, Error>({
    queryKey,
    queryFn: () => fetchArtistTrends(startDate, endDate, period, topN, userId),
    staleTime: CACHE_STALE_TIME.TIMELINE,
    placeholderData: previousData,
    enabled: !!startDate && !!endDate,
    ...options,
  });
}

async function fetchArtistTrendsChart(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  artistIds?: string[],
  topN?: number,
  userId?: string,
  locale?: string
): Promise<ArtistTrendsChartResponse> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (period) searchParams.append("period", period);
  if (locale) searchParams.append("locale", locale);
  if (userId) searchParams.append("userId", userId);
  if (topN != null) searchParams.append("topN", String(topN));
  if (artistIds?.length) {
    artistIds.forEach((id) => searchParams.append("artists", id));
  }
  const qs = searchParams.toString();
  return apiClient.get<ArtistTrendsChartResponse>(
    `/artists/trends-chart${qs ? `?${qs}` : ""}`
  );
}

/**
 * Tendances artistes (format pivot) — aligné sur /dashboard/genres/trends.
 */
export function useArtistTrendsChart(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  artistIds?: string[],
  topN?: number,
  userId?: string,
  options?: Omit<
    UseQueryOptions<ArtistTrendsChartResponse, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const locale = useLocale();
  const artistIdsForKey =
    artistIds?.length && artistIds.length > 0
      ? [...artistIds].sort()
      : undefined;
  const queryKey = artistKeys.trendsChart({
    startDate,
    endDate,
    period,
    artistIds: artistIdsForKey,
    topN,
    userId,
  });

  return useQuery<ArtistTrendsChartResponse, Error>({
    queryKey,
    queryFn: () =>
      fetchArtistTrendsChart(
        startDate,
        endDate,
        period,
        artistIds,
        topN,
        userId,
        locale
      ),
    staleTime: CACHE_STALE_TIME.ARTIST_TRENDS_CHART,
    placeholderData: keepPreviousData,
    ...options,
  });
}

export type ArtistTrendsCommentaryMode = "technical" | "light" | "both";

async function fetchArtistTrendsCommentary(
  startDate: string | undefined,
  endDate: string | undefined,
  period: "day" | "week" | "month",
  artistIds: string[],
  locale: string,
  userId: string | undefined,
  mode: ArtistTrendsCommentaryMode
): Promise<ArtistTrendsCommentaryApiResponse> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  searchParams.append("period", period);
  searchParams.append("locale", locale);
  if (userId) searchParams.append("userId", userId);
  if (mode !== "both") searchParams.append("mode", mode);
  artistIds.forEach((id) => searchParams.append("artists", id));
  const qs = searchParams.toString();
  return apiClient.get<ArtistTrendsCommentaryApiResponse>(
    `/ai/artist-trends-commentary?${qs}`
  );
}

export type UseArtistTrendsCommentaryOptions = Omit<
  UseQueryOptions<ArtistTrendsCommentaryApiResponse, Error>,
  "queryKey" | "queryFn" | "staleTime"
> & {
  mode?: ArtistTrendsCommentaryMode;
};

/**
 * Résumé IA pour le graphique des tendances par artiste (mêmes filtres que la page).
 */
export function useArtistTrendsCommentary(
  startDate: string | undefined,
  endDate: string | undefined,
  period: "day" | "week" | "month",
  artistIds: string[],
  userId: string | undefined,
  options?: UseArtistTrendsCommentaryOptions
) {
  const locale = useLocale();
  const sortedIds = [...artistIds].sort();
  const { mode = "both", enabled: enabledOption, ...rest } = options ?? {};
  const blockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  const queryKey = artistKeys.artistTrendsCommentary({
    startDate,
    endDate,
    period,
    artists: sortedIds,
    userId,
    locale,
    mode,
  });

  return useQuery<ArtistTrendsCommentaryApiResponse, Error>({
    queryKey,
    queryFn: () =>
      fetchArtistTrendsCommentary(
        startDate,
        endDate,
        period,
        sortedIds,
        locale,
        userId,
        mode
      ),
    staleTime: CACHE_STALE_TIME.ARTIST_TRENDS_AI,
    ...rest,
    placeholderData: keepPreviousData,
    enabled:
      (enabledOption ?? true) &&
      sortedIds.length > 0 &&
      !blockedByGenreBackfill,
  });
}

const ARTIST_SEARCH_FETCH_LIMIT = 100;

async function fetchArtistSearch(q: string): Promise<ArtistSearchResponse> {
  const searchParams = new URLSearchParams({
    q,
    limit: String(ARTIST_SEARCH_FETCH_LIMIT),
  });
  return apiClient.get<ArtistSearchResponse>(
    `/artists/search?${searchParams.toString()}`
  );
}

/**
 * Recherche d’artistes dans le catalogue (debounce 320 ms intégré).
 */
export function useArtistSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 320);
  return useQuery<ArtistSearchResponse, Error>({
    queryKey: artistKeys.search(debounced, ARTIST_SEARCH_FETCH_LIMIT),
    queryFn: () => fetchArtistSearch(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60 * 1000,
  });
}
