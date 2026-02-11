"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import type { TasteEvolutionResponse } from "@/lib/dto/taste-evolution";
import { tasteEvolutionKeys } from "./query-keys";

const TASTE_EVOLUTION_STALE_TIME = 5 * 60 * 1000; // 5 minutes

async function fetchTasteEvolution(
  startDate: string,
  endDate: string,
  locale: string,
  userId?: string
): Promise<TasteEvolutionResponse> {
  const params: Record<string, string> = {
    startDate,
    endDate,
    locale,
  };
  if (userId) params.userId = userId;
  const query = new URLSearchParams(params).toString();
  return apiClient.get<TasteEvolutionResponse>(
    `/analytics/taste-evolution?${query}`
  );
}

/**
 * Hook to fetch week-to-week taste evolution trends.
 * Passes current locale for localized AI commentary.
 */
export function useTasteEvolution(
  startDate: string | undefined,
  endDate: string | undefined,
  userId?: string,
  options?: Omit<
    UseQueryOptions<TasteEvolutionResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  const locale = useLocale();
  const hasValidRange = !!startDate && !!endDate;

  return useQuery<TasteEvolutionResponse, Error>({
    queryKey: tasteEvolutionKeys.list({ startDate, endDate, userId, locale }),
    queryFn: () => fetchTasteEvolution(startDate!, endDate!, locale, userId),
    enabled: hasValidRange,
    staleTime: TASTE_EVOLUTION_STALE_TIME,
    ...options,
  });
}
