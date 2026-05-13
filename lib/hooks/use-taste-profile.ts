"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { apiClient, type ParsedRateLimitHeaders } from "@/lib/api-client";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import type {
  TasteProfileInput,
  TasteProfileResponse,
  TasteProfileTone,
} from "@/lib/dto/taste-profile";
import type { OverviewStatsWithTopArtists } from "./use-listening";
import type { GenreDistributionResponse } from "@/lib/dto/genres";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import type { YearOverYearDelta } from "@/lib/dto/ai-insights";
import { tasteProfileKeys } from "./query-keys";

const TASTE_PROFILE_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export type TasteProfileUiResponse = TasteProfileResponse & {
  rateLimit?: ParsedRateLimitHeaders;
};

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

function buildTasteProfileInput(
  startDate: string,
  endDate: string,
  overview: OverviewStatsWithTopArtists,
  previousOverview: OverviewStatsWithTopArtists | null,
  genres: GenreDistributionResponse,
  temporal: TemporalAnalysisDto,
  locale: string
): TasteProfileInput {
  const yearOverYearDeltas: YearOverYearDelta[] = previousOverview
    ? [
        {
          metric: "Total d'écoutes",
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
          metric: "Artistes uniques",
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
          metric: "Titres uniques",
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
          metric: "Temps d'écoute (secondes)",
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
    topArtists:
      overview.topArtists?.map((a) => ({
        artistName: a.artistName,
        listenCount: a.listenCount,
        genre: undefined,
      })) ?? [],
    yearOverYearDeltas:
      yearOverYearDeltas.length > 0 ? yearOverYearDeltas : undefined,
    peakDay: temporal.peakDay
      ? {
          dayName: getAiInsightsLabels(locale).dayNames[temporal.peakDay.dayOfWeek],
          listens: temporal.peakDay.listens,
        }
      : undefined,
    peakHour: temporal.peakHour
      ? {
          hour: temporal.peakHour.hour,
          listens: temporal.peakHour.listens,
        }
      : undefined,
    totalListens: overview.totalListens,
    uniqueArtists: overview.uniqueArtists,
    uniqueTracks: overview.uniqueTracks,
  };
}

function withUserIdQuery(path: string, userId?: string): string {
  if (userId === undefined || userId === "") return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}userId=${encodeURIComponent(userId)}`;
}

async function fetchTasteProfile(
  startDate: string,
  endDate: string,
  tone: TasteProfileTone,
  locale: string,
  userId?: string
): Promise<TasteProfileUiResponse> {
  const { prevStartDate, prevEndDate } = getPreviousPeriod(startDate, endDate);

  const [overview, previousOverview, genres, temporal] = await Promise.all([
    apiClient.get<OverviewStatsWithTopArtists>(
      withUserIdQuery(
        `/overview?startDate=${startDate}&endDate=${endDate}`,
        userId
      )
    ),
    apiClient.get<OverviewStatsWithTopArtists>(
      withUserIdQuery(
        `/overview?startDate=${prevStartDate}&endDate=${prevEndDate}`,
        userId
      )
    ),
    apiClient.get<GenreDistributionResponse>(
      withUserIdQuery(
        `/genres?startDate=${startDate}&endDate=${endDate}`,
        userId
      )
    ),
    apiClient.get<TemporalAnalysisDto>(
      withUserIdQuery(
        `/temporal-analysis?startDate=${startDate}&endDate=${endDate}`,
        userId
      )
    ),
  ]);

  const input = buildTasteProfileInput(
    startDate,
    endDate,
    overview,
    previousOverview,
    genres,
    temporal,
    locale
  );

  const qs =
    userId !== undefined && userId !== ""
      ? `?userId=${encodeURIComponent(userId)}`
      : "";
  const result = await apiClient.postWithMeta<TasteProfileResponse>(`/ai/taste-profile${qs}`, {
    ...input,
    tone,
    locale,
  });
  return {
    ...result.data,
    rateLimit: result.rateLimit,
  };
}

/**
 * Hook to fetch taste profile for a date range and tone.
 * Fetches overview, genres, temporal analysis, then POSTs to /api/ai/taste-profile.
 * Passes current locale for localized output.
 */
export function useTasteProfile(
  startDate: string | undefined,
  endDate: string | undefined,
  tone: TasteProfileTone = "casual",
  options?: Omit<
    UseQueryOptions<TasteProfileUiResponse, Error>,
    "queryKey" | "queryFn"
  > & { userId?: string }
) {
  const locale = useLocale();
  const hasValidRange = !!startDate && !!endDate;
  const blockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();
  const { userId, enabled: enabledOption, ...queryOptions } = options ?? {};

  return useQuery<TasteProfileUiResponse, Error>({
    queryKey: tasteProfileKeys.list({ startDate, endDate, tone, locale, userId }),
    queryFn: () => fetchTasteProfile(startDate!, endDate!, tone, locale, userId),
    staleTime: TASTE_PROFILE_STALE_TIME,
    ...queryOptions,
    enabled:
      (enabledOption ?? true) && hasValidRange && !blockedByGenreBackfill,
  });
}
