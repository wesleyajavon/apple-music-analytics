"use client";

import { useQuery, UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import {
  ListensResponse,
  AggregatedListensResponse,
  ListensQueryParams,
  ListenDto,
  AggregatedListenDto,
  OverviewStatsDto,
  TemporalAnalysisDto,
  TopArtistDto,
} from "@/lib/dto/listening";
import {
  GenreDistributionResponse,
  GenreTrendsResponse,
} from "@/lib/dto/genres";
import { listeningKeys } from "./query-keys";
import { CACHE_STALE_TIME } from "@/lib/constants/config";

/**
 * Type pour les statistiques d'overview avec les artistes les plus écoutés
 */
export type OverviewStatsWithTopArtists = OverviewStatsDto & {
  topArtists: TopArtistDto[];
};

/**
 * Type pour les données de timeline (format simplifié pour les graphiques)
 */
export interface TimelineDataPoint {
  date: string;
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
}

/**
 * Fonction pour récupérer les écoutes
 */
async function fetchListens(
  params?: ListensQueryParams
): Promise<ListensResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.startDate) searchParams.append("startDate", params.startDate);
  if (params?.endDate) searchParams.append("endDate", params.endDate);
  if (params?.userId) searchParams.append("userId", params.userId);
  if (params?.source) searchParams.append("source", params.source);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const queryString = searchParams.toString();
  const endpoint = `/listens${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<ListensResponse>(endpoint);
}

/**
 * Fonction pour récupérer les données agrégées
 */
async function fetchAggregatedListens(
  startDate: string,
  endDate: string,
  period: "day" | "week" | "month",
  userId?: string
): Promise<AggregatedListensResponse> {
  const searchParams = new URLSearchParams({
    startDate,
    endDate,
    aggregate: period,
  });
  
  if (userId) searchParams.append("userId", userId);

  return apiClient.get<AggregatedListensResponse>(
    `/listens?${searchParams.toString()}`
  );
}

/**
 * Fonction pour récupérer les données de timeline
 */
async function fetchTimeline(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  userId?: string
): Promise<TimelineDataPoint[]> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (period) searchParams.append("period", period);
  if (userId) searchParams.append("userId", userId);

  const queryString = searchParams.toString();
  const endpoint = `/timeline${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<TimelineDataPoint[]>(endpoint);
}

/**
 * Hook pour récupérer les écoutes avec pagination et filtres
 */
export function useListens(
  params?: ListensQueryParams,
  options?: Omit<
    UseQueryOptions<ListensResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<ListensResponse, Error>({
    queryKey: listeningKeys.list(params),
    queryFn: () => fetchListens(params),
    ...options,
  });
}

/**
 * Hook pour récupérer les données agrégées par période
 */
export function useAggregatedListens(
  startDate: string,
  endDate: string,
  period: "day" | "week" | "month",
  userId?: string,
  options?: Omit<
    UseQueryOptions<AggregatedListensResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<AggregatedListensResponse, Error>({
    queryKey: listeningKeys.aggregated({ startDate, endDate, period, userId }),
    queryFn: () => fetchAggregatedListens(startDate, endDate, period, userId),
    enabled: !!startDate && !!endDate && !!period,
    ...options,
  });
}

/**
 * Helper pour trouver les données les plus récentes dans le cache pour une clé de requête similaire
 */
function findLatestCachedData<T>(
  queryClient: ReturnType<typeof useQueryClient>,
  baseKey: readonly unknown[]
): T | undefined {
  // Chercher toutes les requêtes qui commencent par la même base
  // Par exemple, pour ["listening", "timeline", {...}], on cherche ["listening", "timeline"]
  const baseKeyWithoutParams = baseKey.slice(0, -1);
  const queries = queryClient.getQueriesData<T>({
    queryKey: baseKeyWithoutParams,
    exact: false,
  });

  // Retourner les données de la première requête trouvée (la plus récente)
  // Les requêtes sont triées par ordre de dernière utilisation
  if (queries.length > 0) {
    return queries[0][1];
  }
  return undefined;
}

/**
 * Hook pour récupérer les données de timeline (optimisé pour les graphiques)
 * Utilise placeholderData pour les optimistic updates lors des changements de filtres
 */
export function useTimeline(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  userId?: string,
  options?: Omit<
    UseQueryOptions<TimelineDataPoint[], Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const queryClient = useQueryClient();
  const queryKey = listeningKeys.timeline({ startDate, endDate, period, userId });
  
  // Récupérer les données précédentes du cache pour les utiliser comme placeholder
  // Cherche dans toutes les requêtes timeline pour trouver des données similaires
  const previousData = findLatestCachedData<TimelineDataPoint[]>(
    queryClient,
    queryKey
  );

  return useQuery<TimelineDataPoint[], Error>({
    queryKey,
    queryFn: () => fetchTimeline(startDate, endDate, period, userId),
    staleTime: CACHE_STALE_TIME.TIMELINE,
    placeholderData: previousData,
    ...options,
  });
}

/**
 * Hook pour récupérer une seule écoute par ID
 * Note: Nécessite une route API /api/listens/:id si vous voulez l'implémenter
 */
