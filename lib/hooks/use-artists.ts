"use client";

import { useQuery, UseQueryOptions, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  ArtistsResponseDto,
  ArtistTrendsResponseDto,
} from "@/lib/dto/artist";
import { CACHE_STALE_TIME } from "@/lib/constants/config";

/**
 * Query keys pour les artistes
 */
export const artistKeys = {
  all: ["artists"] as const,
  stats: (params: { startDate?: string; endDate?: string; userId?: string; limit?: number }) =>
    [...artistKeys.all, "stats", params] as const,
  trends: (params: {
    startDate?: string;
    endDate?: string;
    period?: string;
    topN?: number;
    userId?: string;
  }) => [...artistKeys.all, "trends", params] as const,
};

/**
 * Fonction pour récupérer les statistiques des artistes
 */
async function fetchArtistStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  limit?: number
): Promise<ArtistsResponseDto> {
  const searchParams = new URLSearchParams();
  
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);
  if (limit) searchParams.append("limit", limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/artists${queryString ? `?${queryString}` : ""}`;
  
  return apiClient.get<ArtistsResponseDto>(endpoint);
}

/**
 * Hook pour récupérer les statistiques des artistes
 */
export function useArtistStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  limit?: number,
  options?: Omit<
    UseQueryOptions<ArtistsResponseDto, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const queryClient = useQueryClient();
  const queryKey = artistKeys.stats({ startDate, endDate, userId, limit });
  
  // Récupérer les données précédentes du cache pour les utiliser comme placeholder
  const previousData = queryClient.getQueryData<ArtistsResponseDto>(queryKey);

  return useQuery<ArtistsResponseDto, Error>({
    queryKey,
    queryFn: () => fetchArtistStats(startDate, endDate, userId, limit),
    staleTime: CACHE_STALE_TIME.OVERVIEW,
    placeholderData: previousData,
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
