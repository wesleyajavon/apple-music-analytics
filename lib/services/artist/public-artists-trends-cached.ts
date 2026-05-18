import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type { ArtistTrendsResponseDto } from "@/lib/dto/artist";
import { getArtistTrends } from "@/lib/services/artist/artist-service";

function dateSeg(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getPublicProfileArtistTrendsCached(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  topN: number
): Promise<ArtistTrendsResponseDto> {
  const fetcher = unstable_cache(
    async () => {
      const data = await getArtistTrends(
        startDate,
        endDate,
        period,
        publicUserId,
        topN
      );
      return {
        data,
        period,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    },
    [
      "api-artists-trends",
      "public-profile",
      publicUserId,
      dateSeg(startDate),
      dateSeg(endDate),
      period,
      String(topN),
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}
