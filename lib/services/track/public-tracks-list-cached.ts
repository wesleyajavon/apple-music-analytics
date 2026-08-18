import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type { TracksResponseDto } from "@/lib/dto/track";
import {
  countTracksForRange,
  getTrackOverview,
  getTrackStats,
} from "@/lib/services/track/track-service";

function dateSeg(d?: Date): string {
  return d ? d.toISOString().slice(0, 10) : "all";
}

export function getPublicProfileTracksListCached(
  publicUserId: string,
  startDate: Date | undefined,
  endDate: Date | undefined,
  limit: number,
  offset: number,
  searchQuery?: string
): Promise<TracksResponseDto> {
  const qSeg = searchQuery?.trim().toLowerCase() || "all";
  const fetcher = unstable_cache(
    async () => {
      const [overview, total, topTracks] = await Promise.all([
        getTrackOverview(startDate, endDate, publicUserId),
        countTracksForRange(startDate, endDate, publicUserId, searchQuery),
        getTrackStats(startDate, endDate, publicUserId, limit, offset, searchQuery),
      ]);
      return {
        overview,
        topTracks,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + topTracks.length < total,
        },
      };
    },
    [
      "api-tracks",
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
