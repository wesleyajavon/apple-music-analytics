"use client";

import { Suspense, memo, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Activity, CalendarDays, ChevronDown } from "lucide-react";
import { useTimeline, type TimelineDataPoint } from "@/lib/hooks/use-listening";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { PeriodSelector, PeriodType } from "@/lib/components/period-selector";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewSingle,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { useTheme } from "@/lib/providers/theme-provider";
import { LiveStatusDot } from "@/lib/components/live-status-dot";

type ChartPalette = (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
type TimelineMobileSummary = {
  total: number;
  peak: TimelineDataPoint;
  average: number;
  count: number;
  trendDelta: number;
  trendDirection: "up" | "down" | "flat";
  topBuckets: TimelineDataPoint[];
};

/** Barre de période — neutre, alignée dashboard spotlight */
const TIMELINE_TOOLBAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 -mt-4 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/80 sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8";

/** Même shell hero que `/dashboard/genres` — vibe startup / Vercel */
const TIMELINE_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const TIMELINE_CHART_SECTION_CLASS = `relative ${DASHBOARD_SPOTLIGHT_SHELL}`;

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

function getTimelineMobileSummary(data: TimelineDataPoint[]): TimelineMobileSummary | null {
  if (data.length === 0) return null;

  const total = data.reduce((sum, point) => sum + point.listens, 0);
  const peak = data.reduce((currentPeak, point) =>
    point.listens > currentPeak.listens ? point : currentPeak,
  );
  const first = data[0]?.listens ?? 0;
  const last = data[data.length - 1]?.listens ?? 0;
  const trendDelta = last - first;
  const trendDirection =
    Math.abs(trendDelta) < 1 ? "flat" : trendDelta > 0 ? "up" : "down";
  const topBuckets = [...data]
    .sort((a, b) => b.listens - a.listens)
    .slice(0, 5);

  return {
    total,
    peak,
    average: total / data.length,
    count: data.length,
    trendDelta,
    trendDirection,
    topBuckets,
  };
}

function createSparklinePoints(data: TimelineDataPoint[]): string {
  if (data.length === 0) return "";

  const width = 260;
  const height = 92;
  const padding = 8;
  const values = data.map((point) => point.listens);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return data
    .map((point, index) => {
      const x =
        data.length === 1
          ? width / 2
          : padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((point.listens - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function createTimelineTooltip(
  t: (key: "listens" | "Listens") => string,
  locale: string,
) {
  const TimelineTooltipInner = memo(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ value: number; color?: string }>;
      label?: string;
    }) => {
      if (!active || !payload?.length || !label) return null;
      const listens = Number(payload[0]?.value ?? 0);
      return (
        <div className="chart-tooltip-accessible min-w-[180px] p-4">
          <p className="mb-2 font-semibold">{label}</p>
          <div className="flex justify-between gap-4 text-sm">
            <span style={{ color: payload[0]?.color ?? "#6366f1" }}>
              {t("Listens")}
            </span>
            <span className="chart-tooltip-secondary font-medium tabular-nums">
              {listens.toLocaleString(locale)} {t("listens")}
            </span>
          </div>
        </div>
      );
    },
  );
  TimelineTooltipInner.displayName = "TimelineTooltip";
  return TimelineTooltipInner;
}

function TimelineHeroFrame({
  periodBadgeLabel,
  stats,
}: {
  periodBadgeLabel: string;
  stats: ReactNode;
}) {
  const t = useTranslations("timeline");
  return (
    <div className={TIMELINE_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <LiveStatusDot />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Activity className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" strokeWidth={1.5} aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              {periodBadgeLabel}
            </span>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/heatmap"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {t("ctaHeatmap")}
            </Link>
          </div>
        </div>

        <div className="relative">
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

function TimelineHeroStats({
  data,
  period,
  locale,
}: {
  data: TimelineDataPoint[];
  period: PeriodType;
  locale: string;
}) {
  const t = useTranslations("timeline");
  const { total, peak, peakDate, count } = useMemo(() => {
    const totalListens = data.reduce((s, p) => s + p.listens, 0);
    const peakPt = data.reduce((a, b) => (b.listens > a.listens ? b : a));
    return {
      total: totalListens,
      peak: peakPt.listens,
      peakDate: peakPt.date,
      count: data.length,
    };
  }, [data]);
  const peakLabel = formatDate(peakDate, period, locale);
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{total.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatTotal")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{peak.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatPeak")}</p>
        <p className="mt-0.5 truncate text-xs text-white/65" title={peakLabel}>
          {peakLabel}
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{count.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatBuckets")}</p>
      </div>
    </div>
  );
}

function TimelineHeroStatsSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-20 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function TimelineChartSkeleton() {
  return (
    <div
      className={`relative min-h-[500px] ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}
      aria-busy="true"
    >
      <div className="flex h-[452px] flex-col justify-between">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-slate-200/80 dark:bg-white/10" />
        ))}
      </div>
      <div className="absolute inset-x-8 bottom-20 top-16">
        <svg className="h-full w-full" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 250 C110 175 190 225 300 175 S500 115 610 165 720 215 800 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-violet-300 dark:text-violet-700"
            opacity="0.85"
          />
          <path
            d="M0 285 C140 240 235 245 340 205 S530 250 650 165 735 130 800 155"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-cyan-300 dark:text-cyan-800"
            opacity="0.75"
          />
        </svg>
      </div>
    </div>
  );
}

type TimelineChartRow = TimelineDataPoint & { formattedDate: string };

const TimelineListeningChart = memo(function TimelineListeningChart({
  chartData,
  chartPalette,
  TimelineTooltip,
  listensLabel,
}: {
  chartData: TimelineChartRow[];
  chartPalette: ChartPalette;
  TimelineTooltip: ComponentType<object>;
  listensLabel: string;
}) {
  return (
    <ChartResponsiveContainer
      token="timelineMain"
      minWidth={chartData.length > 10 ? Math.max(320, chartData.length * 32) : undefined}
    >
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
        <defs>
          <linearGradient id="timelineListeningGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="52%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="timelineListeningGlow" x="-20%" y="-30%" width="150%" height="170%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.28" />
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
        <XAxis
          dataKey="formattedDate"
          tick={{
            fill: chartPalette.tick,
            fontSize: 12,
          }}
          stroke={chartPalette.axisStroke}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{
            fill: chartPalette.tick,
            fontSize: 12,
          }}
          stroke={chartPalette.axisStroke}
        />
        <Tooltip content={<TimelineTooltip />} />
        <Line
          type="monotone"
          dataKey="listens"
          name={listensLabel}
          stroke="url(#timelineListeningGradient)"
          strokeWidth={3}
          filter="url(#timelineListeningGlow)"
          dot={{
            fill: "#6366f1",
            stroke: chartPalette.pieStroke,
            strokeWidth: 2,
            r: 3,
          }}
          activeDot={{
            r: 6,
            fill: "#22d3ee",
            stroke: chartPalette.pieStroke,
            strokeWidth: 2,
          }}
          animationDuration={500}
          animationEasing="ease-in-out"
        />
      </LineChart>
    </ChartResponsiveContainer>
  );
});
TimelineListeningChart.displayName = "TimelineListeningChart";

function TimelineMobileSkeleton() {
  return (
    <section className="space-y-4 lg:hidden" aria-busy="true">
      <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="mb-5 h-6 w-28 animate-pulse rounded-full bg-white/15" />
        <div className="mb-3 h-8 w-4/5 animate-pulse rounded-xl bg-white/15" />
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
        <div className="mt-6 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="mb-3 h-6 w-16 animate-pulse rounded bg-white/15" />
              <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
      </div>
    </section>
  );
}

function TimelineMobileExperience({
  data,
  chartData,
  chartView,
  isLoading,
  error,
  refetch,
  period,
  periodBadgeLabel,
  locale,
}: {
  data?: TimelineDataPoint[];
  chartData: TimelineChartRow[];
  chartView: ListenTrendChartViewMode;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  period: PeriodType;
  periodBadgeLabel: string;
  locale: string;
}) {
  const t = useTranslations("timeline");
  const summary = useMemo(() => getTimelineMobileSummary(data ?? []), [data]);
  const sparklineData = useMemo(
    () => applyListenTrendChartViewSingle(data ?? [], chartView, "listens"),
    [data, chartView]
  );
  const sparklinePoints = useMemo(() => createSparklinePoints(sparklineData), [sparklineData]);

  if (isLoading) return <TimelineMobileSkeleton />;

  if (error) {
    return (
      <section className="lg:hidden">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950">
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </section>
    );
  }

  if (!summary || chartData.length === 0) {
    return (
      <section className="lg:hidden">
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
            {t("heroEyebrow")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
            {t("mobile.emptyTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {t("mobile.emptyBody")}
          </p>
        </div>
      </section>
    );
  }

  const peakDate = formatDate(summary.peak.date, period, locale);
  const trendLabel =
    summary.trendDirection === "up"
      ? t("mobile.trendUp")
      : summary.trendDirection === "down"
        ? t("mobile.trendDown")
        : t("mobile.trendFlat");
  const metricCards = [
    {
      label: t("heroStatTotal"),
      value: summary.total.toLocaleString(locale),
    },
    {
      label: t("heroStatPeak"),
      value: summary.peak.listens.toLocaleString(locale),
      detail: peakDate,
    },
    {
      label: t("mobile.average"),
      value: Math.round(summary.average).toLocaleString(locale),
    },
    {
      label: t("mobile.trend"),
      value: trendLabel,
      detail: t("mobile.trendDelta", {
        count: Math.abs(summary.trendDelta).toLocaleString(locale),
      }),
    },
  ];

  return (
    <section className="space-y-4 lg:hidden" aria-labelledby="timeline-mobile-title">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(34,211,238,0.2),transparent_32%)]" />
        <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-violet-100">
              {t("mobile.eyebrow")}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85">
              {periodBadgeLabel}
            </span>
          </div>
          <h1 id="timeline-mobile-title" className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-balance">
            {t("mobile.storyTitle", { date: peakDate })}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            {t("mobile.storyBody", {
              count: summary.peak.listens.toLocaleString(locale),
              listens: t("listens"),
            })}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {metricCards.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur">
                <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{metric.value}</p>
                <p className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {metric.label}
                </p>
                {metric.detail ? (
                  <p className="mt-1 truncate text-xs text-white/60" title={metric.detail}>
                    {metric.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              {t("mobile.sparkEyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {t("mobile.sparkTitle")}
            </h2>
          </div>
          <span className="inline-flex min-h-11 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {summary.count.toLocaleString(locale)} {t("mobile.bucketsShort")}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-black/25">
          <svg className="h-28 w-full" viewBox="0 0 260 92" preserveAspectRatio="none" role="img" aria-label={t("mobile.sparkAria")}>
            <defs>
              <linearGradient id="timelineMobileSparkline" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="60%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <polyline
              points={sparklinePoints}
              fill="none"
              stroke="url(#timelineMobileSparkline)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {t("mobile.sparkHint")}
        </p>
      </div>

      <details className="group rounded-[1.5rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{t("mobile.detailsTitle")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("mobile.detailsHint")}</p>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-2 border-t border-slate-200/80 p-3 dark:border-white/10">
          {summary.topBuckets.map((bucket, index) => {
            const bucketDate = formatDate(bucket.date, period, locale);
            return (
              <div key={`${bucket.date}-${index}`} className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/[0.05]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{bucketDate}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">#{index + 1}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                  {bucket.listens.toLocaleString(locale)} {t("listens")}
                </p>
              </div>
            );
          })}
        </div>
      </details>

      <Link
        href="/dashboard/heatmap"
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        {t("mobile.heatmapCta")}
      </Link>
    </section>
  );
}

function TimelineContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("timeline");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const chartPalette =
    DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];

  const TimelineTooltip = useMemo(
    () => createTimelineTooltip(t, locale),
    [t, locale],
  );
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const period = (searchParams.get("period") || "month") as PeriodType;
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
    [chartData, chartView]
  );

  const emptyStatePresets = useEmptyStatePresets();

  const periodBadgeLabel =
    period === "day"
      ? t("periodBadgeDay")
      : period === "week"
        ? t("periodBadgeWeek")
        : t("periodBadgeMonth");

  const heroStats =
    isLoading ? (
      <TimelineHeroStatsSkeleton />
    ) : error || !data || data.length === 0 ? null : (
      <TimelineHeroStats data={data} period={period} locale={locale} />
    );

  return (
    <>
      <div className={TIMELINE_TOOLBAR_CLASS}>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector defaultPeriod="month" />
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
        </div>
      </div>

      <div className="mt-4 space-y-5 lg:mt-6 lg:space-y-8">
        <div className="hidden lg:block">
          <TimelineHeroFrame periodBadgeLabel={periodBadgeLabel} stats={heroStats} />
        </div>

        <TimelineMobileExperience
          data={data}
          chartData={chartData}
          chartView={chartView}
          isLoading={isLoading}
          error={error}
          refetch={refetch}
          period={period}
          periodBadgeLabel={periodBadgeLabel}
          locale={locale}
        />

        <div className="hidden lg:block">
          {!isLoading && error ? (
            <div className={TIMELINE_CHART_SECTION_CLASS}>
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
              <div className="relative p-6 sm:p-8">
                <ErrorState
                  variant="startup"
                  error={error}
                  message={t("errorLoading")}
                  onRetry={() => refetch()}
                />
              </div>
            </div>
          ) : !isLoading && (!data || data.length === 0) ? (
            <EmptyState variant="startup" {...emptyStatePresets.changeDates(pathname)} />
          ) : (
            <section className={TIMELINE_CHART_SECTION_CLASS} aria-labelledby="timeline-spotlight-title">
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
              <div className="relative">
                <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50/90 text-violet-600 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-violet-300">
                      <Activity className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div>
                      <h2 id="timeline-spotlight-title" className={DASHBOARD_SPOTLIGHT_TITLE}>
                        {t("chartTitle")}
                      </h2>
                      <p className={`mt-1 max-w-2xl ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("chartHint")}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6 md:p-8">
                  {isLoading ? (
                    <TimelineChartSkeleton />
                  ) : (
                    <div className={`relative min-h-[500px] ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
                      <div className="pointer-events-none absolute left-1/2 top-14 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl dark:bg-cyan-400/12" aria-hidden />
                      <div className="relative">
                        <TimelineListeningChart
                          chartData={displayChartData}
                          chartPalette={chartPalette}
                          TimelineTooltip={TimelineTooltip}
                          listensLabel={t("Listens")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function TimelineFallback() {
  const t = useTranslations("timeline");
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") || "month") as PeriodType;
  const periodBadgeLabel =
    period === "day"
      ? t("periodBadgeDay")
      : period === "week"
        ? t("periodBadgeWeek")
        : t("periodBadgeMonth");
  return (
    <>
      <div className={TIMELINE_TOOLBAR_CLASS}>
        <div className="h-10 w-64 animate-shimmer rounded-xl bg-slate-100 dark:bg-white/10" />
      </div>
      <div className="mt-4 space-y-5 lg:mt-6 lg:space-y-8">
        <TimelineMobileSkeleton />
        <div className="hidden lg:block">
          <TimelineHeroFrame periodBadgeLabel={periodBadgeLabel} stats={<TimelineHeroStatsSkeleton />} />
        </div>
        <div className={`hidden lg:block ${TIMELINE_CHART_SECTION_CLASS}`}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
          <div className="relative p-6 sm:p-8">
            <TimelineChartSkeleton />
          </div>
        </div>
      </div>
    </>
  );
}

export default function TimelinePage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<TimelineFallback />}>
        <TimelineContent />
      </Suspense>
    </div>
  );
}
