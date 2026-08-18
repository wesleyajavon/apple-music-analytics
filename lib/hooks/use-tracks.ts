"use client";

import { keepPreviousData, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import type {
  TrackSearchResponse,
  TracksResponseDto,
  TrackTrendsChartResponse,
} from "@/lib/dto/track";
import { CACHE_STALE_TIME } from "@/lib/constants/config";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

export const trackKeys = {
  all: ["tracks"] as const,
  stats: (params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    q?: string;
  }) => [...trackKeys.all, "stats", params] as const,
  trendsChart: (params: {
    startDate?: string;
    endDate?: string;
    period?: "day" | "week" | "month";
    trackIds?: string[];
    topN?: number;
    userId?: string;
  }) => [...trackKeys.all, "trendsChart", params] as const,
  search: (q: string) => [...trackKeys.all, "search", q] as const,
};

export async function fetchTrackStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  limit?: number,
  offset?: number,
  q?: string
): Promise<TracksResponseDto> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (userId) searchParams.append("userId", userId);
  if (limit != null) searchParams.append("limit", String(limit));
  if (offset != null) searchParams.append("offset", String(offset));
  if (q) searchParams.append("q", q);
  const queryString = searchParams.toString();
  return apiClient.get<TracksResponseDto>(`/tracks${queryString ? `?${queryString}` : ""}`);
}

export function useTrackStats(
  startDate?: string,
  endDate?: string,
  userId?: string,
  limit?: number,
  offset?: number,
  options?: Omit<
    UseQueryOptions<TracksResponseDto, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  > & { q?: string }
) {
  const { q, ...queryOptions } = options ?? {};
  const queryKey = trackKeys.stats({ startDate, endDate, userId, limit, offset, q });
  return useQuery<TracksResponseDto, Error>({
    queryKey,
    queryFn: () => fetchTrackStats(startDate, endDate, userId, limit, offset, q),
    staleTime: CACHE_STALE_TIME.OVERVIEW,
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
}

async function fetchTrackTrendsChart(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  trackIds?: string[],
  topN?: number,
  userId?: string,
  locale?: string
): Promise<TrackTrendsChartResponse> {
  const searchParams = new URLSearchParams();
  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (period) searchParams.append("period", period);
  if (locale) searchParams.append("locale", locale);
  if (userId) searchParams.append("userId", userId);
  if (topN != null) searchParams.append("topN", String(topN));
  if (trackIds?.length) trackIds.forEach((id) => searchParams.append("tracks", id));
  const qs = searchParams.toString();
  return apiClient.get<TrackTrendsChartResponse>(`/tracks/trends-chart${qs ? `?${qs}` : ""}`);
}

export function useTrackTrendsChart(
  startDate?: string,
  endDate?: string,
  period?: "day" | "week" | "month",
  trackIds?: string[],
  topN?: number,
  userId?: string,
  options?: Omit<
    UseQueryOptions<TrackTrendsChartResponse, Error>,
    "queryKey" | "queryFn" | "staleTime" | "placeholderData"
  >
) {
  const locale = useLocale();
  const idsForKey = trackIds?.length ? [...trackIds].sort() : undefined;
  const queryKey = trackKeys.trendsChart({
    startDate,
    endDate,
    period,
    trackIds: idsForKey,
    topN,
    userId,
  });

  return useQuery<TrackTrendsChartResponse, Error>({
    queryKey,
    queryFn: () => fetchTrackTrendsChart(startDate, endDate, period, trackIds, topN, userId, locale),
    staleTime: CACHE_STALE_TIME.ARTIST_TRENDS_CHART,
    placeholderData: keepPreviousData,
    ...options,
  });
}

const TRACK_SEARCH_FETCH_LIMIT = 50;

async function fetchTrackSearch(q: string): Promise<TrackSearchResponse> {
  const searchParams = new URLSearchParams({
    q,
    limit: String(TRACK_SEARCH_FETCH_LIMIT),
  });
  return apiClient.get<TrackSearchResponse>(`/tracks/search?${searchParams.toString()}`);
}

export function useTrackSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 320);
  return useQuery<TrackSearchResponse, Error>({
    queryKey: trackKeys.search(debounced),
    queryFn: () => fetchTrackSearch(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60 * 1000,
  });
}
