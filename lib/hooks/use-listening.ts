"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  ListensResponse,
  AggregatedListensResponse,
  ListensQueryParams,
  ListenDto,
  AggregatedListenDto,
} from "@/lib/dto/listening";
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
  userId?: string
): Promise<TimelineDataPoint[]> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
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
  userId?: string,
  options?: Omit<
    UseQueryOptions<TimelineDataPoint[], Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<TimelineDataPoint[], Error>({
    queryKey: listeningKeys.timeline({ startDate, endDate, userId }),
    queryFn: () => fetchTimeline(startDate, endDate, userId),
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

