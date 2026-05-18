import { unstable_cache } from "next/cache";
import type { AggregatedListensResponse, ListensResponse } from "@/lib/dto/listening";
import {
  PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
  publicProfileAnalyticsCacheTag,
} from "@/lib/constants/public-demo-cache";
import { getAggregatedListens } from "@/lib/services/listening/listening-aggregation";
import { getListens } from "@/lib/services/listening/listening-service";
import type { ListenRecordSource } from "@/lib/constants/listen-source";

function dateSeg(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getPublicProfileListensAggregatedCached(
  publicUserId: string,
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month"
): Promise<AggregatedListensResponse> {
  const fetcher = unstable_cache(
    async () => {
      const aggregatedData = await getAggregatedListens(
        startDate,
        endDate,
        period,
        publicUserId
      );
      return {
        data: aggregatedData,
        period,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    },
    [
      "api-listens",
      "agg",
      "public-profile",
      publicUserId,
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

export type PublicListensRawArgs = {
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
  source?: ListenRecordSource;
};

export function getPublicProfileListensRawCached(
  publicUserId: string,
  args: PublicListensRawArgs
): Promise<ListensResponse> {
  const { startDate, endDate, limit, offset, source } = args;
  const sourceKey = source ?? "any";
  const fetcher = unstable_cache(
    async () => {
      const { data, total } = await getListens({
        startDate,
        endDate,
        userId: publicUserId,
        limit,
        offset,
        source,
      });
      return { data, total, limit, offset };
    },
    [
      "api-listens",
      "raw",
      "public-profile",
      publicUserId,
      startDate ?? "all",
      endDate ?? "all",
      String(limit),
      String(offset),
      sourceKey,
    ],
    {
      revalidate: PUBLIC_DEMO_CACHE_REVALIDATE_SECONDS,
      tags: [publicProfileAnalyticsCacheTag(publicUserId)],
    }
  );
  return fetcher();
}
