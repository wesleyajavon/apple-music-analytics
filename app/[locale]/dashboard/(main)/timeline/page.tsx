"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useTimeline, type TimelineDataPoint } from "@/lib/hooks/use-listening";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import {
  TimelineMobileEmpty,
  TimelineMobileError,
  TimelineMobileExperience,
  TimelineMobileSkeleton,
} from "@/lib/components/timeline-mobile";
import {
  getPeriodFromSearchParams,
  PeriodSelector,
  type PeriodType,
} from "@/lib/components/period-selector";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewSingle,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_CHART_CONTROLS_ROW,
} from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useTheme } from "@/lib/providers/theme-provider";

/**
 * Formate une date selon le type de période
 * Fonction pure, peut être mémorisée si nécessaire
 */
function formatDate(date: string, period: PeriodType, locale: string): string {
  switch (period) {
    case "day": {
      const d = new Date(date);
      return d.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
    }
    case "week": {
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startStr = weekStart.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      const endStr = weekEnd.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      return `${startStr} - ${endStr}`;
    }
    case "month": {
      const [year, month] = date.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString(locale, {
        month: "short",
        year: "numeric",
      });
    }
  }
}

function TimelineMetricStrip({
  data,
  period,
  locale,
  loading = false,
}: {
  data?: TimelineDataPoint[];
  period: PeriodType;
  locale: string;
  loading?: boolean;
}) {
  const t = useTranslations("timeline");
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { key: "total", label: t("heroStatTotal"), value: null as string | null, hint: null as string | null },
        { key: "peak", label: t("heroStatPeak"), value: null, hint: null },
        { key: "buckets", label: t("heroStatBuckets"), value: null, hint: null },
      ];
    }
    const total = data.reduce((s, p) => s + p.listens, 0);
    const peakPt = data.reduce((a, b) => (b.listens > a.listens ? b : a));
    return [
      {
        key: "total",
        label: t("heroStatTotal"),
        value: total.toLocaleString(locale),
        hint: null,
      },
      {
        key: "peak",
        label: t("heroStatPeak"),
        value: peakPt.listens.toLocaleString(locale),
        hint: formatDate(peakPt.date, period, locale),
      },
      {
        key: "buckets",
        label: t("heroStatBuckets"),
        value: data.length.toLocaleString(locale),
        hint: null,
      },
    ];
  }, [data, locale, period, t]);

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
              <span className={DASHBOARD_METRIC_VALUE}>{metric.value}</span>
              {metric.hint ? (
                <span className="truncate text-[13px] text-muted" title={metric.hint}>
                  {metric.hint}
                </span>
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function TimelineChartSkeleton() {
  return (
    <div className="relative min-h-[320px]" aria-busy="true">
      <div className="flex h-[280px] flex-col justify-between">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-glass-hairline" />
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-12 top-8">
        <svg className="h-full w-full" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 250 C110 175 190 225 300 175 S500 115 610 165 720 215 800 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/40"
          />
        </svg>
      </div>
    </div>
  );
}

function TimelineContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("timeline");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const chartThemeName = resolvedTheme === "dark" ? "dark" : "light";

  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const period = getPeriodFromSearchParams(searchParams, "month");
  const userId = searchParams.get("userId") ?? undefined;

  const { data, isLoading, error, refetch } = useTimeline(
    startDate,
    endDate,
    period,
    userId,
  );

  const chartData = useMemo(
    () =>
      data?.map((point) => ({
        ...point,
        formattedDate: formatDate(point.date, period, locale),
      })) || [],
    [data, period, locale],
  );

  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewSingle(chartData, chartView, "listens"),
    [chartData, chartView],
  );

  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${t("listens")}`,
    [locale, t],
  );

  const series = useMemo(
    () => [
      {
        dataKey: "listens",
        name: t("Listens"),
        color: getCrystalSeriesColor(2, chartThemeName),
      },
    ],
    [chartThemeName, t],
  );

  const emptyStatePresets = useEmptyStatePresets();

  return (
    <>
      <div className={DASHBOARD_CHART_CONTROLS_ROW}>
        <PeriodSelector defaultPeriod="month" value={period} />
        <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
      </div>

      <div className="lg:hidden">
        {isLoading ? (
          <TimelineMobileSkeleton />
        ) : error ? (
          <TimelineMobileError locale={locale} error={error} onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <TimelineMobileEmpty />
        ) : (
          <TimelineMobileExperience data={data} period={period} locale={locale} />
        )}
      </div>

      <div className="mt-4 hidden space-y-6 lg:mt-6 lg:block lg:space-y-8">
        <OverviewHeroFrame title={t("title")} description={t("subtitle")} />
        <TimelineMetricStrip
          data={error || !data || data.length === 0 ? undefined : data}
          period={period}
          locale={locale}
          loading={isLoading}
        />

        {!isLoading && error ? (
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        ) : !isLoading && (!data || data.length === 0) ? (
          <EmptyState variant="startup" {...emptyStatePresets.changeDates(pathname)} />
        ) : (
          <section className="w-full min-w-0" aria-labelledby="timeline-chart-title">
            <p className={DASHBOARD_SECTION_EYEBROW}>{t("heroStatBadge")}</p>
            <h2 id="timeline-chart-title" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
              {t("chartTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{t("chartHint")}</p>
            <div className="mt-8">
              {isLoading ? (
                <TimelineChartSkeleton />
              ) : (
                <OverviewTrendsChart
                  data={displayChartData}
                  series={series}
                  formatValue={formatValue}
                  heightToken="timelineMain"
                  minWidth={
                    displayChartData.length > 10
                      ? Math.max(320, displayChartData.length * 32)
                      : undefined
                  }
                />
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function TimelineFallback() {
  const t = useTranslations("timeline");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const period = getPeriodFromSearchParams(searchParams, "month");
  return (
    <>
      <div className={DASHBOARD_CHART_CONTROLS_ROW}>
        <div className="h-11 w-64 animate-shimmer rounded-full bg-black/10 dark:bg-white/10" />
      </div>
      <div className="mt-4 space-y-6 lg:mt-6 lg:space-y-8">
        <TimelineMobileSkeleton />
        <div className="hidden space-y-6 lg:block">
          <OverviewHeroFrame title={t("title")} description={t("subtitle")} />
          <TimelineMetricStrip period={period} locale={locale} loading />
          <TimelineChartSkeleton />
        </div>
      </div>
    </>
  );
}

export default function TimelinePage() {
  return (
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<TimelineFallback />}>
        <TimelineContent />
      </Suspense>
    </div>
  );
}
