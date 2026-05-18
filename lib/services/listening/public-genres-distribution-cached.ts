import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type { GenreDistributionResponse } from "@/lib/dto/genres";
import {
  getGenreDistribution,
  getTopArtistsForGenres,
} from "@/lib/services/listening/listening-stats";

function dateSeg(d?: Date): string {
  return d ? d.toISOString().slice(0, 10) : "all";
}

export function getPublicProfileGenresDistributionCached(
  publicUserId: string,
  startDate: Date | undefined,
  endDate: Date | undefined
): Promise<GenreDistributionResponse> {
  const fetcher = unstable_cache(
    async () => {
      const genreCounts = await getGenreDistribution(
        startDate,
        endDate,
        publicUserId
      );
      const totalListens = genreCounts.reduce((sum, item) => sum + item.count, 0);
      const data = genreCounts.map((item) => ({
        genre: item.genre,
        count: item.count,
        percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
      }));
      const topGenreNames = genreCounts.slice(0, 3).map((g) => g.genre);
      const topArtistsForTopGenres =
        topGenreNames.length > 0
          ? await getTopArtistsForGenres(
              topGenreNames,
              startDate,
              endDate,
              publicUserId,
              3
            )
          : [];
      return { data, totalListens, topArtistsForTopGenres };
    },
    [
      "api-genres",
      "public-profile",
      publicUserId,
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
