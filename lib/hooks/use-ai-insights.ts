"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type {
  AiInsightsInput,
  AiInsightsResponse,
  YearOverYearDelta,
} from "@/lib/dto/ai-insights";
import type { OverviewStatsWithTopArtists } from "./use-listening";
import type { GenreDistributionResponse } from "@/lib/dto/genres";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";

const AI_INSIGHTS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

function getPreviousPeriod(
  startDate: string,
  endDate: string
): { prevStartDate: string; prevEndDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  return {
    prevStartDate: prevStart.toISOString().split("T")[0],
    prevEndDate: prevEnd.toISOString().split("T")[0],
  };
}

function buildInsightsInput(
  startDate: string,
  endDate: string,
  overview: OverviewStatsWithTopArtists,
  previousOverview: OverviewStatsWithTopArtists | null,
  genres: GenreDistributionResponse,
  temporal: TemporalAnalysisDto,
  locale: string
): AiInsightsInput {
  const labels = getAiInsightsLabels(locale);
  const yearOverYearDeltas: YearOverYearDelta[] = previousOverview
    ? [
        {
          metric: labels.metrics.totalListens,
          currentValue: overview.totalListens,
          previousValue: previousOverview.totalListens,
          percentChange:
            previousOverview.totalListens === 0
              ? overview.totalListens > 0
                ? 100
                : 0
              : ((overview.totalListens - previousOverview.totalListens) /
                  previousOverview.totalListens) *
                100,
        },
        {
          metric: labels.metrics.uniqueArtists,
          currentValue: overview.uniqueArtists,
          previousValue: previousOverview.uniqueArtists,
          percentChange:
            previousOverview.uniqueArtists === 0
              ? overview.uniqueArtists > 0
                ? 100
                : 0
              : ((overview.uniqueArtists - previousOverview.uniqueArtists) /
                  previousOverview.uniqueArtists) *
                100,
        },
        {
          metric: labels.metrics.uniqueTracks,
          currentValue: overview.uniqueTracks,
          previousValue: previousOverview.uniqueTracks,
          percentChange:
            previousOverview.uniqueTracks === 0
              ? overview.uniqueTracks > 0
                ? 100
                : 0
              : ((overview.uniqueTracks - previousOverview.uniqueTracks) /
                  previousOverview.uniqueTracks) *
                100,
        },
        {
          metric: labels.metrics.totalPlayTime,
          currentValue: overview.totalPlayTime,
          previousValue: previousOverview.totalPlayTime,
          percentChange:
            previousOverview.totalPlayTime === 0
              ? overview.totalPlayTime > 0
                ? 100
                : 0
              : ((overview.totalPlayTime - previousOverview.totalPlayTime) /
                  previousOverview.totalPlayTime) *
                100,
        },
      ]
    : [];

  return {
    dateRange: { start: startDate, end: endDate },
    genreDistribution: genres.data.map((g) => ({
      genre: g.genre,
      count: g.count,
      percentage: g.percentage,
    })),
    listeningByTimeOfDay: temporal.byHourOfDay.map((h) => ({
      hour: h.hour,
      listens: h.listens,
    })),
    topArtists: overview.topArtists?.map((a) => ({
      artistName: a.artistName,
      listenCount: a.listenCount,
      genre: undefined, // Overview doesn't include genre; could be enriched later
    })) ?? [],
    yearOverYearDeltas:
      yearOverYearDeltas.length > 0 ? yearOverYearDeltas : undefined,
    peakDay: temporal.peakDay
      ? {
          dayName: labels.dayNames[temporal.peakDay.dayOfWeek],
          listens: temporal.peakDay.listens,
        }
      : undefined,
    peakHour: temporal.peakHour
      ? {
          hour: temporal.peakHour.hour,
          listens: temporal.peakHour.listens,
        }
      : undefined,
  };
}

async function fetchAiInsights(
  startDate: string,
  endDate: string,
  locale: string
): Promise<AiInsightsResponse> {
  const { prevStartDate, prevEndDate } = getPreviousPeriod(startDate, endDate);

  const [overview, previousOverview, genres, temporal] = await Promise.all([
    apiClient.get<OverviewStatsWithTopArtists>(
      `/overview?startDate=${startDate}&endDate=${endDate}`
    ),
    apiClient.get<OverviewStatsWithTopArtists>(
      `/overview?startDate=${prevStartDate}&endDate=${prevEndDate}`
    ),
    apiClient.get<GenreDistributionResponse>(
      `/genres?startDate=${startDate}&endDate=${endDate}`
    ),
    apiClient.get<TemporalAnalysisDto>(
      `/temporal-analysis?startDate=${startDate}&endDate=${endDate}`
    ),
  ]);

  const input = buildInsightsInput(
    startDate,
    endDate,
    overview,
    previousOverview,
    genres,
    temporal,
    locale
  );

  return apiClient.post<AiInsightsResponse>("/ai/insights", {
    ...input,
    locale,
  });
}

export const aiInsightsKeys = {
  all: ["ai", "insights"] as const,
  list: (params?: { startDate?: string; endDate?: string; locale?: string }) =>
    [...aiInsightsKeys.all, params] as const,
};

/**
 * Hook to fetch AI-generated insights for a date range.
 * Fetches overview, genres, temporal analysis, then POSTs to /api/ai/insights.
 * Passes current locale for localized output.
 */
export function useAiInsights(
  startDate: string | undefined,
  endDate: string | undefined,
  options?: Omit<
    UseQueryOptions<AiInsightsResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  const locale = useLocale();
  const hasValidRange = !!startDate && !!endDate;

  return useQuery<AiInsightsResponse, Error>({
    queryKey: aiInsightsKeys.list({ startDate, endDate, locale }),
    queryFn: () => fetchAiInsights(startDate!, endDate!, locale),
    enabled: hasValidRange,
    staleTime: AI_INSIGHTS_STALE_TIME,
    ...options,
  });
}
