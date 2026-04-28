"use client";

import { useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { CalendarHeatmap, HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { useTimeline } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { HeatmapCalendarSkeleton } from "@/lib/components/skeleton-loaders";

const HEATMAP_OVERVIEW_CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-sky-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.11),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.1),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-2xl ring-1 ring-sky-300/10 backdrop-blur-sm transition-all duration-300 hover:border-sky-300/35 hover:shadow-[0_0_50px_-12px_rgba(56,189,248,0.28)] dark:border-sky-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.14),_transparent_30%),rgb(var(--card-rgb)/0.9)] dark:ring-sky-300/15";
const HEATMAP_RAIL_CLASS = "bg-gradient-to-r from-emerald-300 via-sky-400 to-violet-400";

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
        className={HEATMAP_OVERVIEW_CARD_CLASS}
        aria-busy="true"
        aria-label={tHeatmap("calendarTitle")}
      >
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${HEATMAP_RAIL_CLASS} opacity-85`} />
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-400/12 blur-3xl dark:bg-sky-400/16" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-400/16" />
        <div className="relative border-b border-sky-200/20 px-6 py-5 dark:border-sky-300/10">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        </div>
        <div className="relative p-6 sm:p-8">
          <div className="rounded-2xl border border-sky-200/20 bg-white/50 p-3 shadow-inner dark:border-sky-300/10 dark:bg-slate-950/20">
            <HeatmapCalendarSkeleton />
          </div>
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
      className={`${HEATMAP_OVERVIEW_CARD_CLASS} animate-fade-in-up`}
      aria-labelledby="overview-heatmap-calendar-title"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${HEATMAP_RAIL_CLASS} opacity-85`} />
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-400/12 blur-3xl dark:bg-sky-400/16" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-400/16" />

      <div className="relative">
        <div className="border-b border-sky-200/20 px-6 py-5 dark:border-sky-300/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 text-sky-600 shadow-sm shadow-sky-950/10 dark:text-sky-200">
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
                <p className="text-sm text-sky-700/75 dark:text-sky-100/65 mt-0.5">
                  {tHeatmap("overviewCalendarHint")}
                </p>
              </div>
            </div>
            <Link
              href={heatmapPageHref}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/15 transition-colors duration-200 shrink-0"
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
            <div className="relative rounded-2xl border border-sky-200/20 bg-white/50 p-3 shadow-inner dark:border-sky-300/10 dark:bg-slate-950/20">
              <div className="pointer-events-none absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-400/15" />
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
            <div className="rounded-xl border border-sky-200/20 bg-white/50 py-12 text-center text-gray-500 dark:border-sky-300/10 dark:bg-slate-950/20 dark:text-gray-400">
              <p>{tHeatmap("noDataPeriod")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
