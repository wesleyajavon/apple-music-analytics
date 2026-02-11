"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { predictionKeys } from "./query-keys";
import type {
  ListeningHabitResponse,
  ListeningHabitPrediction,
} from "@/lib/dto/predictions";

/** Extended response when ?explain=true */
export interface ListeningHabitWithExplanation extends ListeningHabitPrediction {
  aiExplanation?: string;
  fromCache?: boolean;
}

export type ListeningHabitApiResponse =
  | ListeningHabitWithExplanation
  | (Extract<ListeningHabitResponse, { insufficientData: true }> & {
      aiExplanation?: string;
      fromCache?: boolean;
    });

async function fetchListeningHabitPrediction(
  locale: string,
  userId?: string,
  includeExplanation?: boolean
): Promise<ListeningHabitApiResponse> {
  const params = new URLSearchParams();
  params.append("locale", locale);
  if (userId) params.append("userId", userId);
  if (includeExplanation) params.append("explain", "true");

  const qs = params.toString();
  return apiClient.get<ListeningHabitApiResponse>(
    `/predictions/listening-habit?${qs}`
  );
}

/**
 * Hook for "When Will I Listen?" prediction.
 *
 * @param options.includeExplanation - Request AI explanation (requires GROQ_API_KEY)
 * @param options.userId - Optional user filter
 * Passes current locale for localized AI explanation.
 */
export function useListeningHabitPrediction(
  options?: {
    includeExplanation?: boolean;
    userId?: string;
  },
  queryOptions?: Omit<
    UseQueryOptions<ListeningHabitApiResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  const locale = useLocale();
  const { includeExplanation = false, userId } = options ?? {};

  return useQuery<ListeningHabitApiResponse, Error>({
    queryKey: predictionKeys.listeningHabit({
      userId,
      explain: includeExplanation,
      locale,
    }),
    queryFn: () =>
      fetchListeningHabitPrediction(locale, userId, includeExplanation),
    staleTime: 5 * 60 * 1000, // 5 minutes - prediction is per day
    ...queryOptions,
  });
}
