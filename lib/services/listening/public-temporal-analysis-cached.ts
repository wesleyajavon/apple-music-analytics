import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import { getTemporalAnalysis } from "@/lib/services/listening/temporal-analysis";

function dateSeg(d?: Date): string {
  return d ? d.toISOString().slice(0, 10) : "all";
}

export function getPublicProfileTemporalAnalysisCached(
  publicUserId: string,
  startDate: Date | undefined,
  endDate: Date | undefined
): Promise<TemporalAnalysisDto> {
  const fetcher = unstable_cache(
    async () => {
      const result = await getTemporalAnalysis(startDate, endDate, publicUserId);
      return {
        byDayOfWeek: result.byDayOfWeek.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          listens: day.listens,
          uniqueTracks: day.uniqueTracks,
          uniqueArtists: day.uniqueArtists,
        })),
        byHourOfDay: result.byHourOfDay.map((hour) => ({
          hour: hour.hour,
          listens: hour.listens,
          uniqueTracks: hour.uniqueTracks,
          uniqueArtists: hour.uniqueArtists,
        })),
        peakDay: result.peakDay
          ? {
              dayOfWeek: result.peakDay.dayOfWeek,
              listens: result.peakDay.listens,
              uniqueTracks: result.peakDay.uniqueTracks,
              uniqueArtists: result.peakDay.uniqueArtists,
            }
          : null,
        peakHour: result.peakHour
          ? {
              hour: result.peakHour.hour,
              listens: result.peakHour.listens,
              uniqueTracks: result.peakHour.uniqueTracks,
              uniqueArtists: result.peakHour.uniqueArtists,
            }
          : null,
      };
    },
    [
      "api-temporal-analysis",
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
