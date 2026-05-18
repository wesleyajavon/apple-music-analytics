import { unstable_cache } from "next/cache";
import type { OverviewStatsDto, TopArtistDto } from "@/lib/dto/listening";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import { getOverviewStats, getTopArtists } from "@/lib/services/listening/listening-stats";

function dateSegment(d: Date | undefined): string {
  if (!d) return "all";
  return d.toISOString().slice(0, 10);
}

export type PublicOverviewPayload = OverviewStatsDto & { topArtists: TopArtistDto[] };

/**
 * Agrégats overview pour le seul userId du profil public (pas de PII variable).
 * Réduit la charge DB sous scraping / traffic démo.
 */
export function getPublicProfileOverviewCached(
  publicUserId: string,
  startDate: Date | undefined,
  endDate: Date | undefined
): Promise<PublicOverviewPayload> {
  const fetcher = unstable_cache(
    async () => {
      const [stats, topArtists] = await Promise.all([
        getOverviewStats(startDate, endDate, publicUserId),
        getTopArtists(startDate, endDate, publicUserId, 6),
      ]);
      return { ...stats, topArtists };
    },
    [
      "api-overview",
      "public-profile",
      publicUserId,
      dateSegment(startDate),
      dateSegment(endDate),
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}

export const publicOverviewCacheRevalidateSeconds =
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS;
