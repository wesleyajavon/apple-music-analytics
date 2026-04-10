"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";

const DATE_RANGE_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const listenDateRangeKeys = {
  all: ["listening", "date-range"] as const,
  list: (userId?: string) => [...listenDateRangeKeys.all, userId ?? "self"] as const,
} as const;

interface DateRangeResponse {
  startDate: string | null;
  endDate: string | null;
}

/**
 * Returns the effective date range for the current filter.
 * - When startDate/endDate are in the URL: uses those (fixed presets or custom range).
 * - When "all" (tout) is selected (no dates in URL): fetches the full range from the API.
 *
 * This fixes the bug where "all" was incorrectly falling back to 30 days for AI insights
 * and taste profile, making them identical to the 30d filter.
 */
export function useListenDateRange(): {
  startDate: string | undefined;
  endDate: string | undefined;
  isLoading: boolean;
  isAll: boolean;
} {
  const searchParams = useSearchParams();
  const viewerUserId = useDashboardViewerUserId();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const hasUrlDates = !!startDateParam && !!endDateParam;

  const { data, isLoading } = useQuery<DateRangeResponse>({
    queryKey: listenDateRangeKeys.list(viewerUserId),
    queryFn: () => {
      const q =
        viewerUserId !== undefined && viewerUserId !== ""
          ? `?userId=${encodeURIComponent(viewerUserId)}`
          : "";
      return apiClient.get<DateRangeResponse>(`/date-range${q}`);
    },
    enabled: !hasUrlDates,
    staleTime: DATE_RANGE_STALE_TIME,
  });

  return useMemo(() => {
    if (hasUrlDates) {
      return {
        startDate: startDateParam!,
        endDate: endDateParam!,
        isLoading: false,
        isAll: false,
      };
    }

    if (data?.startDate && data?.endDate) {
      return {
        startDate: data.startDate,
        endDate: data.endDate,
        isLoading: false,
        isAll: true,
      };
    }

    return {
      startDate: undefined,
      endDate: undefined,
      isLoading,
      isAll: true,
    };
  }, [hasUrlDates, startDateParam, endDateParam, data, isLoading]);
}
