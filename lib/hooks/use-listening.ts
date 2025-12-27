"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  ListensResponse,
  AggregatedListensResponse,
  ListensQueryParams,
  ListenDto,
  AggregatedListenDto,
  OverviewStatsDto,
} from "@/lib/dto/listening";
import { GenreDistributionResponse } from "@/lib/dto/genres";
import { listeningKeys } from "./query-keys";

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
 * Hook pour récupérer les données de timeline (optimisé pour les graphiques)
 */
export function useTimeline(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  userId?: string,
  options?: Omit<
    UseQueryOptions<TimelineDataPoint[], Error>,
    "queryKey" | "queryFn" | "staleTime"
  >
) {
  return useQuery<TimelineDataPoint[], Error>({
    queryKey: listeningKeys.timeline({ startDate, endDate, period, userId }),
    queryFn: () => fetchTimeline(startDate, endDate, period, userId),
    staleTime: 2 * 60 * 1000, // 2 minutes - données dépendantes des filtres mais relativement stables
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
 */
export function useGenres(
  startDate?: string,
  endDate?: string,
  userId?: string,
  options?: Omit<
    UseQueryOptions<GenreDistributionResponse, Error>,
    "queryKey" | "queryFn" | "staleTime"
  >
) {
  return useQuery<GenreDistributionResponse, Error>({
    queryKey: listeningKeys.genres({ startDate, endDate, userId }),
    queryFn: () => fetchGenreDistribution(startDate, endDate, userId),
    staleTime: 5 * 60 * 1000, // 5 minutes - distribution de genres qui change peu
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
): Promise<OverviewStatsDto> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);

  const queryString = searchParams.toString();
  const endpoint = `/overview${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<OverviewStatsDto>(endpoint);
}

/**
 * Hook pour récupérer les statistiques d'overview
 */
export function useOverviewStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  options?: Omit<
    UseQueryOptions<OverviewStatsDto, Error>,
    "queryKey" | "queryFn" | "staleTime"
  >
) {
  return useQuery<OverviewStatsDto, Error>({
    queryKey: listeningKeys.overview({ startDate, endDate, userId }),
    queryFn: () => fetchOverviewStats(startDate, endDate, userId),
    staleTime: 5 * 60 * 1000, // 5 minutes - statistiques qui changent peu
    ...options,
  });
}

