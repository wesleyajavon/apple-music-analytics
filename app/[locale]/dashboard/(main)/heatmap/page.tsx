"use client";

import {
  useMemo,
  useCallback,
  Suspense,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarHeatmap,
  HeatmapDataPoint,
} from "@/lib/components/calendar-heatmap";
import {
  useTimeline,
  useListens,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { HeatmapDayDetailsPanel } from "@/lib/components/heatmap-day-details-panel";
import { HeatmapSkeleton } from "@/lib/components/skeleton-loaders";
import { Activity, CalendarDays } from "lucide-react";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
} from "@/lib/constants/dashboard-spotlight";

/** Aligné hero `/dashboard/timeline` — startup / Vercel */
const HEATMAP_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const HEATMAP_CALENDAR_SECTION_CLASS = `relative ${DASHBOARD_SPOTLIGHT_SHELL}`;

function HeatmapHeroFrame({ badgeLabel, stats }: { badgeLabel: string; stats: ReactNode }) {
  const t = useTranslations("heatmap");
  return (
    <div className={HEATMAP_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <CalendarDays className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" strokeWidth={1.5} aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              {badgeLabel}
            </span>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/timeline"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <Activity className="h-4 w-4" aria-hidden />
              {t("ctaTimeline")}
            </Link>
          </div>
        </div>

        <div className="relative lg:mt-0">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
              </div>
              {stats ?? (
                <p className="pt-4 text-sm leading-6 text-white/60">{t("heroStatsPlaceholder")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type HeatmapSummaryStats = {
  totalListens: number;
  daysWithListens: number;
  totalDays: number;
  averageListens: number;
  mostActiveWeekday: string;
};

function HeatmapHeroStats({ stats, locale }: { stats: HeatmapSummaryStats; locale: string }) {
  const t = useTranslations("heatmap");
  const pct =
    stats.totalDays > 0
      ? Math.round((stats.daysWithListens / stats.totalDays) * 100)
      : 0;
  return (
    <div className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-2 lg:gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold tracking-tight text-white tabular-nums sm:text-xl">{stats.totalListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("totalListens")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold tracking-tight text-white tabular-nums sm:text-xl">
          {stats.daysWithListens.toLocaleString(locale)} / {stats.totalDays.toLocaleString(locale)}
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("activeDays")}</p>
        <p className="mt-0.5 text-xs text-white/65">{pct}% {t("ofDays")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold tracking-tight text-white tabular-nums sm:text-xl">{stats.averageListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("avgDaily")}</p>
        <p className="mt-0.5 text-xs text-white/65">{t("listensPerDay")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl" title={stats.mostActiveWeekday}>{stats.mostActiveWeekday}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("favoriteDay")}</p>
        <p className="mt-0.5 text-xs text-white/65">{t("favoriteDayHint")}</p>
      </div>
    </div>
  );
}

function HeatmapHeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 pt-4 lg:gap-3" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-16 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function HeatmapPageFallback() {
  const t = useTranslations("heatmap");
  const tOverview = useTranslations("overview");
  return (
    <div className="space-y-8">
      <HeatmapHeroFrame
        badgeLabel={tOverview("allData")}
        stats={<HeatmapHeroStatsSkeleton />}
      />
      <section className={HEATMAP_CALENDAR_SECTION_CLASS}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
        <div className="relative p-6 sm:p-8">
          <HeatmapSkeleton />
        </div>
      </section>
    </div>
  );
}

/** Normalise une date (string ou Date) en YYYY-MM-DD pour éviter Invalid Date */
function toDateOnly(date: string | Date): string {
  if (typeof date === "string") return date.split("T")[0];
  return date.toISOString().split("T")[0];
}

function HeatmapContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("heatmap");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const selectedDateParam = searchParams.get("selectedDate");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    selectedDateParam,
  );
  const dayDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && dayDetailsRef.current) {
      dayDetailsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedDate]);

  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const { startDate: badgeStart, endDate: badgeEnd } = useListenDateRange();
  const badgeRangeLabel = formatOverviewDateRangeLabel(
    badgeStart,
    badgeEnd,
    locale,
  );
  const badgeLabel = badgeRangeLabel
    ? t("dateRangeBadge", { range: badgeRangeLabel })
    : tOverview("allData");

  const {
    data: timelineData,
    isLoading,
    error,
    refetch,
  } = useTimeline(startDate, endDate, "day", userId);

  const { data: temporalData } = useTemporalAnalysis(
    startDate,
    endDate,
    userId,
  );

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

  const calendarStart = startDate ?? rangeStart;
  const calendarEnd = endDate ?? rangeEnd;

  const heatmapData: HeatmapDataPoint[] = useMemo(() => {
    if (!timelineData) return [];

    return timelineData.map((point) => ({
      date: point.date,
      count: point.listens,
    }));
  }, [timelineData]);

  const totalDaysInRange = useMemo(() => {
    if (!calendarStart || !calendarEnd) return 1;
    const start = new Date(calendarStart);
    const end = new Date(calendarEnd);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [calendarStart, calendarEnd]);

  const daysForDailyAverage = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return 1;
    const dates = timelineData.map((p) => toDateOnly(p.date));
    const first = new Date(
      Math.min(...dates.map((d) => new Date(d).getTime())),
    );
    const last = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    const diffTime = last.getTime() - first.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [timelineData]);

  const stats = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return null;
    }

    const totalListens = timelineData.reduce(
      (sum, point) => sum + point.listens,
      0,
    );
    const daysWithListens = timelineData.filter(
      (point) => point.listens > 0,
    ).length;
    const averageListens = totalListens / daysForDailyAverage;

    const sortedByListens = [...timelineData].sort(
      (a, b) => b.listens - a.listens,
    );
    const maxListens = sortedByListens[0]?.listens || 0;
    const minListens =
      timelineData
        .filter((p) => p.listens > 0)
        .sort((a, b) => a.listens - b.listens)[0]?.listens || 0;

    const maxDay = sortedByListens[0];
    const minDay = timelineData
      .filter((p) => p.listens > 0)
      .sort((a, b) => a.listens - b.listens)[0];

    const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
    const weekdaysT = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    let mostActiveWeekday = "—";
    if (temporalData?.byDayOfWeek?.length) {
      temporalData.byDayOfWeek.forEach((d, i) => {
        weekdayDistribution[(i + 1) % 7] = d.listens;
      });
      if (temporalData.peakDay != null) {
        mostActiveWeekday = t(
          `weekdays.${weekdaysT[temporalData.peakDay.dayOfWeek]}`,
        );
      }
    } else {
      timelineData.forEach((point) => {
        const dayOfWeek = new Date(
          toDateOnly(point.date) + "T12:00:00Z",
        ).getUTCDay();
        weekdayDistribution[dayOfWeek] += point.listens;
      });
      const weekdays = weekdaysT.map((k) => t(`weekdays.${k}`));
      const maxWeekdayIndex = weekdayDistribution.indexOf(
        Math.max(...weekdayDistribution),
      );
      mostActiveWeekday = weekdays[maxWeekdayIndex];
    }

    return {
      totalListens,
      daysWithListens,
      totalDays: totalDaysInRange,
      averageListens: Math.round(averageListens * 10) / 10,
      maxListens,
      minListens,
      maxDay: maxDay
        ? {
            date: maxDay.date,
            listens: maxDay.listens,
            formatted: new Date(
              toDateOnly(maxDay.date) + "T12:00:00Z",
            ).toLocaleDateString(locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }
        : null,
      minDay: minDay
        ? {
            date: minDay.date,
            listens: minDay.listens,
            formatted: new Date(
              toDateOnly(minDay.date) + "T12:00:00Z",
            ).toLocaleDateString(locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }
        : null,
      mostActiveWeekday,
    };
  }, [
    timelineData,
    temporalData,
    totalDaysInRange,
    daysForDailyAverage,
    t,
    locale,
  ]);

  const handleDayClick = useCallback((date: string, count: number) => {
    if (count === 0) {
      setSelectedDate(null);
      return;
    }

    setSelectedDate(date);
  }, []);

  const dayListensParams = useMemo(() => {
    if (!selectedDate) return undefined;

    return {
      startDate: selectedDate,
      endDate: selectedDate,
      limit: 500,
      userId,
    };
  }, [selectedDate, userId]);

  const { data: dayListensData, isLoading: isLoadingDayListens } = useListens(
    dayListensParams,
    { enabled: !!selectedDate },
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (!isLoading && error) {
    return (
      <div className="space-y-8">
        <HeatmapHeroFrame badgeLabel={badgeLabel} stats={null} />
        <section className={HEATMAP_CALENDAR_SECTION_CLASS}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
          <div className="relative p-6 sm:p-8">
            <ErrorState
              variant="startup"
              error={error}
              message={t("errorLoading")}
              onRetry={handleRetry}
            />
          </div>
        </section>
      </div>
    );
  }

  if (!isLoading && (!timelineData || timelineData.length === 0)) {
    return (
      <div className="space-y-8">
        <HeatmapHeroFrame badgeLabel={badgeLabel} stats={null} />
        <EmptyState variant="startup" {...emptyStatePresets.importData} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <HeatmapHeroFrame
          badgeLabel={badgeLabel}
          stats={
            isLoading ? (
              <HeatmapHeroStatsSkeleton />
            ) : stats ? (
              <HeatmapHeroStats
                stats={{
                  totalListens: stats.totalListens,
                  daysWithListens: stats.daysWithListens,
                  totalDays: stats.totalDays,
                  averageListens: stats.averageListens,
                  mostActiveWeekday: stats.mostActiveWeekday,
                }}
                locale={locale}
              />
            ) : null
          }
        />

        <section
          className={`${HEATMAP_CALENDAR_SECTION_CLASS} animate-fade-in-up transition-all duration-300`}
          aria-labelledby="heatmap-spotlight-title"
        >
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
          <div className="relative">
            <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50/90 text-lime-700 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-lime-300">
                  <CalendarDays className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <h2 id="heatmap-spotlight-title" className={DASHBOARD_SPOTLIGHT_TITLE}>
                    {t("calendarTitle")}
                  </h2>
                  <p className={`mt-1 max-w-2xl ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("calendarHint")}</p>
                  {heatmapData.length === 0 && (
                    <p className={`mt-2 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("noDataPeriod")}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8">
              {isLoading ? (
                <HeatmapSkeleton />
              ) : heatmapData.length > 0 ? (
                <div className={`relative ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
                  <div className="pointer-events-none absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-lime-400/10 blur-3xl dark:bg-violet-400/12" aria-hidden />
                  <div className="relative">
                    <CalendarHeatmap
                      data={heatmapData}
                      startDate={calendarStart}
                      endDate={calendarEnd}
                      selectedDate={selectedDate}
                      onDayClick={handleDayClick}
                      locale={locale}
                      colorScheme="aurora"
                    />
                  </div>
                </div>
              ) : (
                <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} py-12 text-center ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                  <p>{t("noDataPeriod")}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {selectedDate && (
        <section
          ref={dayDetailsRef}
          className="mt-8 scroll-mt-8 animate-fade-in-up"
          aria-labelledby="heatmap-day-details-title"
        >
          <HeatmapDayDetailsPanel
            selectedDate={selectedDate}
            locale={locale}
            onClose={() => setSelectedDate(null)}
            dayListens={dayListensData}
            isLoading={isLoadingDayListens}
            periodDailyAverage={
              stats && stats.averageListens > 0 ? stats.averageListens : null
            }
            periodMaxListens={stats?.maxListens ?? 0}
            periodMaxDayDate={
              stats?.maxDay ? toDateOnly(stats.maxDay.date) : null
            }
            emptyStateNoPlays={
              <EmptyState variant="startup" {...emptyStatePresets.noDayDetail} />
            }
          />
        </section>
      )}
    </>
  );
}

export default function HeatmapPage() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";
  const selectedDateParam = searchParams.get("selectedDate") ?? "";
  const filterKey = `${startDateParam}-${endDateParam}-${selectedDateParam}`;

  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<HeatmapPageFallback />}>
        <HeatmapContent key={filterKey} />
      </Suspense>
    </div>
  );
}
