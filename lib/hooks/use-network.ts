"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  ArtistNetworkGraph,
  ArtistNetworkQueryParams,
} from "@/lib/dto/artist-network";
import { networkKeys } from "./query-keys";

/**
 * Fonction pour récupérer les données du réseau d'artistes
 */
async function fetchArtistNetwork(
  params?: ArtistNetworkQueryParams
): Promise<ArtistNetworkGraph> {
  const searchParams = new URLSearchParams();

  if (params?.startDate) searchParams.append("startDate", params.startDate);
  if (params?.endDate) searchParams.append("endDate", params.endDate);
  if (params?.userId) searchParams.append("userId", params.userId);
  if (params?.minPlayCount)
    searchParams.append("minPlayCount", params.minPlayCount.toString());
  if (params?.maxArtists)
    searchParams.append("maxArtists", params.maxArtists.toString());
  if (params?.proximityWindowMinutes)
    searchParams.append(
      "proximityWindowMinutes",
      params.proximityWindowMinutes.toString()
    );
  if (params?.minEdgeWeight)
    searchParams.append("minEdgeWeight", params.minEdgeWeight.toString());

  const queryString = searchParams.toString();
  const endpoint = `/network${queryString ? `?${queryString}` : ""}`;

  return apiClient.get<ArtistNetworkGraph>(endpoint);
}

/**
 * Hook pour récupérer les données du réseau d'artistes
 */
export function useArtistNetwork(
  params?: ArtistNetworkQueryParams,
  options?: Omit<
    UseQueryOptions<ArtistNetworkGraph, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<ArtistNetworkGraph, Error>({
    queryKey: networkKeys.graph(params),
    queryFn: () => fetchArtistNetwork(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}