export function useListen(
  id: string,
  options?: Omit<UseQueryOptions<ListenDto, Error>, "queryKey" | "queryFn">
) {
  return useQuery<ListenDto, Error>({
    queryKey: [...listeningKeys.all, "detail", id],
    queryFn: async () => {
      return apiClient.get<ListenDto>(`/listens/${id}`);
    },
    enabled: !!id,
    ...options,
  });
}

/**
 * Fonction pour récupérer la distribution des genres
 */
async function fetchGenreDistribution(
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<GenreDistributionResponse> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);

  const queryString = searchParams.toString();
  const endpoint = `/genres${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<GenreDistributionResponse>(endpoint);
}

/**
 * Hook pour récupérer la distribution des genres
 * Utilise placeholderData pour les optimistic updates lors des changements de filtres
 */
export function useGenres(
  startDate?: string,
  endDate?: string,
  userId?: string,
  options?: Omit<
    UseQueryOptions<GenreDistributionResponse, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const queryClient = useQueryClient();
  const queryKey = listeningKeys.genres({ startDate, endDate, userId });
  
  // Récupérer les données précédentes du cache pour les utiliser comme placeholder
  const previousData = findLatestCachedData<GenreDistributionResponse>(
    queryClient,
    queryKey
  );

  return useQuery<GenreDistributionResponse, Error>({
    queryKey,
    queryFn: () => fetchGenreDistribution(startDate, endDate, userId),
    staleTime: CACHE_STALE_TIME.GENRES,
    placeholderData: previousData,
    ...options,
  });
}

/**
 * Récupère les tendances de genres dans le temps
 */
async function fetchGenreTrends(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  genres?: string[],
  userId?: string,
  locale?: string
): Promise<GenreTrendsResponse> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (period) searchParams.append("period", period);
  if (locale) searchParams.append("locale", locale);
  if (userId) searchParams.append("userId", userId);
  if (genres?.length) {
    genres.forEach((g) => searchParams.append("genres", g));
  }
  const qs = searchParams.toString();
  return apiClient.get<GenreTrendsResponse>(
    `/genres/trends${qs ? `?${qs}` : ""}`
  );
}

/**
 * Hook pour récupérer les tendances de genres dans le temps
 * Utilise placeholderData pour les optimistic updates lors des changements de filtres
 */
export function useGenreTrends(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  genres?: string[],
  userId?: string,
  options?: Omit<
    UseQueryOptions<GenreTrendsResponse, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const queryKey = listeningKeys.genreTrends({
    startDate,
    endDate,
    period,
    genres,
    userId,
  });

  // Récupérer les données précédentes du cache pour les utiliser comme placeholder
  const previousData = findLatestCachedData<GenreTrendsResponse>(
    queryClient,
    queryKey
  );

  return useQuery<GenreTrendsResponse, Error>({
    queryKey,
    queryFn: () =>
      fetchGenreTrends(startDate, endDate, period, genres, userId, locale),
    staleTime: CACHE_STALE_TIME.GENRE_TRENDS,
    placeholderData: previousData,
    ...options,
  });
}

/**
 * Fonction pour récupérer les statistiques d'overview
 */
async function fetchOverviewStats(
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<OverviewStatsWithTopArtists> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);

  const queryString = searchParams.toString();
  const endpoint = `/overview${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<OverviewStatsWithTopArtists>(endpoint);
}

/**
 * Hook pour récupérer les statistiques d'overview
 * Pas de placeholderData : éviter d'afficher des données d'un autre filtre (ex. "All" quand on filtre sur 7j)
 */
export function useOverviewStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  options?: Omit<
    UseQueryOptions<OverviewStatsWithTopArtists, Error>,
    "queryKey" | "queryFn" | "staleTime"
  >
) {
  const queryKey = listeningKeys.overview({ startDate, endDate, userId });

  return useQuery<OverviewStatsWithTopArtists, Error>({
    queryKey,
    queryFn: () => fetchOverviewStats(startDate, endDate, userId),
    staleTime: CACHE_STALE_TIME.OVERVIEW,
    ...options,
  });
}

/**
 * Fonction pour récupérer l'analyse temporelle
 */
async function fetchTemporalAnalysis(
  startDate?: string,
  endDate?: string,
  userId?: string
): Promise<TemporalAnalysisDto> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);

  const queryString = searchParams.toString();
  const endpoint = `/temporal-analysis${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<TemporalAnalysisDto>(endpoint);
}

/**
 * Hook pour récupérer l'analyse temporelle avancée
 * Note: Ne pas utiliser placeholderData car cette analyse utilise toutes les données
 * et ne devrait pas être filtrée par date (les filtres sont ignorés)
 */
export function useTemporalAnalysis(
  startDate?: string,
  endDate?: string,
  userId?: string,
  options?: Omit<
    UseQueryOptions<TemporalAnalysisDto, Error>,
    "queryKey" | "queryFn" | "staleTime"
  >
) {
  const queryKey = listeningKeys.temporalAnalysis({ startDate, endDate, userId });

  return useQuery<TemporalAnalysisDto, Error>({
    queryKey,
    queryFn: () => fetchTemporalAnalysis(startDate, endDate, userId),
    staleTime: CACHE_STALE_TIME.TIMELINE, // Utiliser le même staleTime que timeline
    ...options,
  });
}

