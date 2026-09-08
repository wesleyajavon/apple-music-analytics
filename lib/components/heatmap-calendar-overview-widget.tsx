"use client";

import { useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CalendarHeatmap, HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { useTimeline } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { HeatmapCalendarSkeleton } from "@/lib/components/skeleton-loaders";
import { OverviewCanvasFrame } from "@/lib/components/overview-section";

function toDateOnly(date: string): string {
  return date.split("T")[0];
}

export type HeatmapCalendarOverviewWidgetProps = {
  startDate?: string;
  endDate?: string;
};

export function HeatmapCalendarOverviewWidget({
  startDate,
  endDate,
}: HeatmapCalendarOverviewWidgetProps) {
  const tHeatmap = useTranslations("heatmap");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const router = useRouter();
  const viewerUserId = useDashboardViewerUserId();

  const { data: timelineData, isLoading, error, refetch } = useTimeline(
    startDate,
    endDate,
    "day",
    viewerUserId
  );

  const heatmapData: HeatmapDataPoint[] = useMemo(() => {
    if (!timelineData) return [];
    return timelineData.map((point) => ({
      date: point.date,
      count: point.listens,
    }));
  }, [timelineData]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (startDate && endDate) {
      return { rangeStart: startDate, rangeEnd: endDate };
    }
    if (!timelineData?.length) {
      return {
        rangeStart: undefined as string | undefined,
        rangeEnd: undefined as string | undefined,
      };
    }
    const dates = timelineData.map((p) => toDateOnly(p.date));
    const sorted = [...dates].sort();
    return {
      rangeStart: sorted[0],
      rangeEnd: sorted[sorted.length - 1],
    };
  }, [startDate, endDate, timelineData]);

  const heatmapPageHref = useMemo(() => {
    const params = new URLSearchParams();
    const s = startDate ?? rangeStart;
    const e = endDate ?? rangeEnd;
    if (s) params.set("startDate", s);
    if (e) params.set("endDate", e);
    if (viewerUserId) params.set("userId", viewerUserId);
    const q = params.toString();
    return `/dashboard/heatmap${q ? `?${q}` : ""}`;
  }, [startDate, endDate, rangeStart, rangeEnd, viewerUserId]);

  const handleDayClick = useCallback(
    (date: string, count: number) => {
      if (count === 0) return;
      const params = new URLSearchParams();
      const s = startDate ?? rangeStart;
      const e = endDate ?? rangeEnd;
      if (s) params.set("startDate", s);
      if (e) params.set("endDate", e);
      if (viewerUserId) params.set("userId", viewerUserId);
      params.set("selectedDate", date);
      const q = params.toString();
      router.push(`/dashboard/heatmap${q ? `?${q}` : ""}`);
    },
    [router, startDate, endDate, rangeStart, rangeEnd, viewerUserId]
  );

  const chrome = {
    eyebrow: tHeatmap("heroEyebrow"),
    title: tHeatmap("calendarTitle"),
    description: tHeatmap("overviewCalendarHint"),
    titleId: "overview-heatmap-calendar-title",
    seeMoreHref: heatmapPageHref,
    seeMoreLabel: tOverview("seeMore"),
  };

  if (isLoading) {
    return (
      <OverviewCanvasFrame {...chrome} seeMoreHref={undefined} seeMoreLabel={undefined}>
        <HeatmapCalendarSkeleton />
      </OverviewCanvasFrame>
    );
  }

  if (error) {
    return (
      <OverviewCanvasFrame {...chrome}>
        <ErrorState
          error={error}
          message={tHeatmap("errorLoading")}
          onRetry={() => refetch()}
        />
      </OverviewCanvasFrame>
    );
  }

  return (
    <OverviewCanvasFrame {...chrome}>
      {heatmapData.length > 0 ? (
        <CalendarHeatmap
          data={heatmapData}
          startDate={rangeStart}
          endDate={rangeEnd}
          selectedDate={null}
          onDayClick={handleDayClick}
          locale={locale}
          colorScheme="aurora"
        />
      ) : (
        <p className="py-8 text-[13px] text-muted">{tHeatmap("noDataPeriod")}</p>
      )}
    </OverviewCanvasFrame>
  );
}
