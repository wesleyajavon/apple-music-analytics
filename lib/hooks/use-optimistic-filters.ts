"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { listeningKeys } from "./query-keys";
import { apiClient } from "@/lib/api-client";
import type {
  OverviewStatsDto,
  TemporalAnalysisDto,
} from "@/lib/dto/listening";
import type { TimelineDataPoint } from "./use-listening";
import type { GenreDistributionResponse, GenreTrendsResponse } from "@/lib/dto/genres";

/**
 * Hook pour gérer les optimistic updates lors des changements de filtres
 * Précharge les nouvelles données et met à jour le cache de manière optimiste
 */
export function useOptimisticFilters() {
  const queryClient = useQueryClient();

  /**
   * Précharge les données pour les nouveaux filtres de dates
   * Utilise les données précédentes comme placeholder pour une transition fluide
   */
  const prefetchWithOptimisticUpdate = useCallback(
    async (
      oldStartDate?: string,
      oldEndDate?: string,
      oldPeriod?: "day" | "week" | "month",
      newStartDate?: string,
      newEndDate?: string,
      newPeriod?: "day" | "week" | "month"
    ) => {
      // Ne pas injecter les données de l'ancien filtre dans le cache du nouveau :
      // cela affichait des valeurs incorrectes (ex. 2918 écoutes "All" quand on filtre sur 7j).
      // Le prefetch ci-dessous charge les bonnes données.

      // Précharger les nouvelles données
      const prefetchPromises: Promise<void>[] = [];

      // Précharger overview
      if (newStartDate && newEndDate) {
        prefetchPromises.push(
          queryClient
            .prefetchQuery({
              queryKey: listeningKeys.overview({
                startDate: newStartDate,
                endDate: newEndDate,
              }),
              queryFn: async () => {
                const searchParams = new URLSearchParams();
                searchParams.append("startDate", newStartDate);
                searchParams.append("endDate", newEndDate);
                return apiClient.get<OverviewStatsDto>(
                  `/overview?${searchParams.toString()}`
                );
              },
              staleTime: 5 * 60 * 1000,
            })
            .then(() => {})
        );
      }

      // Précharger timeline
      if (newStartDate && newEndDate && newPeriod) {
        prefetchPromises.push(
          queryClient
            .prefetchQuery({
              queryKey: listeningKeys.timeline({
                startDate: newStartDate,
                endDate: newEndDate,
                period: newPeriod,
              }),
              queryFn: async () => {
                const searchParams = new URLSearchParams();
                searchParams.append("startDate", newStartDate);
                searchParams.append("endDate", newEndDate);
                searchParams.append("period", newPeriod);
                return apiClient.get<TimelineDataPoint[]>(
                  `/timeline?${searchParams.toString()}`
                );
              },
              staleTime: 2 * 60 * 1000,
            })
            .then(() => {})
        );
      }

      // Précharger genres
      if (newStartDate && newEndDate) {
        prefetchPromises.push(
          queryClient
            .prefetchQuery({
              queryKey: listeningKeys.genres({
                startDate: newStartDate,
                endDate: newEndDate,
              }),
              queryFn: async () => {
                const searchParams = new URLSearchParams();
                searchParams.append("startDate", newStartDate);
                searchParams.append("endDate", newEndDate);
                return apiClient.get<GenreDistributionResponse>(
                  `/genres?${searchParams.toString()}`
                );
              },
              staleTime: 5 * 60 * 1000,
            })
            .then(() => {})
        );
      }

      // Précharger temporal analysis
      if (newStartDate && newEndDate) {
        prefetchPromises.push(
          queryClient
            .prefetchQuery({
              queryKey: listeningKeys.temporalAnalysis({
                startDate: newStartDate,
                endDate: newEndDate,
              }),
              queryFn: async () => {
                const searchParams = new URLSearchParams();
                searchParams.append("startDate", newStartDate);
                searchParams.append("endDate", newEndDate);
                return apiClient.get<TemporalAnalysisDto>(
                  `/temporal-analysis?${searchParams.toString()}`
                );
              },
              staleTime: 2 * 60 * 1000,
            })
            .then(() => {})
        );
      }

      // Exécuter toutes les précharges en parallèle
      await Promise.allSettled(prefetchPromises);
    },
    [queryClient]
  );

  return {
    prefetchWithOptimisticUpdate,
  };
}
