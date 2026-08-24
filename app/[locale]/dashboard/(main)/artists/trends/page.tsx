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
  type ReactElement,
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
import {
  useArtistTrendsChart,
  useArtistTrendsCommentary,
} from "@/lib/hooks/use-artists";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { getPeriodFromSearchParams, PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { nextDefaultTrendSelection } from "@/lib/utils/listen-trend-default-selection";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { ArtistTrendsArtistPicker } from "@/lib/components/artist-trends-artist-picker";
import {
  ArtistTrendsMobileEmpty,
  ArtistTrendsMobileExperience,
  ArtistTrendsMobileSkeleton,
} from "@/lib/components/artist-trends-mobile";
import type { ArtistTrendsChartArtist, ArtistTrendsChartDataPoint } from "@/lib/dto/artist";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import {
  OVERVIEW_STARTUP_SURFACE_BASE,
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_PILL_MUTED,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { useTheme } from "@/lib/providers/theme-provider";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { ArrowLeft } from "lucide-react";

const MAX_SERIES_ARTISTS = 50;
/** Délai après lequel les sélections d’artistes déclenchent chart + IA (évite rafales de requêtes). */
const ARTIST_SELECTION_DEBOUNCE_MS = 450;

const TRENDS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const GROUP_BY_BAR_CLASS =
  "hidden lg:block sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 -mt-4 border-b border-white/10 bg-surface-glass/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8";

function useArtistsListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/artists?${qs}` : "/dashboard/artists";
  }, [searchParams]);
}

function periodToLabelKey(period: PeriodType): "daily" | "weekly" | "monthly" {
  if (period === "day") return "daily";
  if (period === "week") return "weekly";
  return "monthly";
}

function useArtistTrendsBadgeLabel() {
  const locale = useLocale();
  const tOverview = useTranslations("overview");
  const { startDate, endDate } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(startDate, endDate, locale);
  return dateRangeLabel || tOverview("allData");
}

function ArtistTrendsSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
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

function ArtistTrendsHeroPanelSkeleton() {
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

function ArtistTrendsHeroPanel({ period, selectedCount }: { period: PeriodType; selectedCount: number }) {
  const t = useTranslations("artistTrends");
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
          {selectedCount} / {MAX_SERIES_ARTISTS}
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroPanelSeries")}</p>
      </div>
    </div>
  );
}

function ArtistTrendsHeroFrame({
  artistsHref,
  subtitleKey,
  badgeLabel,
  panel,
}: {
  artistsHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
  badgeLabel: string;
  panel: ReactNode;
}) {
  const t = useTranslations("artistTrends");
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
              href={artistsHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToArtists")}
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

function ArtistPickerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-10 w-full max-w-md rounded-xl border border-border bg-surface animate-shimmer" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="h-9 rounded-full border border-border bg-surface animate-shimmer"
            style={{ width: `${96 + ((index * 23) % 88)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function ArtistTrendsChartSkeleton() {
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

function idsEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

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

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

type ArtistTrendSignal = {
  id: string;
  label: string;
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

function getNumericTrendValue(point: ArtistTrendsChartDataPoint, artistId: string): number {
  const value = point[artistId];
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function buildArtistTrendSignals({
  chartData,
  selectedIds,
  idToName,
  getArtistIndex,
}: {
  chartData: ArtistTrendsChartDataPoint[];
  selectedIds: string[];
  idToName: Map<string, string>;
  getArtistIndex: (artistId: string) => number;
}): ArtistTrendSignal[] {
  return selectedIds
    .map((artistId) => {
      let total = 0;
      let peak = 0;
      let peakDate = "";
      let activeBuckets = 0;

      chartData.forEach((point) => {
        const value = getNumericTrendValue(point, artistId);
        total += value;
        if (value > 0) activeBuckets += 1;
        if (value > peak) {
          peak = value;
          peakDate = String(point.formattedDate || point.date || "");
        }
      });

      const first = chartData[0] ? getNumericTrendValue(chartData[0], artistId) : 0;
      const last = chartData[chartData.length - 1] ? getNumericTrendValue(chartData[chartData.length - 1], artistId) : 0;
      const idx = getArtistIndex(artistId);

      return {
        id: artistId,
        label: idToName.get(artistId) ?? artistId,
        color: getColor(idx >= 0 ? idx : 0),
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
  TrendsTooltipInner.displayName = "ArtistTrendsTooltip";
  return TrendsTooltipInner;
}

function TrendsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const t = useTranslations("artistTrends");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = getPeriodFromSearchParams(searchParams, "month");
  const badgeLabel = useArtistTrendsBadgeLabel();

  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const artistsHref = useArtistsListHref();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [summaryVersion, setSummaryVersion] = useState<"light" | "technical">(
    "light"
  );
  const [extraSearchArtists, setExtraSearchArtists] = useState<
    ArtistTrendsChartArtist[]
  >([]);
  const selectionTouchedRef = useRef(false);

  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setExtraSearchArtists([]);
  }, [startDate, endDate]);

  /** 0 ms jusqu’à la première réponse chart — pas de délai au premier rendu des sélections par défaut. */
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);
  const debouncedSelectedIds = useDebouncedValue(
    selectedIds,
    selectionDebounceMs
  );
  const selectionPending = !idsEqualSorted(selectedIds, debouncedSelectedIds);

  const artistIdsForFetch =
    debouncedSelectedIds.length > 0 ? debouncedSelectedIds : undefined;

  const {
    data,
    isLoading,
    isFetching: chartFetching,
    error,
    refetch,
  } = useArtistTrendsChart(
    startDate,
    endDate,
    period,
    artistIdsForFetch,
    undefined,
    userId
  );

  useEffect(() => {
    setSelectionDebounceMs(0);
  }, [startDate, endDate, period]);

  useEffect(() => {
    if (!chartFetching && data != null && !error) {
      setSelectionDebounceMs(ARTIST_SELECTION_DEBOUNCE_MS);
    }
  }, [chartFetching, data, error]);

  const chartDataSyncing = chartFetching || selectionPending;

  const pickerArtists = useMemo(() => {
    const base = data?.catalogArtists ?? data?.availableArtists ?? [];
    const merged = new Map<string, ArtistTrendsChartArtist>();
    for (const a of base) merged.set(a.id, a);
    for (const a of extraSearchArtists) merged.set(a.id, a);
    return Array.from(merged.values());
  }, [data?.catalogArtists, data?.availableArtists, extraSearchArtists]);

  useEffect(() => {
    const cat = data?.catalogArtists;
    if (!cat?.length) return;
    setExtraSearchArtists((prev) => {
      const ids = new Set(cat.map((a) => a.id));
      return prev.filter((p) => !ids.has(p.id));
    });
  }, [data?.catalogArtists]);

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of pickerArtists) m.set(a.id, a.name);
    for (const a of data?.availableArtists ?? []) {
      if (!m.has(a.id)) m.set(a.id, a.name);
    }
    return m;
  }, [pickerArtists, data?.availableArtists]);

  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedIds),
    [chartData, chartView, selectedIds]
  );

  const defaultSourceIds = useMemo(() => {
    const src = data?.catalogArtists ?? data?.availableArtists;
    return src?.map((a) => a.id) ?? [];
  }, [data?.catalogArtists, data?.availableArtists]);

  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setSelectedIds((prev) => {
      const next = nextDefaultTrendSelection({
        selectionTouched: false,
        chartFetching,
        catalogIds: defaultSourceIds,
        currentIds: prev,
      });
      return next ?? prev;
    });
  }, [startDate, endDate, chartFetching, defaultSourceIds]);

  const toggleArtist = useCallback((id: string) => {
    selectionTouchedRef.current = true;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERIES_ARTISTS) return prev;
      return [...prev, id];
    });
  }, []);

  const handlePickRemoteArtist = useCallback((artist: ArtistTrendsChartArtist) => {
    selectionTouchedRef.current = true;
    setExtraSearchArtists((prev) => {
      if (prev.some((p) => p.id === artist.id)) return prev;
      return [...prev, artist];
    });
    setSelectedIds((prev) => {
      if (prev.includes(artist.id)) return prev;
      if (prev.length >= MAX_SERIES_ARTISTS) return prev;
      return [...prev, artist.id];
    });
  }, []);

  const selectAll = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedIds(pickerArtists.slice(0, MAX_SERIES_ARTISTS).map((a) => a.id));
  }, [pickerArtists]);

  const selectNone = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedIds([]);
  }, []);

  const getArtistIndex = useCallback(
    (artistId: string) => pickerArtists.findIndex((a) => a.id === artistId),
    [pickerArtists]
  );

  const commentaryQueryEnabled =
    debouncedSelectedIds.length > 0 &&
    chartData.length > 0 &&
    !isLoading &&
    !error;

  const {
    data: lightAi,
    isLoading: lightAiLoading,
    isFetching: lightAiFetching,
    error: lightAiError,
  } = useArtistTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedIds,
    userId,
    {
      mode: "light",
      enabled: commentaryQueryEnabled,
    }
  );

  const {
    data: techAi,
    isLoading: techAiLoading,
    isFetching: techAiFetching,
    error: techAiError,
  } = useArtistTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedIds,
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

  const aiRefreshing =
    !aiCommentary?.aiUnavailable &&
    hasDisplayableAiParagraph &&
    ((summaryVersion === "light" && lightAiFetching) ||
      (summaryVersion === "technical" && techAiFetching));

  const activeAiError =
    summaryVersion === "technical" ? techAiError : lightAiError;

  const heroPanel =
    isLoading && !data ? (
      <ArtistTrendsHeroPanelSkeleton />
    ) : (
      <ArtistTrendsHeroPanel period={period} selectedCount={selectedIds.length} />
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
        <div className="lg:hidden">
          <ArtistTrendsMobileEmpty artistsHref={artistsHref}>
            <ErrorState
              variant="startup"
              error={error}
              message={t("errorLoading")}
              onRetry={() => refetch()}
            />
          </ArtistTrendsMobileEmpty>
        </div>
        <div className="mt-6 hidden space-y-12 lg:block">
            <ArtistTrendsHeroFrame
              artistsHref={artistsHref}
              subtitleKey="subtitleExtended"
              badgeLabel={badgeLabel}
              panel={<ArtistTrendsHeroPanel period={period} selectedCount={selectedIds.length} />}
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

  if (!isLoading && (!data || (chartData.length === 0 && pickerArtists.length === 0))) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <div className="flex flex-wrap items-center gap-3">
            <PeriodSelector defaultPeriod="month" value={period} />
            <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          </div>
        </div>
        <div className="lg:hidden">
          <ArtistTrendsMobileEmpty artistsHref={artistsHref} />
        </div>
        <div className="mt-6 hidden space-y-12 lg:block">
            <ArtistTrendsHeroFrame
              artistsHref={artistsHref}
              subtitleKey="subtitleExtended"
              badgeLabel={badgeLabel}
              panel={<ArtistTrendsHeroPanel period={period} selectedCount={selectedIds.length} />}
            />
            <EmptyState
              variant="startup"
              {...emptyStatePresets.changeDates(pathname)}
              message={t("noArtistData")}
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

      <div className="lg:hidden">
        <ArtistTrendsMobileExperience
          artistsHref={artistsHref}
          period={period}
          selectedIds={selectedIds}
          pickerArtists={pickerArtists}
          chartData={chartData}
          chartDisplayData={displayChartData}
          isLoading={isLoading}
          isUpdating={chartFetching || selectionPending}
          idToName={idToName}
          getArtistIndex={getArtistIndex}
          getColor={getColor}
          toggleArtist={toggleArtist}
          selectAll={selectAll}
          selectNone={selectNone}
          handlePickRemoteArtist={handlePickRemoteArtist}
          maxSelectable={MAX_SERIES_ARTISTS}
          chartView={chartView}
          setChartView={setChartView}
          aiVisible={debouncedSelectedIds.length > 0 && chartData.length > 0}
          summaryVersion={summaryVersion}
          setSummaryVersion={setSummaryVersion}
          showAiSkeleton={showAiSkeleton}
          activeAiError={activeAiError}
          aiUnavailable={Boolean(aiCommentary?.aiUnavailable)}
          hasDisplayableAiParagraph={hasDisplayableAiParagraph}
          displayAiCommentary={displayAiCommentary}
          aiRefreshing={aiRefreshing}
          commentaryCached={Boolean(
            (summaryVersion === "technical" && aiCommentary?.commentaryCached) ||
              (summaryVersion === "light" && aiCommentary?.commentaryLightCached)
          )}
        />
      </div>

      <div className="mt-6 hidden space-y-12 lg:block">
          <ArtistTrendsHeroFrame
            artistsHref={artistsHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={heroPanel}
          />

          <div className="space-y-12">
          <section className="relative animate-fade-in-up">
            <ArtistTrendsSectionHeader
              eyebrow={t("sections.picker.eyebrow")}
              title={t("sections.picker.title")}
              description={t("sections.picker.description")}
            />
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-card via-surface-dashboard to-background text-foreground shadow-card ring-1 ring-card-border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:from-card dark:via-surface-raised dark:to-card dark:hover:shadow-black/50">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_36%),radial-gradient(circle_at_92%_12%,rgba(79,144,224,0.06),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(176,108,255,0.09),transparent_38%),radial-gradient(circle_at_92%_12%,rgba(79,144,224,0.06),transparent_32%)]"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" aria-hidden />
              <div className="relative border-b border-border px-5 py-5 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_14px_rgb(var(--primary-rgb)/0.5)]" aria-hidden />
                    {t("sections.picker.badge")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/[0.17]"
                    >
                      {t("all")}
                    </button>
                    <button
                      type="button"
                      onClick={selectNone}
                      className="rounded-xl border border-border bg-muted/12 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/22"
                    >
                      {t("none")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="rounded-[1.35rem] border border-border bg-card-surface p-4 shadow-inner sm:p-6">
                  {isLoading ? (
                    <ArtistPickerSkeleton />
                  ) : (
                    <ArtistTrendsArtistPicker
                      catalogArtists={pickerArtists}
                      selectedIds={selectedIds}
                      onToggle={toggleArtist}
                      getColor={getColor}
                      getArtistIndex={getArtistIndex}
                      enableRemoteSearch
                      onPickRemoteArtist={handlePickRemoteArtist}
                      maxSelectable={MAX_SERIES_ARTISTS}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>

          <section
            className="relative animate-fade-in-up transition-all duration-300"
            style={{ animationDelay: "60ms" }}
            aria-labelledby="artist-trends-spotlight-title"
          >
            <ArtistTrendsSectionHeader
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
                    <h2 id="artist-trends-spotlight-title" className={`${DASHBOARD_SPOTLIGHT_TITLE} tracking-tight sm:text-xl`}>
                      {t("evolution")}
                    </h2>
                    <p className={`mt-1 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("chartHint")}</p>
                  </div>
                  <span className={DASHBOARD_SPOTLIGHT_PILL_MUTED}>
                    {t("selectionCount", { selected: selectedIds.length, max: MAX_SERIES_ARTISTS })}
                  </span>
                </div>
              </div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                {isLoading ? (
                  <ArtistTrendsChartSkeleton />
                ) : selectedIds.length === 0 ? (
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
                          {selectedIds.map((artistId) => {
                            const idx = getArtistIndex(artistId);
                            const name = idToName.get(artistId) ?? artistId;
                            return (
                              <Line
                                key={artistId}
                                type="monotone"
                                dataKey={artistId}
                                name={name}
                                stroke={getColor(idx >= 0 ? idx : 0)}
                                strokeWidth={2.5}
                                dot={{ r: 3 }}
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
              </div>
            </div>
          </section>

          {debouncedSelectedIds.length > 0 && chartData.length > 0 && (
            <section
              className={`${OVERVIEW_STARTUP_SURFACE_BASE} animate-fade-in-up`}
              aria-labelledby="artist-trends-ai-spotlight-title"
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
                      id="artist-trends-ai-spotlight-title"
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

function ArtistTrendsFallback() {
  const searchParams = useSearchParams();
  const badgeLabel = useArtistTrendsBadgeLabel();
  const period = getPeriodFromSearchParams(searchParams, "month");
  const artistsHref = useArtistsListHref();

  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 w-64 animate-pulse rounded-xl border border-white/10 bg-white/10" />
      </div>
      <div className="mt-6">
        <div className="lg:hidden">
          <ArtistTrendsMobileSkeleton />
        </div>
        <div className="hidden space-y-12 lg:block">
          <ArtistTrendsHeroFrame
            artistsHref={artistsHref}
            subtitleKey="subtitle"
            badgeLabel={badgeLabel}
            panel={<ArtistTrendsHeroPanel period={period} selectedCount={0} />}
          />
          <GenreTrendsSkeleton />
        </div>
      </div>
    </>
  );
}

export default function ArtistTrendsPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<ArtistTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
