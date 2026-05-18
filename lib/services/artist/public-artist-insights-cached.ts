import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import {
  getArtistUserInsights,
  type ArtistUserInsights,
} from "@/lib/services/artist/artist-service";

function dateSeg(d?: Date): string {
  return d ? d.toISOString().slice(0, 10) : "all";
}

export function getPublicProfileArtistUserInsightsCached(
  publicUserId: string,
  artistId: string,
  startDate: Date | undefined,
  endDate: Date | undefined
): Promise<ArtistUserInsights | null> {
  const fetcher = unstable_cache(
    async () => getArtistUserInsights(artistId, startDate, endDate, publicUserId),
    [
      "api-artist-insights",
      "public-profile",
      publicUserId,
      artistId,
      dateSeg(startDate),
      dateSeg(endDate),
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}
