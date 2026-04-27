"use client";

import { useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CalendarHeatmap, HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { useTimeline } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { HeatmapCalendarSkeleton } from "@/lib/components/skeleton-loaders";

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
        className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20"
        aria-busy="true"
        aria-label={tHeatmap("calendarTitle")}
      >
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        </div>
        <div className="p-6 sm:p-8">
          <HeatmapCalendarSkeleton />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        message={tHeatmap("errorLoading")}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40"
      aria-labelledby="overview-heatmap-calendar-title"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-80 dark:opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 60%)",
        }}
      />
      <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-24 bg-accent-violet/10 dark:bg-accent-violet/15 blur-3xl rounded-full" />

      <div className="relative">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <h2
                  id="overview-heatmap-calendar-title"
                  className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
                >
                  {tHeatmap("calendarTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {tHeatmap("overviewCalendarHint")}
                </p>
              </div>
            </div>
            <Link
              href={heatmapPageHref}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20 transition-colors duration-200 shrink-0"
            >
              {tOverview("seeMore")}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {heatmapData.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {tHeatmap("noDataPeriod")}
            </p>
          )}
        </div>
        <div className="p-6 sm:p-8 md:p-10">
          {heatmapData.length > 0 ? (
            <CalendarHeatmap
              data={heatmapData}
              startDate={rangeStart}
              endDate={rangeEnd}
              selectedDate={null}
              onDayClick={handleDayClick}
              locale={locale}
            />
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>{tHeatmap("noDataPeriod")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
