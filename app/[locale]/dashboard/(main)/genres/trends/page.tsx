"use client";

import {
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  memo,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { useGenreTrends, useGenreTrendsCommentary } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { GenreAccuracyChooser } from "@/lib/components/palette/genre-accuracy-chooser";
import { PeriodSelector, getPeriodFromSearchParams, type PeriodType } from "@/lib/components/period-selector";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { ArrowLeft } from "lucide-react";
import type { GenreTrendsDataPoint } from "@/lib/dto/genres";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_PILL_MUTED,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import {
  OVERVIEW_STARTUP_SURFACE_BASE,
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";
import { useTheme } from "@/lib/providers/theme-provider";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { DuetCompareDeepLink } from "@/lib/components/duet/duet-compare-deep-link";

const COLORS = [
  "#a855f7",
  "#22d3ee",
  "#10b981",
  "#f97316",
  "#ec4899",
  "#3b82f6",
  "#84cc16",
  "#f59e0b",
  "#14b8a6",
  "#8b5cf6",
];

const MAX_SERIES_GENRES = 30;
const GENRE_FILTER_PAGE_SIZE = 30;
/** Délai après lequel les sélections de genres déclenchent refetch chart + IA (évite rafales). */
const GENRE_SELECTION_DEBOUNCE_MS = 450;

const TRENDS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 -mt-4 border-b border-white/10 bg-surface-glass/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8";

type GenreTrendSignal = {
  genre: string;
  color: string;
  total: number;
  first: number;
  last: number;
  delta: number;
  peak: number;
  peakDate: string;
  activeBuckets: number;
};

type ChartTheme = (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];

function useGenresListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/genres?${qs}` : "/dashboard/genres";
  }, [searchParams]);
}

function periodToLabelKey(period: PeriodType): "daily" | "weekly" | "monthly" {
  if (period === "day") return "daily";
  if (period === "week") return "weekly";
  return "monthly";
}

function useGenreTrendsBadgeLabel() {
  const locale = useLocale();
  const tOverview = useTranslations("overview");
  const { startDate, endDate } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(startDate, endDate, locale);
  return dateRangeLabel || tOverview("allData");
}

function GenreTrendsSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function GenreTrendsHeroPanelSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-24 rounded bg-white/20" />
          <div className="h-3 w-20 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function GenreTrendsHeroPanel({ period, selectedCount }: { period: PeriodType; selectedCount: number }) {
  const t = useTranslations("genreTrends");
  const tPeriod = useTranslations("components.periodSelector");
  const labelKey = periodToLabelKey(period);
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{tPeriod(labelKey)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroPanelGroupBy")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">
          {selectedCount} / {MAX_SERIES_GENRES}
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroPanelSeries")}</p>
      </div>
    </div>
  );
}

function GenreTrendsHeroFrame({
  genresHref,
  subtitleKey,
  badgeLabel,
  panel,
}: {
  genresHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
  badgeLabel: string;
  panel: ReactNode;
}) {
  const t = useTranslations("genreTrends");
  return (
    <div className={TRENDS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_30%),radial-gradient(circle_at_78%_8%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.85)_48%,rgba(8,47,73,0.65))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t(subtitleKey)}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={genresHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToGenres")}
            </Link>
            <span className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur">{badgeLabel}</span>
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
              {panel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenreFilterSkeleton() {
  return (
    <div className="flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-card-border bg-surface/60 p-2" aria-busy="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={index}
          className="h-9 rounded-lg border border-slate-200/80 bg-slate-100/80 animate-shimmer dark:border-white/10 dark:bg-white/[0.06]"
          style={{ width: `${84 + ((index * 17) % 82)}px` }}
        />
      ))}
    </div>
  );
}

function GenreTrendsChartSkeleton() {
  return (
    <div className="relative min-h-[280px] rounded-[1.35rem] border border-slate-200/80 bg-slate-100/50 p-6 dark:border-white/10 dark:bg-black/30 lg:min-h-[500px]" aria-busy="true">
      <div className="flex h-[232px] flex-col justify-between lg:h-[452px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-slate-200/90 dark:bg-white/10" />
        ))}
      </div>
      <div className="absolute inset-x-8 bottom-20 top-16">
        <svg className="h-full w-full" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 250 C90 210 160 190 250 205 S430 120 540 150 700 210 800 105"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-violet-300"
            opacity="0.35"
          />
          <path
            d="M0 285 C120 230 230 250 320 180 S510 210 620 145 735 125 800 170"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-cyan-300"
            opacity="0.3"
          />
        </svg>
      </div>
      <div className="absolute inset-x-8 bottom-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-3 w-28 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function GenreTrendsMobileSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 shadow-xl shadow-violet-500/10">
        <div className="h-4 w-28 animate-shimmer rounded bg-white/15" />
        <div className="mt-5 h-8 w-56 animate-shimmer rounded bg-white/20" />
        <div className="mt-3 h-4 w-full animate-shimmer rounded bg-white/10" />
        <div className="mt-5 h-24 animate-shimmer rounded-[1.35rem] bg-white/10" />
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-24 min-w-[9.5rem] animate-shimmer rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </div>
      <div className="h-64 animate-shimmer rounded-[1.5rem] border border-card-border bg-surface/70" />
    </div>
  );
}

function GenreTrendsMobileEmptyHero({
  genresHref,
  badgeLabel,
}: {
  genresHref: string;
  badgeLabel: string;
}) {
  const t = useTranslations("genreTrends");

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-xl shadow-violet-500/10">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-violet-200">{t("mobile.eyebrow")}</p>
        <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold text-white/75">{badgeLabel}</span>
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-white">{t("mobile.heroTitle")}</h1>
      <p className="mt-3 text-sm leading-6 text-white/68">{t("mobile.heroSubtitle")}</p>
      <Link
        href={genresHref}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-lg shadow-black/20"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToGenres")}
      </Link>
    </div>
  );
}

function GenreTrendsMobileExperience({
  genresHref,
  badgeLabel,
  period,
  selectedGenres,
  availableGenres,
  visibleGenres,
  visibleGenreStart,
  visibleGenreEnd,
  genreFilterPage,
  genreFilterPageCount,
  chartData,
  chartDisplayData,
  isLoading,
  isFetching,
  selectionPending,
  chartTheme,
  toggleGenre,
  selectAll,
  selectNone,
  setGenreFilterPage,
  displayAiCommentary,
  hasDisplayableAiParagraph,
  showAiSkeleton,
  activeAiError,
  aiUnavailable,
  aiRefreshing,
  canShowAiTabs,
  summaryVersion,
  setSummaryVersion,
}: {
  genresHref: string;
  badgeLabel: string;
  period: PeriodType;
  selectedGenres: string[];
  availableGenres: string[];
  visibleGenres: string[];
  visibleGenreStart: number;
  visibleGenreEnd: number;
  genreFilterPage: number;
  genreFilterPageCount: number;
  chartData: GenreTrendsDataPoint[];
  chartDisplayData: GenreTrendsDataPoint[];
  isLoading: boolean;
  isFetching: boolean;
  selectionPending: boolean;
  chartTheme: ChartTheme;
  toggleGenre: (genre: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  setGenreFilterPage: (updater: (page: number) => number) => void;
  displayAiCommentary: string;
  hasDisplayableAiParagraph: boolean;
  showAiSkeleton: boolean;
  activeAiError: Error | null;
  aiUnavailable: boolean;
  aiRefreshing: boolean;
  canShowAiTabs: boolean;
  summaryVersion: "light" | "technical";
  setSummaryVersion: (version: "light" | "technical") => void;
}) {
  const locale = useLocale();
  const t = useTranslations("genreTrends");
  const tPeriod = useTranslations("components.periodSelector");
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const signals = useMemo(
    () => buildGenreTrendSignals({ chartData, selectedGenres, availableGenres }),
    [availableGenres, chartData, selectedGenres]
  );
  const visibleSignals = signals.slice(0, 5);
  const chartGenres = visibleSignals.map((signal) => signal.genre);
  const leadSignal = signals[0];
  const movementSignal = signals.reduce<GenreTrendSignal | undefined>((best, signal) => {
    if (!best) return signal;
    return Math.abs(signal.delta) > Math.abs(best.delta) ? signal : best;
  }, undefined);
  const remainingSelectedCount = Math.max(0, selectedGenres.length - visibleSignals.length);
  const isUpdating = isFetching || selectionPending;

  if (isLoading) return <GenreTrendsMobileSkeleton />;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-xl shadow-violet-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(6,182,212,0.22),transparent_34%),linear-gradient(150deg,rgba(3,7,18,0.98),rgba(30,27,75,0.84)_55%,rgba(8,47,73,0.6))]" aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-violet-200">{t("mobile.eyebrow")}</p>
            <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold text-white/75">{badgeLabel}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-white">{t("mobile.heroTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">{t("mobile.heroSubtitle")}</p>

          <div className="mt-5 rounded-[1.35rem] border border-white/12 bg-white/10 p-4 backdrop-blur">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-cyan-100/80">{t("mobile.topGenreLabel")}</p>
            {leadSignal ? (
              <>
                <p className="mt-2 line-clamp-2 text-2xl font-semibold tracking-[-0.045em] text-white">{leadSignal.genre}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-white/78">
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{t("mobile.listenCount", { count: numberFormatter.format(leadSignal.total) })}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">
                    {leadSignal.peak > 0
                      ? t("mobile.peakLine", { count: numberFormatter.format(leadSignal.peak), date: leadSignal.peakDate })
                      : t("mobile.noPeak")}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-white/70">{t("mobile.topGenreFallback")}</p>
            )}
          </div>

          <Link
            href={genresHref}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-lg shadow-black/20"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t("backToGenres")}
          </Link>
        </div>
      </section>

      <section aria-label={t("mobile.signalsLabel")} className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex gap-3">
          <div className="min-w-[9rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("mobile.periodSignal")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{tPeriod(periodToLabelKey(period))}</p>
          </div>
          <div className="min-w-[9rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("mobile.selectedSignal")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{selectedGenres.length}</p>
          </div>
          <div className="min-w-[9rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("mobile.bucketsSignal")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{chartData.length}</p>
          </div>
          <div className="min-w-[10rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("mobile.moverSignal")}</p>
            <p className="mt-2 truncate text-lg font-semibold text-foreground">{movementSignal?.genre ?? t("mobile.noMover")}</p>
            {movementSignal && (
              <p className="mt-1 text-xs font-medium text-muted">
                {movementSignal.delta > 0
                  ? t("mobile.deltaUp", { count: numberFormatter.format(movementSignal.delta) })
                  : movementSignal.delta < 0
                    ? t("mobile.deltaDown", { count: numberFormatter.format(Math.abs(movementSignal.delta)) })
                    : t("mobile.deltaFlat")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-card-border bg-card-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.035em] text-foreground">{t("mobile.quickFocusTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{t("mobile.quickFocusDescription")}</p>
          </div>
          {remainingSelectedCount > 0 && (
            <span className="shrink-0 rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
              {t("mobile.moreSelected", { count: remainingSelectedCount })}
            </span>
          )}
        </div>
        <div className="mt-4 space-y-2">
          {visibleSignals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-card-border px-4 py-5 text-sm text-muted">{t("selectAtLeastOne")}</p>
          ) : (
            visibleSignals.map((signal, index) => (
              <div key={signal.genre} className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-surface/70 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: signal.color }}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{signal.genre}</p>
                  <p className="text-xs text-muted">
                    {t("mobile.listenCount", { count: numberFormatter.format(signal.total) })} · {t("mobile.activeBuckets", { count: numberFormatter.format(signal.activeBuckets) })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-card-border bg-card-surface p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("sections.chart.eyebrow")}</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-foreground">{t("mobile.chartTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{t("mobile.chartSubtitle")}</p>
          </div>
          {selectedGenres.length > chartGenres.length && (
            <span className="shrink-0 rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
              {t("mobile.chartLimited", { count: chartGenres.length })}
            </span>
          )}
        </div>

        {selectedGenres.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-card-border px-4 py-8 text-center text-sm text-muted">{t("selectAtLeastOne")}</div>
        ) : (
          <div className="relative min-h-[260px] rounded-[1.25rem] border border-card-border bg-surface/70 p-2" aria-busy={isUpdating}>
            {isUpdating && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[1.25rem] bg-white/90 px-4 text-center backdrop-blur-[2px] dark:bg-slate-950/80">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent dark:border-violet-400" aria-hidden />
                <span className="text-sm font-medium text-slate-900 dark:text-white">{selectionPending ? t("selectionPending") : t("chartUpdating")}</span>
              </div>
            )}
            <div className={`transition-opacity duration-200 ${isUpdating ? "pointer-events-none opacity-40" : ""}`}>
              <ChartResponsiveContainer token="tracksMain">
                <RechartsLineChart data={chartDisplayData} margin={{ top: 12, right: 10, left: -18, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="formattedDate" tick={{ fill: chartTheme.tick, fontSize: 10 }} stroke={chartTheme.axisStroke} minTickGap={18} />
                  <YAxis tick={{ fill: chartTheme.tick, fontSize: 10 }} stroke={chartTheme.axisStroke} width={34} />
                  <Tooltip content={<TrendsTooltip />} />
                  {chartGenres.map((genre) => {
                    const signal = visibleSignals.find((item) => item.genre === genre);
                    return (
                      <Line
                        key={genre}
                        type="monotone"
                        dataKey={genre}
                        name={genre}
                        stroke={signal?.color ?? getColor(0)}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                        animationDuration={500}
                        animationEasing="ease-in-out"
                      />
                    );
                  })}
                </RechartsLineChart>
              </ChartResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {(showAiSkeleton || activeAiError || aiUnavailable || hasDisplayableAiParagraph) && (
        <details className="group rounded-[1.5rem] border border-card-border bg-card-surface shadow-sm" aria-busy={aiRefreshing}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-sm font-semibold text-foreground">{t("mobile.insightsTitle")}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">{t("mobile.insightsDescription")}</span>
            </span>
            <span className="rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition group-open:bg-primary group-open:text-primary-foreground">
              {t("mobile.openSummary")}
            </span>
          </summary>
          <div className="border-t border-card-border p-4">
            {canShowAiTabs && (
              <div className="mb-4 flex rounded-xl border border-card-border bg-surface p-1" role="tablist" aria-label={t("aiExplanation")}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={summaryVersion === "light"}
                  onClick={() => setSummaryVersion("light")}
                  className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors ${
                    summaryVersion === "light"
                      ? "bg-card-surface text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t("summaryVersionLight")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={summaryVersion === "technical"}
                  onClick={() => setSummaryVersion("technical")}
                  className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors ${
                    summaryVersion === "technical"
                      ? "bg-card-surface text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t("summaryVersionTechnical")}
                </button>
              </div>
            )}
            {showAiSkeleton ? (
              <div className="space-y-3 animate-pulse" aria-busy="true">
                <div className="h-4 w-full rounded bg-slate-200/80 dark:bg-white/10" />
                <div className="h-4 w-11/12 rounded bg-slate-200/80 dark:bg-white/10" />
                <div className="h-4 w-4/5 rounded bg-slate-200/80 dark:bg-white/10" />
              </div>
            ) : activeAiError ? (
              isGroqDailyQuotaError(activeAiError) ? (
                <GroqQuotaNotice error={activeAiError} />
              ) : (
                <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                  {activeAiError.message}
                </p>
              )
            ) : aiUnavailable ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("aiUnavailable")}</p>
            ) : hasDisplayableAiParagraph ? (
              <p className={`whitespace-pre-line text-sm leading-6 text-slate-700 transition-opacity duration-200 dark:text-slate-200 ${aiRefreshing ? "opacity-60" : ""}`}>
                {displayAiCommentary}
              </p>
            ) : null}
          </div>
        </details>
      )}

      <details className="group rounded-[1.5rem] border border-card-border bg-card-surface shadow-sm">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-semibold text-foreground">{t("mobile.editTitle")}</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">{t("mobile.editDescription")}</span>
          </span>
          <span className="rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition group-open:bg-primary group-open:text-primary-foreground">
            {t("mobile.editSummary")}
          </span>
        </summary>
        <div className="border-t border-card-border p-4">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="min-h-11 flex-1 rounded-2xl border border-violet-200/80 bg-white px-4 text-sm font-semibold text-violet-950 shadow-sm transition-colors hover:bg-violet-50/90 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100 dark:shadow-none dark:hover:bg-violet-400/25"
            >
              {t("all")}
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-glass"
            >
              {t("none")}
            </button>
          </div>

          {availableGenres.length > GENRE_FILTER_PAGE_SIZE && (
            <div className="mb-4 rounded-2xl border border-card-border bg-surface/70 p-3">
              <p className="text-xs text-muted">
                {t("paginationSummary", {
                  start: visibleGenreStart + 1,
                  end: visibleGenreEnd,
                  total: availableGenres.length,
                })}{" "}
                · {t("paginationPage", { page: genreFilterPage + 1, totalPages: genreFilterPageCount })}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setGenreFilterPage((page) => Math.max(0, page - 1))}
                  disabled={genreFilterPage === 0}
                  className="min-h-11 flex-1 rounded-2xl border border-card-border bg-card-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-glass disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("paginationPrevious")}
                </button>
                <button
                  type="button"
                  onClick={() => setGenreFilterPage((page) => Math.min(genreFilterPageCount - 1, page + 1))}
                  disabled={genreFilterPage >= genreFilterPageCount - 1}
                  className="min-h-11 flex-1 rounded-2xl border border-card-border bg-card-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-glass disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("paginationNext")}
                </button>
              </div>
            </div>
          )}

          <div className="flex max-h-[min(48vh,24rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-2xl border border-card-border bg-surface/70 p-2">
            {visibleGenres.map((genre) => {
              const selected = selectedGenres.includes(genre);
              const disabled = !selected && selectedGenres.length >= MAX_SERIES_GENRES;
              const idx = availableGenres.indexOf(genre);
              return (
                <label
                  key={genre}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition-colors ${
                    selected
                      ? "border-violet-400/65 bg-violet-100 text-violet-950 shadow-sm dark:border-violet-400/55 dark:bg-slate-950 dark:text-violet-100 dark:shadow-none"
                      : "border-card-border bg-card-surface text-foreground hover:bg-surface-glass"
                  } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled}
                    onChange={() => toggleGenre(genre)}
                    className="rounded border-slate-300 bg-violet-50 text-violet-600 accent-violet-600 focus:ring-violet-500 disabled:opacity-40 dark:border-white/25 dark:bg-slate-900 dark:accent-violet-400"
                  />
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selected ? getColor(idx) : "transparent", border: selected ? "none" : "1px solid #9ca3af" }} />
                  <span>{genre}</span>
                </label>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function getNumericTrendValue(point: GenreTrendsDataPoint, genre: string): number {
  const value = point[genre];
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function buildGenreTrendSignals({
  chartData,
  selectedGenres,
  availableGenres,
}: {
  chartData: GenreTrendsDataPoint[];
  selectedGenres: string[];
  availableGenres: string[];
}): GenreTrendSignal[] {
  return selectedGenres
    .map((genre) => {
      let total = 0;
      let peak = 0;
      let peakDate = "";
      let activeBuckets = 0;

      chartData.forEach((point) => {
        const value = getNumericTrendValue(point, genre);
        total += value;
        if (value > 0) activeBuckets += 1;
        if (value > peak) {
          peak = value;
          peakDate = String(point.formattedDate || point.date || "");
        }
      });

      const first = chartData[0] ? getNumericTrendValue(chartData[0], genre) : 0;
      const last = chartData[chartData.length - 1]
        ? getNumericTrendValue(chartData[chartData.length - 1], genre)
        : 0;
      const genreIndex = Math.max(0, availableGenres.indexOf(genre));

      return {
        genre,
        color: getColor(genreIndex),
        total,
        first,
        last,
        delta: last - first,
        peak,
        peakDate,
        activeBuckets,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function genresEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function createTrendsTooltip(t: (k: string) => string, locale: string) {
  const TrendsTooltipInner = memo(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ name: string; value: number; color: string }>;
      label?: string;
    }) => {
      if (!active || !payload?.length || !label) return null;
      return (
        <div className="chart-tooltip-accessible min-w-[180px] p-4">
          <p className="font-semibold mb-2">{label}</p>
          <ul className="space-y-1.5 text-sm">
            {payload.map((entry) => (
              <li key={entry.name} className="flex justify-between gap-4">
                <span style={{ color: entry.color }}>{entry.name}</span>
                <span className="chart-tooltip-secondary font-medium tabular-nums">
                  {Number(entry.value).toLocaleString(locale)} {t("listensDelta")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  );
  TrendsTooltipInner.displayName = "TrendsTooltip";
  return TrendsTooltipInner;
}

function TrendsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const t = useTranslations("genreTrends");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = getPeriodFromSearchParams(searchParams, "month");

  // Quand "All" est sélectionné (pas de dates dans l'URL), passer undefined
  // pour que l'API utilise la plage réelle min/max de la DB
  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const isPublicDemoViewer = usePublicDemoViewer(userId);
  const genresHref = useGenresListHref();
  const badgeLabel = useGenreTrendsBadgeLabel();

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [summaryVersion, setSummaryVersion] = useState<"light" | "technical">(
    "light"
  );
  const [genreFilterPage, setGenreFilterPage] = useState(0);
  const defaultSelectionAppliedRef = useRef(false);

  useEffect(() => {
    defaultSelectionAppliedRef.current = false;
  }, [startDate, endDate, period]);

  /** 0 ms jusqu’à la première réponse chart — pas de délai au premier rendu des sélections par défaut. */
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);
  const debouncedSelectedGenres = useDebouncedValue(
    selectedGenres,
    selectionDebounceMs
  );
  const selectionPending = !genresEqualSorted(
    selectedGenres,
    debouncedSelectedGenres
  );

  const genresForFetch =
    debouncedSelectedGenres.length > 0 ? debouncedSelectedGenres : undefined;

  const { data, isLoading, isFetching: chartFetching, error, refetch } = useGenreTrends(
    startDate,
    endDate,
    period,
    genresForFetch,
    userId
  );

  useEffect(() => {
    setSelectionDebounceMs(0);
  }, [startDate, endDate, period]);

  useEffect(() => {
    if (!chartFetching && data != null && !error) {
      setSelectionDebounceMs(GENRE_SELECTION_DEBOUNCE_MS);
    }
  }, [chartFetching, data, error]);

  const chartDataSyncing = chartFetching || selectionPending;

  const availableGenres = useMemo(
    () => data?.availableGenres ?? [],
    [data?.availableGenres]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedGenres),
    [chartData, chartView, selectedGenres]
  );

  useEffect(() => {
    if (availableGenres.length === 0) return;
    if (defaultSelectionAppliedRef.current) return;
    if (selectedGenres.length > 0) return;
    const defaultSelected =
      availableGenres.length <= 5
        ? [...availableGenres]
        : availableGenres.slice(0, 5);
    setSelectedGenres(defaultSelected);
    defaultSelectionAppliedRef.current = true;
  }, [availableGenres, selectedGenres.length]);

  const genreFilterPageCount = Math.max(
    1,
    Math.ceil(availableGenres.length / GENRE_FILTER_PAGE_SIZE)
  );
  const visibleGenreStart = genreFilterPage * GENRE_FILTER_PAGE_SIZE;
  const visibleGenres = useMemo(
    () =>
      availableGenres.slice(
        visibleGenreStart,
        visibleGenreStart + GENRE_FILTER_PAGE_SIZE
      ),
    [availableGenres, visibleGenreStart]
  );
  const visibleGenreEnd = Math.min(
    visibleGenreStart + visibleGenres.length,
    availableGenres.length
  );

  useEffect(() => {
    setGenreFilterPage(0);
  }, [availableGenres]);

  useEffect(() => {
    if (genreFilterPage >= genreFilterPageCount) {
      setGenreFilterPage(genreFilterPageCount - 1);
    }
  }, [genreFilterPage, genreFilterPageCount]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) return prev.filter((g) => g !== genre);
      if (prev.length >= MAX_SERIES_GENRES) return prev;
      return [...prev, genre];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedGenres(visibleGenres.slice(0, MAX_SERIES_GENRES));
  }, [visibleGenres]);

  const selectNone = useCallback(() => {
    setSelectedGenres([]);
  }, []);

  const commentaryQueryEnabled =
    debouncedSelectedGenres.length > 0 &&
    chartData.length > 0 &&
    !isLoading &&
    !error;

  /** Résumé naturel par défaut : `mode=light` (un Groq par requête HTTP). */
  const {
    data: lightAi,
    isLoading: lightAiLoading,
    isFetching: lightAiFetching,
    error: lightAiError,
  } = useGenreTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedGenres,
    userId,
    {
      mode: "light",
      enabled: commentaryQueryEnabled,
    }
  );

  /** Variante détaillée : chargée seulement si l’utilisateur choisit l’onglet technique. */
  const {
    data: techAi,
    isLoading: techAiLoading,
    isFetching: techAiFetching,
    error: techAiError,
  } = useGenreTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedGenres,
    userId,
    {
      mode: "technical",
      enabled: commentaryQueryEnabled && summaryVersion === "technical",
    }
  );

  const aiCommentary = useMemo(
    () => ({
      commentary: techAi?.commentary ?? null,
      commentaryLight: lightAi?.commentaryLight ?? null,
      commentaryCached: techAi?.commentaryCached,
      commentaryLightCached: lightAi?.commentaryLightCached,
      aiUnavailable: techAi?.aiUnavailable ?? lightAi?.aiUnavailable,
    }),
    [techAi, lightAi]
  );

  const showAiSkeleton =
    (summaryVersion === "light" &&
      !lightAi?.commentaryLight &&
      !lightAi?.aiUnavailable &&
      (lightAiLoading || lightAiFetching)) ||
    (summaryVersion === "technical" &&
      !techAi?.commentary &&
      !techAi?.aiUnavailable &&
      (techAiLoading || techAiFetching));

  const displayAiCommentary =
    summaryVersion === "light"
      ? (aiCommentary?.commentaryLight ?? "")
      : (aiCommentary?.commentary ?? "");

  const hasDisplayableAiParagraph = displayAiCommentary.trim().length > 0;

  const activeAiError =
    summaryVersion === "technical" ? techAiError : lightAiError;

  const aiRefreshing =
    !aiCommentary?.aiUnavailable &&
    hasDisplayableAiParagraph &&
    ((summaryVersion === "light" && lightAiFetching) ||
      (summaryVersion === "technical" && techAiFetching));

  const heroPanel =
    isLoading && !data ? (
      <GenreTrendsHeroPanelSkeleton />
    ) : (
      <GenreTrendsHeroPanel period={period} selectedCount={selectedGenres.length} />
    );

  if (!isLoading && error && !data) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodSelector defaultPeriod="month" value={period} />
            <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          </div>
        </div>
        <div className="mt-5 space-y-6 lg:hidden">
          <GenreTrendsMobileEmptyHero genresHref={genresHref} badgeLabel={badgeLabel} />
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
        <div className="mt-6 hidden space-y-12 lg:block">
          <GenreTrendsHeroFrame
            genresHref={genresHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<GenreTrendsHeroPanel period={period} selectedCount={selectedGenres.length} />}
          />
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!isLoading && (!data || (chartData.length === 0 && availableGenres.length === 0))) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodSelector defaultPeriod="month" value={period} />
            <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          </div>
        </div>
        <div className="mt-5 space-y-6 lg:hidden">
          <GenreTrendsMobileEmptyHero genresHref={genresHref} badgeLabel={badgeLabel} />
          <EmptyState
            variant="startup"
            {...emptyStatePresets.changeDates(pathname)}
            message={t("noGenreData")}
            description={t("changeDatesDescription")}
          />
        </div>
        <div className="mt-6 hidden space-y-12 lg:block">
          <GenreTrendsHeroFrame
            genresHref={genresHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<GenreTrendsHeroPanel period={period} selectedCount={selectedGenres.length} />}
          />
          <EmptyState
            variant="startup"
            {...emptyStatePresets.changeDates(pathname)}
            message={t("noGenreData")}
            description={t("changeDatesDescription")}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodSelector defaultPeriod="month" value={period} />
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
        </div>
      </div>

      <div className="mt-5 lg:hidden">
        <GenreTrendsMobileExperience
          genresHref={genresHref}
          badgeLabel={badgeLabel}
          period={period}
          selectedGenres={selectedGenres}
          availableGenres={availableGenres}
          visibleGenres={visibleGenres}
          visibleGenreStart={visibleGenreStart}
          visibleGenreEnd={visibleGenreEnd}
          genreFilterPage={genreFilterPage}
          genreFilterPageCount={genreFilterPageCount}
          chartData={chartData}
          chartDisplayData={displayChartData}
          isLoading={isLoading}
          isFetching={chartFetching}
          selectionPending={selectionPending}
          chartTheme={chartTheme}
          toggleGenre={toggleGenre}
          selectAll={selectAll}
          selectNone={selectNone}
          setGenreFilterPage={setGenreFilterPage}
          displayAiCommentary={displayAiCommentary}
          hasDisplayableAiParagraph={hasDisplayableAiParagraph}
          showAiSkeleton={showAiSkeleton}
          activeAiError={activeAiError}
          aiUnavailable={Boolean(aiCommentary?.aiUnavailable)}
          aiRefreshing={aiRefreshing}
          canShowAiTabs={Boolean(aiCommentary?.commentaryLight || aiCommentary?.commentary)}
          summaryVersion={summaryVersion}
          setSummaryVersion={setSummaryVersion}
        />
      </div>

      <div className="mt-6 hidden space-y-12 lg:block">
        <GenreTrendsHeroFrame
          genresHref={genresHref}
          subtitleKey="subtitleExtended"
          badgeLabel={badgeLabel}
          panel={heroPanel}
        />
        {!isPublicDemoViewer ? <GenreAccuracyChooser viewerUserId={userId} className="max-w-3xl" /> : null}

        <div className="space-y-12">
          <section className="relative animate-fade-in-up">
            <GenreTrendsSectionHeader
              eyebrow={t("sections.picker.eyebrow")}
              title={t("sections.picker.title")}
              description={t("sections.picker.description")}
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-white text-slate-900 shadow-xl shadow-slate-900/[0.07] ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-gradient-to-br dark:from-surface-raised dark:via-surface dark:to-surface-dashboard dark:text-foreground dark:shadow-black/40 dark:ring-white/[0.06] dark:hover:shadow-black/50">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.07),transparent_36%),radial-gradient(circle_at_92%_12%,rgba(6,182,212,0.06),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_40%),radial-gradient(circle_at_92%_12%,rgba(6,182,212,0.1),transparent_36%)]"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent dark:via-violet-400/30" aria-hidden />
              <div className="relative border-b border-slate-200/80 px-5 py-5 sm:px-8 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-foreground">
                    <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_14px_rgb(139_92_246_/0.45)] dark:shadow-[0_0_14px_rgb(167_139_250_/0.35)]" aria-hidden />
                    {t("sections.picker.badge")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-200/80 bg-violet-50/90 px-2.5 py-1 text-xs font-semibold text-violet-950 tabular-nums dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100">
                      {t("selectionCount", {
                        selected: selectedGenres.length,
                        max: MAX_SERIES_GENRES,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={selectAll}
                      className="rounded-xl border border-violet-200/80 bg-white px-4 py-2 text-sm font-semibold text-violet-950 shadow-sm transition-colors hover:bg-violet-50/90 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100 dark:shadow-none dark:hover:bg-violet-400/25 dark:hover:text-white"
                    >
                      {t("all")}
                    </button>
                    <button
                      type="button"
                      onClick={selectNone}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/12 dark:bg-white/5 dark:text-foreground/90 dark:hover:bg-white/10"
                    >
                      {t("none")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative space-y-3 p-4 sm:p-6 lg:p-8">
                <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/95 p-4 shadow-inner shadow-slate-900/[0.04] sm:p-6 dark:border-white/10 dark:bg-card-surface dark:shadow-[inset_0_2px_12px_0_rgb(0_0_0/0.35)]">
            {availableGenres.length > GENRE_FILTER_PAGE_SIZE && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="text-xs text-slate-600 dark:text-muted">
                  <span>
                    {t("paginationSummary", {
                      start: visibleGenreStart + 1,
                      end: visibleGenreEnd,
                      total: availableGenres.length,
                    })}
                  </span>
                  <span className="ml-2">
                    {t("paginationPage", {
                      page: genreFilterPage + 1,
                      totalPages: genreFilterPageCount,
                    })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGenreFilterPage((page) => Math.max(0, page - 1))}
                    disabled={genreFilterPage === 0}
                    className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/12 dark:bg-white/5 dark:text-foreground/90 dark:hover:bg-white/10"
                  >
                    {t("paginationPrevious")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGenreFilterPage((page) =>
                        Math.min(genreFilterPageCount - 1, page + 1)
                      )
                    }
                    disabled={genreFilterPage >= genreFilterPageCount - 1}
                    className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/12 dark:bg-white/5 dark:text-foreground/90 dark:hover:bg-white/10"
                  >
                    {t("paginationNext")}
                  </button>
                </div>
              </div>
            )}
            {isLoading ? (
              <GenreFilterSkeleton />
            ) : (
              <div className="flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 dark:border-white/10 dark:bg-surface/60">
                {visibleGenres.map((genre) => {
                  const selected = selectedGenres.includes(genre);
                  const disabled = !selected && selectedGenres.length >= MAX_SERIES_GENRES;
                  const idx = availableGenres.indexOf(genre);
                  return (
                    <label
                      key={genre}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                        selected
                          ? "border-violet-400/65 bg-violet-100 text-violet-950 shadow-sm dark:border-violet-400/55 dark:bg-slate-950 dark:text-violet-100 dark:shadow-none"
                          : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/12 dark:bg-card-surface dark:text-foreground dark:hover:bg-white/[0.06]"
                      } ${
                        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => toggleGenre(genre)}
                        className="rounded border-slate-300 bg-violet-50 text-violet-600 accent-violet-600 focus:ring-violet-500 disabled:opacity-40 dark:border-white/25 dark:bg-slate-900 dark:accent-violet-400"
                      />
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: selected ? getColor(idx) : "transparent",
                          border: selected ? "none" : "1px solid #9ca3af",
                        }}
                      />
                      <span className="text-sm text-inherit">{genre}</span>
                    </label>
                  );
                })}
              </div>
            )}
                </div>
              </div>
            </div>
          </section>


          <section
            className="relative animate-fade-in-up transition-all duration-300"
            style={{ animationDelay: "60ms" }}
            aria-labelledby="genre-trends-spotlight-title"
          >
            <GenreTrendsSectionHeader
              eyebrow={t("sections.chart.eyebrow")}
              title={t("sections.chart.title")}
              description={t("sections.chart.description")}
            />
            <div className={DASHBOARD_SPOTLIGHT_SHELL}>
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
              <div className={`relative ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-5 sm:px-8`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className={`mb-2 ${DASHBOARD_SPOTLIGHT_BADGE_VIOLET}`}>
                      <LiveStatusDot tone="violet" />
                      {t("sections.chart.badge")}
                    </div>
                    <h2 id="genre-trends-spotlight-title" className={`${DASHBOARD_SPOTLIGHT_TITLE} tracking-tight sm:text-xl`}>
                      {t("evolution")}
                    </h2>
                    <p className={`mt-1 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("chartHint")}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className={DASHBOARD_SPOTLIGHT_PILL_MUTED}>
                      {t("selectionCount", { selected: selectedGenres.length, max: MAX_SERIES_GENRES })}
                    </span>
                    {!isPublicDemoViewer && selectedGenres.length === 1 ? (
                      <DuetCompareDeepLink entityType="genre" entityId={selectedGenres[0]!} />
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                {isLoading ? (
                  <GenreTrendsChartSkeleton />
                ) : selectedGenres.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-6 py-12 text-center dark:border-white/10 dark:bg-black/30">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t("selectAtLeastOne")}</p>
                  </div>
                ) : (
                  <div
                    className={`relative ${DASHBOARD_SPOTLIGHT_INNER_WELL} min-h-[280px] lg:min-h-[500px]`}
                    aria-busy={chartDataSyncing}
                  >
                    {chartDataSyncing && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[1.35rem] bg-white/90 px-4 text-center backdrop-blur-[2px] dark:bg-slate-950/80">
                        <span
                          className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent dark:border-violet-400"
                          aria-hidden
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {selectionPending ? t("selectionPending") : t("chartUpdating")}
                        </span>
                      </div>
                    )}
                    <div
                      className={`transition-opacity duration-200 ${chartDataSyncing ? "pointer-events-none opacity-40" : ""}`}
                    >
                      <ChartResponsiveContainer
                        token="tracksMain"
                        minWidth={chartData.length > 10 ? Math.max(320, chartData.length * 32) : undefined}
                      >
                        <RechartsLineChart data={displayChartData} margin={{ top: 8, right: 20, left: 4, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                          <XAxis
                            dataKey="formattedDate"
                            tick={{ fill: chartTheme.tick, fontSize: 11 }}
                            stroke={chartTheme.axisStroke}
                            angle={-45}
                            textAnchor="end"
                            height={78}
                          />
                          <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} stroke={chartTheme.axisStroke} width={40} />
                          <Tooltip content={<TrendsTooltip />} />
                          <Legend wrapperStyle={{ color: chartTheme.legend, paddingTop: 14, fontSize: "12px" }} />
                          {selectedGenres.map((genre) => (
                            <Line
                              key={genre}
                              type="monotone"
                              dataKey={genre}
                              name={genre}
                              stroke={getColor(availableGenres.indexOf(genre))}
                              strokeWidth={2.5}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                              animationDuration={500}
                              animationEasing="ease-in-out"
                            />
                          ))}
                        </RechartsLineChart>
                      </ChartResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {debouncedSelectedGenres.length > 0 && chartData.length > 0 && (
            <section
              className={`${OVERVIEW_STARTUP_SURFACE_BASE} animate-fade-in-up`}
              aria-labelledby="genre-trends-ai-spotlight-title"
              aria-busy={aiRefreshing}
            >
              <OverviewStartupSurfaceBg />
              <div className="relative border-b border-slate-200/90 px-6 py-5 dark:border-white/10 sm:px-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
                      <span
                        className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]"
                        aria-hidden
                      />
                      {t("aiSpotlightEyebrow")}
                    </div>
                    <h2
                      id="genre-trends-ai-spotlight-title"
                      className="text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-4xl dark:text-white"
                    >
                      {t("aiSpotlightTitle")}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
                      {t("aiSpotlightHint")}
                      {displayAiCommentary &&
                        ((summaryVersion === "technical" &&
                          aiCommentary?.commentaryCached) ||
                          (summaryVersion === "light" &&
                            aiCommentary?.commentaryLightCached)) && (
                          <span className="ml-1 text-slate-500 dark:text-slate-400">{t("aiCached")}</span>
                        )}
                      {aiRefreshing && (
                        <span className="ml-2 inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-200/90">
                          <span
                            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                            aria-hidden
                          />
                          <span>{t("aiUpdating")}</span>
                        </span>
                      )}
                    </p>
                  </div>
                  {(aiCommentary?.commentaryLight || aiCommentary?.commentary) && (
                    <div
                      className="flex shrink-0 rounded-xl border border-slate-200/90 bg-slate-50/95 p-1 dark:border-white/15 dark:bg-white/5"
                      role="tablist"
                      aria-label={t("aiExplanation")}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={summaryVersion === "light"}
                        aria-busy={
                          summaryVersion === "light" &&
                          (lightAiLoading || lightAiFetching)
                        }
                        onClick={() => setSummaryVersion("light")}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          summaryVersion === "light"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        {t("summaryVersionLight")}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={summaryVersion === "technical"}
                        aria-busy={
                          summaryVersion === "technical" &&
                          (techAiLoading || techAiFetching)
                        }
                        onClick={() => setSummaryVersion("technical")}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          summaryVersion === "technical"
                            ? "bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white"
                            : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        }`}
                      >
                        {t("summaryVersionTechnical")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative p-6 sm:p-8">
                <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
                  {showAiSkeleton ? (
                    <div className="space-y-3 animate-pulse" aria-busy="true">
                      <div className="h-4 w-full max-w-3xl rounded bg-slate-200/80 dark:bg-white/10" />
                      <div className="h-4 w-full max-w-2xl rounded bg-slate-200/80 dark:bg-white/10" />
                      <div className="h-4 w-4/5 max-w-xl rounded bg-slate-200/80 dark:bg-white/10" />
                    </div>
                  ) : activeAiError ? (
                    isGroqDailyQuotaError(activeAiError) ? (
                      <GroqQuotaNotice error={activeAiError} />
                    ) : (
                      <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                        {activeAiError.message}
                      </p>
                    )
                  ) : aiCommentary?.aiUnavailable ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("aiUnavailable")}</p>
                  ) : hasDisplayableAiParagraph ? (
                    <p
                      className={`whitespace-pre-line text-base leading-relaxed text-slate-700 transition-opacity duration-200 dark:text-slate-200 sm:text-[1.05rem] ${
                        aiRefreshing ? "opacity-60" : ""
                      }`}
                    >
                      {displayAiCommentary}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("aiEmpty")}</p>
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

function GenreTrendsFallback() {
  const searchParams = useSearchParams();
  const period = getPeriodFromSearchParams(searchParams, "month");
  const badgeLabel = useGenreTrendsBadgeLabel();
  const genresHref = useGenresListHref();
  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 w-64 animate-pulse rounded-xl border border-white/10 bg-white/10" />
      </div>
      <div className="mt-5 lg:hidden">
        <GenreTrendsMobileSkeleton />
      </div>
      <div className="mt-6 hidden space-y-12 lg:block">
        <GenreTrendsHeroFrame
          genresHref={genresHref}
          subtitleKey="subtitle"
          badgeLabel={badgeLabel}
          panel={<GenreTrendsHeroPanel period={period} selectedCount={0} />}
        />
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function GenreTrendsPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<GenreTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
