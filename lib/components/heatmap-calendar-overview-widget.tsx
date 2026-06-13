"use client";

import { useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CalendarHeatmap, HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { useTimeline } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { HeatmapCalendarSkeleton } from "@/lib/components/skeleton-loaders";
import {
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_HEADER_LINK_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OVERVIEW_STARTUP_SURFACE_BASE,
  OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS,
  OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS,
  OVERVIEW_STARTUP_WIDGET_TITLE_CLASS,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";
import { LiveStatusDot } from "@/lib/components/live-status-dot";

function toDateOnly(date: string): string {
  return date.split("T")[0];
}

export type HeatmapCalendarOverviewWidgetProps = {
  startDate?: string;
  endDate?: string;
};

/**
 * Aperçu du calendrier heatmap (même rendu que la section principale de /dashboard/heatmap),
 * sans statistiques ni panneau de détail au clic — navigation vers la page heatmap complète.
 */
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

  if (isLoading) {
    return (
      <section
        className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[320px] flex-col animate-fade-in-up`}
        aria-busy="true"
        aria-label={tHeatmap("calendarTitle")}
      >
        <OverviewStartupSurfaceBg />
        <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-6 w-44 max-w-full rounded-full bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a]" />
              <div className="h-8 w-64 max-w-full rounded-lg bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a]" />
              <div className="h-4 w-full max-w-md rounded-lg bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a]" />
            </div>
            <div className="h-11 w-28 shrink-0 rounded-2xl bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a] sm:self-start" />
          </div>
        </div>
        <div className="relative flex-1 p-6 sm:p-8">
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <HeatmapCalendarSkeleton />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[320px] flex-col animate-fade-in-up`}
        aria-labelledby="overview-heatmap-calendar-title"
      >
        <OverviewStartupSurfaceBg />
        <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
          <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
            <LiveStatusDot />
            {tHeatmap("heroEyebrow")}
          </div>
          <h2 id="overview-heatmap-calendar-title" className={OVERVIEW_STARTUP_WIDGET_TITLE_CLASS}>
            {tHeatmap("calendarTitle")}
          </h2>
          <p className={OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS}>{tHeatmap("overviewCalendarHint")}</p>
        </div>
        <div className="relative flex-1 p-6 sm:p-8">
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <ErrorState
              error={error}
              message={tHeatmap("errorLoading")}
              onRetry={() => refetch()}
              className="py-8"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${OVERVIEW_STARTUP_SURFACE_BASE} animate-fade-in-up flex min-h-[320px] flex-col`}
      aria-labelledby="overview-heatmap-calendar-title"
    >
      <OverviewStartupSurfaceBg />

      <div className="relative">
        <div className={`${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
                <LiveStatusDot />
                {tHeatmap("heroEyebrow")}
              </div>
              <h2 id="overview-heatmap-calendar-title" className={OVERVIEW_STARTUP_WIDGET_TITLE_CLASS}>
                {tHeatmap("calendarTitle")}
              </h2>
              <p className={OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS}>{tHeatmap("overviewCalendarHint")}</p>
            </div>
            <Link href={heatmapPageHref} className={OVERVIEW_STARTUP_HEADER_LINK_CLASS}>
              {tOverview("seeMore")}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {heatmapData.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{tHeatmap("noDataPeriod")}</p>
          ) : null}
        </div>
        <div className="p-6 sm:p-8">
          {heatmapData.length > 0 ? (
            <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
              <CalendarHeatmap
                data={heatmapData}
                startDate={rangeStart}
                endDate={rangeEnd}
                selectedDate={null}
                onDayClick={handleDayClick}
                locale={locale}
                colorScheme="aurora"
              />
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200/90 bg-slate-50/90 py-12 text-center text-sm text-slate-600 shadow-inner shadow-slate-900/[0.04] backdrop-blur dark:border-white/[0.06] dark:bg-[#0c0e18] dark:text-slate-400 dark:shadow-none">
              <p>{tHeatmap("noDataPeriod")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
