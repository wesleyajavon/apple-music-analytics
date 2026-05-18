import { unstable_cache } from "next/cache";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening/listening-aggregation";
import { getListenDateRange } from "@/lib/services/listening/listening-service";

export type TimelineChartPoint = {
  date: string;
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
};

type TimelinePeriod = "day" | "week" | "month";

function dateSeg(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function buildChartData(
  userId: string,
  startDate: Date,
  endDate: Date,
  period: TimelinePeriod
): Promise<TimelineChartPoint[]> {
  switch (period) {
    case "day": {
      const dailyData = await getDailyAggregatedListens(startDate, endDate, userId);
      return dailyData.map((day) => ({
        date: day.date,
        listens: day.listens,
        uniqueTracks: day.uniqueTracks,
        uniqueArtists: day.uniqueArtists,
      }));
    }
    case "week": {
      const weeklyData = await getWeeklyAggregatedListens(startDate, endDate, userId);
      return weeklyData.map((week) => ({
        date: week.weekStart,
        listens: week.listens,
        uniqueTracks: week.uniqueTracks,
        uniqueArtists: week.uniqueArtists,
      }));
    }
    case "month": {
      const monthlyData = await getMonthlyAggregatedListens(startDate, endDate, userId);
      return monthlyData.map((month) => ({
        date: month.month,
        listens: month.listens,
        uniqueTracks: month.uniqueTracks,
        uniqueArtists: month.uniqueArtists,
      }));
    }
  }
}

/** Timeline « tout l'historique » (même logique que la route : min/max DB). */
export function getPublicProfileTimelineAllTimeCached(
  publicUserId: string,
  period: TimelinePeriod
): Promise<TimelineChartPoint[]> {
  const fetcher = unstable_cache(
    async () => {
      const range = await getListenDateRange(publicUserId);
      if (!range) return [];
      return buildChartData(publicUserId, range.minDate, range.maxDate, period);
    },
    ["api-timeline", "public-profile", publicUserId, "all", period],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}

export function getPublicProfileTimelineRangeCached(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: TimelinePeriod
): Promise<TimelineChartPoint[]> {
  const fetcher = unstable_cache(
    async () => {
      return buildChartData(publicUserId, startDate, endDate, period);
    },
    [
      "api-timeline",
      "public-profile",
      publicUserId,
      "range",
      dateSeg(startDate),
      dateSeg(endDate),
      period,
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}
