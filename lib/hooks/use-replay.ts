"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ReplayYearlySummaryDto } from "@/lib/dto/replay";

/**
 * Query keys for Replay queries
 */
export const replayKeys = {
  all: ["replay"] as const,
  summaries: (userId?: string) => [...replayKeys.all, "summaries", userId] as const,
};

/**
 * Fetch all Replay yearly summaries
 */
async function fetchReplaySummaries(
  userId?: string
): Promise<ReplayYearlySummaryDto[]> {
  const searchParams = new URLSearchParams();
  if (userId) searchParams.append("userId", userId);

  const queryString = searchParams.toString();
  const endpoint = `/replay${queryString ? `?${queryString}` : ""}`;

  return apiClient.get<ReplayYearlySummaryDto[]>(endpoint);
}

/**
 * Hook pour récupérer toutes les années Replay disponibles
 */
export function useReplaySummaries(
  userId?: string,
  options?: Omit<
    UseQueryOptions<ReplayYearlySummaryDto[], Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<ReplayYearlySummaryDto[], Error>({
    queryKey: replayKeys.summaries(userId),
    queryFn: () => fetchReplaySummaries(userId),
    ...options,
  });
}


