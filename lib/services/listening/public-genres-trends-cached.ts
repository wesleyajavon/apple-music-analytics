import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type { GenreTrendsResponse } from "@/lib/dto/genres";
import type { AiLocale } from "@/lib/services/ai/locale-utils";
import {
  getGenreTrends,
  type GenreTrendPeriod,
} from "@/lib/services/listening/listening-stats";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { buildGenreTrendsResponse } from "@/lib/utils/genre-trends-pivot";

function dateSeg(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function genresKey(genresFilter?: string[]): string {
  if (!genresFilter?.length) return "all-genres";
  return [...genresFilter].sort().join("|");
}

export function getPublicProfileGenreTrendsAllTimeCached(
  publicUserId: string,
  period: GenreTrendPeriod,
  locale: AiLocale,
  genresFilter?: string[]
): Promise<GenreTrendsResponse> {
  const gKey = genresKey(genresFilter);
  const fetcher = unstable_cache(
    async () => {
      const range = await getListenDateRange(publicUserId);
      if (!range) {
        return { data: [], availableGenres: [] };
      }
      const rows = await getGenreTrends(
        range.minDate,
        range.maxDate,
        period,
        publicUserId
      );
      return buildGenreTrendsResponse(rows, period, locale, genresFilter);
    },
    [
      "api-genres-trends",
      "public-profile",
      publicUserId,
      "all",
      period,
      locale,
      gKey,
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}

export function getPublicProfileGenreTrendsRangeCached(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: GenreTrendPeriod,
  locale: AiLocale,
  genresFilter?: string[]
): Promise<GenreTrendsResponse> {
  const gKey = genresKey(genresFilter);
  const fetcher = unstable_cache(
    async () => {
      const rows = await getGenreTrends(
        startDate,
        endDate,
        period,
        publicUserId
      );
      return buildGenreTrendsResponse(rows, period, locale, genresFilter);
    },
    [
      "api-genres-trends",
      "public-profile",
      publicUserId,
      "range",
      dateSeg(startDate),
      dateSeg(endDate),
      period,
      locale,
      gKey,
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}
