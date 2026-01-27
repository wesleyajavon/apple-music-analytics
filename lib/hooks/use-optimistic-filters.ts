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
      // Récupérer les données ACTUELLES (anciennes) du cache pour les utiliser comme placeholder
      const oldOverview = queryClient.getQueryData<OverviewStatsDto>(
        listeningKeys.overview({ startDate: oldStartDate, endDate: oldEndDate })
      );

      const oldTimeline = queryClient.getQueryData<TimelineDataPoint[]>(
        listeningKeys.timeline({
          startDate: oldStartDate,
          endDate: oldEndDate,
          period: oldPeriod,
        })
      );

      const oldGenres = queryClient.getQueryData<GenreDistributionResponse>(
        listeningKeys.genres({ startDate: oldStartDate, endDate: oldEndDate })
      );

      const oldTemporalAnalysis =
        queryClient.getQueryData<TemporalAnalysisDto>(
          listeningKeys.temporalAnalysis({
            startDate: oldStartDate,
            endDate: oldEndDate,
          })
        );

      // Mettre à jour le cache de manière optimiste AVANT de précharger
      // Cela permet d'afficher immédiatement les anciennes données pendant le chargement
      if (oldOverview && newStartDate && newEndDate) {
        queryClient.setQueryData(
          listeningKeys.overview({ startDate: newStartDate, endDate: newEndDate }),
          oldOverview
        );
      }

      if (oldTimeline && newStartDate && newEndDate && newPeriod) {
        queryClient.setQueryData(
          listeningKeys.timeline({
            startDate: newStartDate,
            endDate: newEndDate,
            period: newPeriod,
          }),
          oldTimeline
        );
      }

      if (oldGenres && newStartDate && newEndDate) {
        queryClient.setQueryData(
          listeningKeys.genres({ startDate: newStartDate, endDate: newEndDate }),
          oldGenres
        );
      }

      if (oldTemporalAnalysis && newStartDate && newEndDate) {
        queryClient.setQueryData(
          listeningKeys.temporalAnalysis({
            startDate: newStartDate,
            endDate: newEndDate,
          }),
          oldTemporalAnalysis
        );
      }

      // Précharger les nouvelles données en arrière-plan
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
