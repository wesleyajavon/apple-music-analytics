import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type { ArtistsResponseDto } from "@/lib/dto/artist";
import {
  countArtistsForRange,
  getArtistOverview,
  getArtistStats,
} from "@/lib/services/artist/artist-service";

function dateSeg(d?: Date): string {
  return d ? d.toISOString().slice(0, 10) : "all";
}

export function getPublicProfileArtistsListCached(
  publicUserId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  limit: number,
  offset: number,
  searchQuery?: string
): Promise<ArtistsResponseDto> {
  const qSeg = searchQuery?.trim().toLowerCase() || "all";
  const fetcher = unstable_cache(
    async () => {
      const [overview, total, topArtists] = await Promise.all([
        getArtistOverview(startDate, endDate, publicUserId),
        countArtistsForRange(startDate, endDate, publicUserId, searchQuery),
        getArtistStats(startDate, endDate, publicUserId, limit, offset, searchQuery),
      ]);
      return {
        overview,
        topArtists,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + topArtists.length < total,
        },
      };
    },
    [
      "api-artists",
      "public-profile",
      publicUserId,
      dateSeg(startDate),
      dateSeg(endDate),
      String(limit),
      String(offset),
      qSeg,
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}
