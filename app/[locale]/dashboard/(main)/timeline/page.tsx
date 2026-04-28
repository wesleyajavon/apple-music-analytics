"use client";

import { Suspense, memo, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTimeline, type TimelineDataPoint } from "@/lib/hooks/use-listening";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { PeriodSelector, PeriodType } from "@/lib/components/period-selector";
import { LineChartSkeleton } from "@/lib/components/skeleton-loaders";
import { Activity } from "lucide-react";

const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 bg-surface-glass border-b border-amber-200/30 dark:border-amber-400/15 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 shadow-[0_1px_0_0_rgb(251_191_36_/_0.2)] backdrop-blur-md";
const TIMELINE_RAIL_CLASS = "bg-gradient-to-r from-amber-300 via-orange-400 to-sky-400";
const TIMELINE_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-amber-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.1),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card backdrop-blur-sm animate-fade-in-up transition-all duration-300 hover:shadow-card-hover dark:border-amber-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_30%),rgb(var(--card-rgb)/0.9)]";
const TIMELINE_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-amber-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.32),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.24),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#451a03_100%)] px-6 py-8 shadow-2xl shadow-amber-950/40 sm:px-8 sm:py-10";

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
      // Format: "01/01 - 07/01" (début - fin de semaine)
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
      // Format: "janv. 2024" - l'API retourne "YYYY-MM"
      const [year, month] = date.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString(locale, {
        month: "short",
        year: "numeric",
      });
    }
  }
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
            <span style={{ color: payload[0]?.color ?? "#fb923c" }}>
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
      <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(56,189,248,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-amber-400/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-sky-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TIMELINE_RAIL_CLASS} opacity-90`} />
      <div className="relative max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/85">{t("heroEyebrow")}</p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          <Activity className="h-9 w-9 shrink-0 text-amber-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
          <span>{t("title")}</span>
        </h1>
        <div
          className={`mt-4 h-1.5 w-24 rounded-full ${TIMELINE_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(251,191,36,0.35)]`}
          aria-hidden
        />
        <p className="mt-5 text-base leading-relaxed text-amber-100/90 sm:text-lg">{t("subtitle")}</p>
        <p className="mt-2 text-sm font-medium text-sky-100/90">
          <span className="inline-flex items-center rounded-full border border-amber-200/30 bg-white/10 px-3 py-1">
            {periodBadgeLabel}
          </span>
        </p>
        {stats}
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
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      <div className="rounded-xl border border-amber-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-100/80">{t("heroStatTotal")}</p>
        <p className="text-2xl font-bold text-white">{total.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-orange-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-orange-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-orange-100/80">{t("heroStatPeak")}</p>
        <p className="text-2xl font-bold text-white">{peak.toLocaleString(locale)}</p>
        <p className="mt-0.5 truncate text-xs text-white/70 max-w-[200px]" title={peakLabel}>
          {peakLabel}
        </p>
      </div>
      <div className="rounded-xl border border-sky-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-sky-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-sky-100/80">{t("heroStatBuckets")}</p>
        <p className="text-2xl font-bold text-white">{count.toLocaleString(locale)}</p>
      </div>
    </div>
  );
}

function TimelineHeroStatsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[140px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-initial"
        >
          <div className="mb-2 h-3 w-20 rounded bg-white/15" />
          <div className="h-8 w-24 rounded bg-white/20" />
        </div>
      ))}
    </div>
  );
}

function TimelineContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("timeline");
  const locale = useLocale();
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

  // Format data for chart with proper date formatting - mémorisé pour éviter les recalculs
  const chartData = useMemo(
    () =>
      data?.map((point) => ({
        ...point,
        formattedDate: formatDate(point.date, period, locale),
      })) || [],
    [data, period, locale],
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
      <div className={GROUP_BY_BAR_CLASS}>
        <PeriodSelector defaultPeriod="month" />
      </div>

      <div className="mt-6 space-y-8">
        <TimelineHeroFrame periodBadgeLabel={periodBadgeLabel} stats={heroStats} />

        {isLoading ? (
          <LineChartSkeleton height={500} />
        ) : error ? (
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState {...emptyStatePresets.changeDates(pathname)} />
        ) : (
          <section
            className={TIMELINE_PANEL_CLASS}
            aria-labelledby="timeline-spotlight-title"
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TIMELINE_RAIL_CLASS} opacity-85`} />
            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-400/12 blur-3xl dark:bg-sky-400/16" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-orange-400/12 blur-3xl dark:bg-orange-400/16" />
            <div className="relative">
              <div className="border-b border-amber-200/20 px-6 py-5 dark:border-amber-300/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-600 shadow-sm shadow-amber-950/10 dark:text-amber-200">
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
                        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0115.306-2.028 11.95 11.95 0 012.028 15.306L21 18"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2
                      id="timeline-spotlight-title"
                      className="text-lg font-semibold tracking-tight text-foreground"
                    >
                      {t("chartTitle")}
                    </h2>
                    <p className="mt-0.5 text-sm text-amber-700/75 dark:text-amber-100/65">
                      {t("chartHint")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6 md:p-8">
                <div className="relative min-h-[500px] rounded-2xl border border-amber-200/20 bg-white/50 p-3 shadow-inner dark:border-amber-300/10 dark:bg-slate-950/20">
                  <div className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-orange-400/10 blur-3xl dark:bg-orange-400/15" />
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                    >
                      <defs>
                        <linearGradient id="timelineLineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="52%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                        <filter id="timelineLineGlow" x="-20%" y="-30%" width="150%" height="170%">
                          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#fb923c" floodOpacity="0.24" />
                        </filter>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#fed7aa"
                        strokeOpacity={0.34}
                      />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{
                          fill: "#b45309",
                          fontSize: 12,
                        }}
                        stroke="#f59e0b"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{
                          fill: "#b45309",
                          fontSize: 12,
                        }}
                        stroke="#f59e0b"
                      />
                      <Tooltip content={<TimelineTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="listens"
                        name={t("Listens")}
                        stroke="url(#timelineLineGradient)"
                        strokeWidth={3}
                        filter="url(#timelineLineGlow)"
                        dot={{ fill: "#fb923c", stroke: "#fff7ed", strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 6, fill: "#38bdf8", stroke: "#fff7ed", strokeWidth: 2 }}
                        animationDuration={500}
                        animationEasing="ease-in-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        )}
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
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 w-64 animate-shimmer rounded-xl bg-gray-100 dark:bg-gray-700" />
      </div>
      <div className="mt-6 space-y-8">
        <TimelineHeroFrame periodBadgeLabel={periodBadgeLabel} stats={<TimelineHeroStatsSkeleton />} />
        <LineChartSkeleton height={500} />
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
