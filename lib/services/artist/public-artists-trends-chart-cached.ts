import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type {
  ArtistTrendsChartArtist,
  ArtistTrendsChartResponse,
} from "@/lib/dto/artist";
import { prisma } from "@/lib/prisma";
import {
  getArtistTrendsChartRows,
  getArtistTrendsChartRowsForArtistIds,
  getTopArtistCatalogForRange,
} from "@/lib/services/artist/artist-service";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type { AiLocale } from "@/lib/services/ai/locale-utils";
import { pivotArtistTrends } from "@/lib/utils/artist-trends-pivot";

type TrendPeriod = "day" | "week" | "month";

function dateSeg(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function artistsFilterKey(filter: string[] | undefined): string {
  if (!filter?.length) return "top";
  return [...filter].sort().join(",");
}

function mergeCatalogPickers(
  top: ArtistTrendsChartArtist[],
  seriesExtras: ArtistTrendsChartArtist[]
): ArtistTrendsChartArtist[] {
  const seen = new Set<string>();
  const out: ArtistTrendsChartArtist[] = [];
  for (const a of top) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      out.push(a);
    }
  }
  for (const a of seriesExtras) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      out.push(a);
    }
  }
  return out;
}

async function resolveEnsureArtistsFromIds(
  orderedIds: string[]
): Promise<ArtistTrendsChartArtist[]> {
  const rows = await prisma.artist.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, name: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r.name]));
  return orderedIds.map((id) => ({
    id,
    name: byId.get(id) ?? "Unknown",
  }));
}

async function computeArtistTrendsChart(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: TrendPeriod,
  artistsFilter: string[] | undefined,
  topN: number,
  locale: AiLocale
): Promise<ArtistTrendsChartResponse> {
  if (artistsFilter && artistsFilter.length > 0) {
    const rows = await getArtistTrendsChartRowsForArtistIds(
      startDate,
      endDate,
      period,
      publicUserId,
      artistsFilter
    );
    const ensureArtists = await resolveEnsureArtistsFromIds(artistsFilter);
    const { data, availableArtists } = pivotArtistTrends(
      rows,
      period,
      locale,
      undefined,
      ensureArtists
    );
    const catalogTop = await getTopArtistCatalogForRange(
      startDate,
      endDate,
      publicUserId,
      topN
    );
    const catalogArtists = mergeCatalogPickers(catalogTop, availableArtists);
    return { data, availableArtists, catalogArtists };
  }

  const rows = await getArtistTrendsChartRows(
    startDate,
    endDate,
    period,
    publicUserId,
    topN
  );
  const { data, availableArtists } = pivotArtistTrends(rows, period, locale);
  return { data, availableArtists };
}

export function getPublicProfileArtistTrendsChartAllTimeCached(
  publicUserId: string,
  period: TrendPeriod,
  artistsFilter: string[] | undefined,
  topN: number,
  locale: AiLocale
): Promise<ArtistTrendsChartResponse> {
  const fKey = artistsFilterKey(artistsFilter);
  const fetcher = unstable_cache(
    async () => {
      const range = await getListenDateRange(publicUserId);
      if (!range) {
        return { data: [], availableArtists: [] };
      }
      return computeArtistTrendsChart(
        publicUserId,
        range.minDate,
        range.maxDate,
        period,
        artistsFilter,
        topN,
        locale
      );
    },
    [
      "api-artists-trends-chart",
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

export function getPublicProfileArtistTrendsChartRangeCached(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: TrendPeriod,
  artistsFilter: string[] | undefined,
  topN: number,
  locale: AiLocale
): Promise<ArtistTrendsChartResponse> {
  const fKey = artistsFilterKey(artistsFilter);
  const fetcher = unstable_cache(
    async () => {
      return computeArtistTrendsChart(
        publicUserId,
        startDate,
        endDate,
        period,
        artistsFilter,
        topN,
        locale
      );
    },
    [
      "api-artists-trends-chart",
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
