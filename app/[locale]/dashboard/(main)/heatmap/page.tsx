"use client";

import {
  useMemo,
  useCallback,
  Suspense,
  useState,
  useRef,
  useEffect,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  CalendarHeatmap,
  HeatmapDataPoint,
} from "@/lib/components/calendar-heatmap";
import {
  useTimeline,
  useListens,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { HeatmapDayDetailsPanel } from "@/lib/components/heatmap-day-details-panel";
import {
  HeatmapMobileEmpty,
  HeatmapMobileError,
  HeatmapMobileExperience,
  HeatmapMobileNoDayDetail,
  HeatmapMobileSkeleton,
  type HeatmapMobileTopDay,
} from "@/lib/components/heatmap-mobile";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { HeatmapSkeleton } from "@/lib/components/skeleton-loaders";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";

type HeatmapSummaryStats = {
  totalListens: number;
  daysWithListens: number;
  totalDays: number;
  averageListens: number;
  mostActiveWeekday: string;
};

type HeatmapComputedStats = HeatmapSummaryStats & {
  maxListens: number;
  minListens: number;
  maxDay: {
    date: string;
    listens: number;
    formatted: string;
  } | null;
  minDay: {
    date: string;
    listens: number;
    formatted: string;
  } | null;
};

function HeatmapMetricStrip({
  stats,
  locale,
  loading = false,
}: {
  stats?: HeatmapSummaryStats | null;
  locale: string;
  loading?: boolean;
}) {
  const t = useTranslations("heatmap");
  const pct =
    stats && stats.totalDays > 0
      ? Math.round((stats.daysWithListens / stats.totalDays) * 100)
      : null;
  const metrics = [
    {
      key: "total",
      label: t("totalListens"),
      value: stats ? stats.totalListens.toLocaleString(locale) : null,
      hint: null as string | null,
    },
    {
      key: "active",
      label: t("activeDays"),
      value: stats
        ? `${stats.daysWithListens.toLocaleString(locale)} / ${stats.totalDays.toLocaleString(locale)}`
        : null,
      hint: pct != null ? `${pct}% ${t("ofDays")}` : null,
    },
    {
      key: "avg",
      label: t("avgDaily"),
      value: stats ? stats.averageListens.toLocaleString(locale) : null,
      hint: t("listensPerDay"),
    },
    {
      key: "favorite",
      label: t("favoriteDay"),
      value: stats ? stats.mostActiveWeekday : null,
      hint: t("favoriteDayHint"),
    },
  ];

  return (
    <div
      className={`${DASHBOARD_METRIC_STRIP} w-full max-lg:flex-nowrap max-lg:overflow-x-auto`}
      aria-busy={loading || undefined}
    >
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[10.5rem] max-lg:flex-none`}
        >
          <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
          {metric.value == null ? (
            <span
              className={`${DASHBOARD_METRIC_VALUE} inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`}
            />
          ) : (
            <>
              <span className={`${DASHBOARD_METRIC_VALUE} truncate`} title={metric.value}>
                {metric.value}
              </span>
              {metric.hint ? (
                <span className="truncate text-[13px] text-muted">{metric.hint}</span>
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function formatMobileDayLabel(date: string, locale: string, format: "short" | "long") {
  const d = new Date(toDateOnly(date) + "T12:00:00Z");
  if (format === "short") {
    return d.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return d.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function HeatmapPageFallback() {
  const t = useTranslations("heatmap");
  const locale = useLocale();
  return (
    <>
      <div className="lg:hidden">
        <HeatmapMobileSkeleton />
      </div>
      <div className="hidden space-y-6 lg:block">
        <OverviewHeroFrame title={t("title")} description={t("subtitle")} />
        <HeatmapMetricStrip locale={locale} loading />
        <HeatmapSkeleton />
      </div>
    </>
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
  const locale = useLocale();
  const isLg = useIsLgChartViewport();
  const emptyStatePresets = useEmptyStatePresets();
  const selectedDateParam = searchParams.get("selectedDate");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    selectedDateParam,
  );
  const dayDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && isLg && dayDetailsRef.current) {
      dayDetailsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedDate, isLg]);

  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

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

  const stats = useMemo<HeatmapComputedStats | null>(() => {
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

  const topActiveDays = useMemo<HeatmapMobileTopDay[]>(() => {
    if (!timelineData?.length) return [];
    return [...timelineData]
      .filter((point) => point.listens > 0)
      .sort((a, b) => b.listens - a.listens)
      .slice(0, 5)
      .map((point) => ({
        date: toDateOnly(point.date),
        formatted: formatMobileDayLabel(point.date, locale, "long"),
        shortLabel: formatMobileDayLabel(point.date, locale, "short"),
        listens: point.listens,
      }));
  }, [timelineData, locale]);

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
      <>
        <div className="lg:hidden">
          <HeatmapMobileError locale={locale} error={error} onRetry={handleRetry} />
        </div>
        <div className="hidden space-y-6 lg:block">
          <OverviewHeroFrame title={t("title")} description={t("subtitle")} />
          <HeatmapMetricStrip locale={locale} />
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={handleRetry}
          />
        </div>
      </>
    );
  }

  if (!isLoading && (!timelineData || timelineData.length === 0)) {
    return (
      <>
        <div className="lg:hidden">
          <HeatmapMobileEmpty />
        </div>
        <div className="hidden space-y-6 lg:block">
          <OverviewHeroFrame title={t("title")} description={t("subtitle")} />
          <HeatmapMetricStrip locale={locale} />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden">
        {isLoading ? (
          <HeatmapMobileSkeleton />
        ) : stats ? (
          <HeatmapMobileExperience
            stats={stats}
            topDays={topActiveDays}
            heatmapData={heatmapData}
            calendarStart={calendarStart}
            calendarEnd={calendarEnd}
            selectedDate={selectedDate}
            locale={locale}
            onDayClick={handleDayClick}
          />
        ) : null}
      </div>

      <div className="hidden space-y-6 lg:block lg:space-y-8">
        <OverviewHeroFrame title={t("title")} description={t("subtitle")} />
        <HeatmapMetricStrip
          stats={
            stats
              ? {
                  totalListens: stats.totalListens,
                  daysWithListens: stats.daysWithListens,
                  totalDays: stats.totalDays,
                  averageListens: stats.averageListens,
                  mostActiveWeekday: stats.mostActiveWeekday,
                }
              : null
          }
          locale={locale}
          loading={isLoading}
        />

        <section className="w-full min-w-0" aria-labelledby="heatmap-calendar-title">
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("heroStatBadge")}</p>
          <h2 id="heatmap-calendar-title" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
            {t("calendarTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{t("calendarHint")}</p>
          {heatmapData.length === 0 && !isLoading ? (
            <p className="mt-2 text-[13px] text-muted">{t("noDataPeriod")}</p>
          ) : null}
          <div className="mt-8">
            {isLoading ? (
              <HeatmapSkeleton />
            ) : heatmapData.length > 0 ? (
              <CalendarHeatmap
                data={heatmapData}
                startDate={calendarStart}
                endDate={calendarEnd}
                selectedDate={selectedDate}
                onDayClick={handleDayClick}
                locale={locale}
                colorScheme="aurora"
              />
            ) : (
              <p className="py-12 text-center text-[13px] text-muted">{t("noDataPeriod")}</p>
            )}
          </div>
        </section>
      </div>

      <MobileBottomSheet
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        ariaLabelledBy="heatmap-day-details-title"
        insetAboveBottomNav
      >
        {selectedDate ? (
          <section
            ref={dayDetailsRef}
            className="scroll-mt-8 animate-fade-in-up lg:mt-8"
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
                <>
                  <div className="lg:hidden">
                    <HeatmapMobileNoDayDetail />
                  </div>
                  <div className="hidden lg:block">
                    <EmptyState variant="startup" {...emptyStatePresets.noDayDetail} />
                  </div>
                </>
              }
            />
          </section>
        ) : null}
      </MobileBottomSheet>
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
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<HeatmapPageFallback />}>
        <HeatmapContent key={filterKey} />
      </Suspense>
    </div>
  );
}
