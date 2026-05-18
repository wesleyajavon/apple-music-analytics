import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type { TrackTrendsChartResponse, TrackTrendsChartTrack } from "@/lib/dto/track";
import type { AiLocale } from "@/lib/services/ai/locale-utils";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import {
  getTopTrackCatalogForRange,
  getTrackTrendsChartRows,
  getTrackTrendsChartRowsForTrackIds,
  resolveTracksByIds,
} from "@/lib/services/track/track-service";
import { pivotTrackTrends } from "@/lib/utils/track-trends-pivot";

type TrendPeriod = "day" | "week" | "month";

function dateSeg(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function tracksFilterKey(filter: string[] | undefined): string {
  if (!filter?.length) return "top";
  return [...filter].sort().join(",");
}

function mergeCatalogTracks(
  top: TrackTrendsChartTrack[],
  seriesExtras: TrackTrendsChartTrack[]
): TrackTrendsChartTrack[] {
  const seen = new Set<string>();
  const out: TrackTrendsChartTrack[] = [];
  for (const track of top) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      out.push(track);
    }
  }
  for (const track of seriesExtras) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      out.push(track);
    }
  }
  return out;
}

async function computeTrackTrendsChart(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: TrendPeriod,
  tracksFilter: string[] | undefined,
  topN: number,
  locale: AiLocale
): Promise<TrackTrendsChartResponse> {
  if (tracksFilter && tracksFilter.length > 0) {
    const rows = await getTrackTrendsChartRowsForTrackIds(
      startDate,
      endDate,
      period,
      publicUserId,
      tracksFilter
    );
    const ensureTracks = await resolveTracksByIds(tracksFilter);
    const { data, availableTracks } = pivotTrackTrends(
      rows,
      period,
      locale,
      undefined,
      ensureTracks
    );
    const catalogTop = await getTopTrackCatalogForRange(
      startDate,
      endDate,
      publicUserId,
      topN
    );
    const catalogTracks = mergeCatalogTracks(catalogTop, availableTracks);
    return { data, availableTracks, catalogTracks };
  }

  const rows = await getTrackTrendsChartRows(
    startDate,
    endDate,
    period,
    publicUserId,
    topN
  );
  const { data, availableTracks } = pivotTrackTrends(rows, period, locale);
  return { data, availableTracks };
}

export function getPublicProfileTrackTrendsChartAllTimeCached(
  publicUserId: string,
  period: TrendPeriod,
  tracksFilter: string[] | undefined,
  topN: number,
  locale: AiLocale
): Promise<TrackTrendsChartResponse> {
  const fKey = tracksFilterKey(tracksFilter);
  const fetcher = unstable_cache(
    async () => {
      const range = await getListenDateRange(publicUserId);
      if (!range) {
        return { data: [], availableTracks: [] };
      }
      return computeTrackTrendsChart(
        publicUserId,
        range.minDate,
        range.maxDate,
        period,
        tracksFilter,
        topN,
        locale
      );
    },
    [
      "api-tracks-trends-chart",
      "public-profile",
      publicUserId,
      "all",
      period,
      fKey,
      String(topN),
      locale,
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}

export function getPublicProfileTrackTrendsChartRangeCached(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: TrendPeriod,
  tracksFilter: string[] | undefined,
  topN: number,
  locale: AiLocale
): Promise<TrackTrendsChartResponse> {
  const fKey = tracksFilterKey(tracksFilter);
  const fetcher = unstable_cache(
    async () => {
      return computeTrackTrendsChart(
        publicUserId,
        startDate,
        endDate,
        period,
        tracksFilter,
        topN,
        locale
      );
    },
    [
      "api-tracks-trends-chart",
      "public-profile",
      publicUserId,
      "range",
      dateSeg(startDate),
      dateSeg(endDate),
      period,
      fKey,
      String(topN),
      locale,
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}
