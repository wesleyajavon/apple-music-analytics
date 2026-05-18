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
  ResponsiveContainer,
} from "recharts";
import {
  useArtistTrendsChart,
  useArtistTrendsCommentary,
} from "@/lib/hooks/use-artists";
import type { ArtistTrendsChartDataPoint } from "@/lib/dto/artist";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { getPeriodFromSearchParams, PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { ArtistTrendsArtistPicker } from "@/lib/components/artist-trends-artist-picker";
import type { ArtistTrendsChartArtist } from "@/lib/dto/artist";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { ArrowLeft } from "lucide-react";

const MAX_SERIES_ARTISTS = 50;
/** Délai après lequel les sélections d’artistes déclenchent chart + IA (évite rafales de requêtes). */
const ARTIST_SELECTION_DEBOUNCE_MS = 450;

const TRENDS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 -mt-4 border-b border-white/10 bg-surface-glass/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8";

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
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
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
      <div className="h-10 w-full max-w-md rounded-xl border border-slate-200/90 bg-slate-100/90 animate-shimmer" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="h-9 rounded-full border border-slate-200/80 bg-slate-100/80 animate-shimmer"
            style={{ width: `${96 + ((index * 23) % 88)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function ArtistTrendsChartSkeleton() {
  return (
    <div className="relative min-h-[500px] rounded-[1.35rem] border border-white/10 bg-black/30 p-6" aria-busy="true">
      <div className="flex h-[452px] flex-col justify-between">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-white/10" />
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
          <div key={index} className="h-3 w-28 rounded bg-white/10 animate-shimmer" />
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

export type ArtistTrendDelta = {
  artistId: string;
  artistName: string;
  firstHalf: number;
  secondHalf: number;
  delta: number;
  deltaPercent: number;
  direction: "up" | "down" | "stable";
};

function computeRiseDecline(
  data: ArtistTrendsChartDataPoint[],
  artistIds: string[],
  idToName: Map<string, string>
): ArtistTrendDelta[] {
  if (data.length === 0) return [];
  const mid = Math.ceil(data.length / 2);
  const first = data.slice(0, mid);
  const second = data.slice(mid);

  return artistIds.map((artistId) => {
    const firstHalf = first.reduce(
      (sum, row) => sum + (Number(row[artistId]) || 0),
      0
    );
    const secondHalf = second.reduce(
      (sum, row) => sum + (Number(row[artistId]) || 0),
      0
    );
    const delta = secondHalf - firstHalf;
    const base = firstHalf || 1;
    const deltaPercent = Math.round((delta / base) * 100);
    let direction: "up" | "down" | "stable" = "stable";
    if (delta > 0) direction = "up";
    else if (delta < 0) direction = "down";

    return {
      artistId,
      artistName: idToName.get(artistId) ?? artistId,
      firstHalf,
      secondHalf,
      delta,
      deltaPercent,
      direction,
    };
  });
}

function TrendsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const defaultSelectionAppliedRef = useRef(false);

  useEffect(() => {
    defaultSelectionAppliedRef.current = false;
  }, [startDate, endDate, period]);

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

  const defaultSourceIds = useMemo(() => {
    const src = data?.catalogArtists ?? data?.availableArtists;
    return src?.map((a) => a.id) ?? [];
  }, [data?.catalogArtists, data?.availableArtists]);

  useEffect(() => {
    if (defaultSourceIds.length === 0) return;
    if (defaultSelectionAppliedRef.current) return;
    if (selectedIds.length > 0) return;
    const defaultSelected =
      defaultSourceIds.length <= 5
        ? [...defaultSourceIds]
        : defaultSourceIds.slice(0, 5);
    setSelectedIds(defaultSelected);
    defaultSelectionAppliedRef.current = true;
  }, [defaultSourceIds, selectedIds.length]);

  const toggleArtist = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERIES_ARTISTS) return prev;
      return [...prev, id];
    });
  }, []);

  const handlePickRemoteArtist = useCallback((artist: ArtistTrendsChartArtist) => {
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
    setSelectedIds(pickerArtists.slice(0, MAX_SERIES_ARTISTS).map((a) => a.id));
  }, [pickerArtists]);

  const selectNone = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const getArtistIndex = useCallback(
    (artistId: string) => pickerArtists.findIndex((a) => a.id === artistId),
    [pickerArtists]
  );

  const riseDecline = useMemo(
    () => computeRiseDecline(chartData, selectedIds, idToName),
    [chartData, selectedIds, idToName]
  );

  const rising = useMemo(
    () =>
      riseDecline
        .filter((r) => r.direction === "up")
        .sort((a, b) => b.deltaPercent - a.deltaPercent),
    [riseDecline]
  );
  const declining = useMemo(
    () =>
      riseDecline
        .filter((r) => r.direction === "down")
        .sort((a, b) => a.deltaPercent - b.deltaPercent),
    [riseDecline]
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
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-12">
          <ArtistTrendsHeroFrame
            artistsHref={artistsHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<ArtistTrendsHeroPanel period={period} selectedCount={selectedIds.length} />}
          />
          <ErrorState
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
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-12">
          <ArtistTrendsHeroFrame
            artistsHref={artistsHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<ArtistTrendsHeroPanel period={period} selectedCount={selectedIds.length} />}
          />
          <EmptyState
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
        <PeriodSelector defaultPeriod="month" value={period} />
      </div>

      <div className="mt-6 space-y-12">
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
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-white text-slate-900 shadow-xl shadow-slate-900/[0.07] ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-slate-300/50 dark:from-slate-100 dark:via-white dark:to-slate-50 dark:text-slate-900 dark:hover:shadow-black/25">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.07),transparent_36%),radial-gradient(circle_at_92%_12%,rgba(6,182,212,0.06),transparent_32%)]"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" aria-hidden />
              <div className="relative border-b border-slate-200/80 px-5 py-5 sm:px-8 dark:border-slate-200/90">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_14px_rgb(139_92_246_/0.45)]" aria-hidden />
                    {t("sections.picker.badge")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="rounded-xl border border-violet-200/80 bg-white px-4 py-2 text-sm font-semibold text-violet-950 shadow-sm transition-colors hover:bg-violet-50/90 dark:border-violet-300/50 dark:bg-white dark:text-violet-950 dark:hover:bg-violet-50/80"
                    >
                      {t("all")}
                    </button>
                    <button
                      type="button"
                      onClick={selectNone}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-300/60 dark:bg-slate-100/90 dark:text-slate-800 dark:hover:bg-slate-100"
                    >
                      {t("none")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/95 p-4 shadow-inner shadow-slate-900/[0.04] sm:p-6 dark:border-slate-200/90 dark:bg-white">
                  {isLoading ? (
                    <ArtistPickerSkeleton />
                  ) : (
                    <div className="[&_#artist-trends-search]:border-slate-200/90 [&_#artist-trends-search]:bg-white [&_#artist-trends-search]:text-slate-900 [&_#artist-trends-search]:placeholder:text-slate-500 [&_#artist-trends-listbox]:border-slate-200/80 [&_#artist-trends-listbox]:bg-slate-50/80">
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
                    </div>
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
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/35">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_12%_70%,rgba(6,182,212,0.1),transparent_34%)]"
                aria-hidden
              />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/35 to-transparent" aria-hidden />
              <div className="relative border-b border-white/10 px-5 py-5 sm:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">
                      <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.55)]" />
                      {t("sections.chart.badge")}
                    </div>
                    <h2 id="artist-trends-spotlight-title" className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                      {t("evolution")}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">{t("chartHint")}</p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                    {t("selectionCount", { selected: selectedIds.length, max: MAX_SERIES_ARTISTS })}
                  </span>
                </div>
              </div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                {isLoading ? (
                  <ArtistTrendsChartSkeleton />
                ) : selectedIds.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-white/10 bg-black/30 px-6 py-12 text-center">
                    <p className="text-sm text-slate-400">{t("selectAtLeastOne")}</p>
                  </div>
                ) : (
                  <div
                    className="relative min-h-[500px] rounded-[1.35rem] border border-white/10 bg-black/25 p-3 backdrop-blur-sm"
                    aria-busy={chartDataSyncing}
                  >
                    {chartDataSyncing && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[1.35rem] bg-slate-950/80 backdrop-blur-[2px] px-4 text-center">
                        <span
                          className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-violet-400 border-t-transparent"
                          aria-hidden
                        />
                        <span className="text-sm font-medium text-white">
                          {selectionPending ? t("selectionPending") : t("chartUpdating")}
                        </span>
                      </div>
                    )}
                    <div
                      className={`transition-opacity duration-200 ${chartDataSyncing ? "pointer-events-none opacity-40" : ""}`}
                    >
                      <ResponsiveContainer width="100%" height={500}>
                        <RechartsLineChart data={chartData} margin={{ top: 8, right: 20, left: 4, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                          <XAxis
                            dataKey="formattedDate"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            stroke="rgba(148,163,184,0.35)"
                            angle={-45}
                            textAnchor="end"
                            height={78}
                          />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} stroke="rgba(148,163,184,0.35)" width={40} />
                          <Tooltip content={<TrendsTooltip />} />
                          <Legend wrapperStyle={{ color: "#cbd5e1", paddingTop: 14, fontSize: "12px" }} />
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
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {debouncedSelectedIds.length > 0 && chartData.length > 0 && (
            <section
              className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg backdrop-blur-sm animate-fade-in-up transition-all duration-300 dark:border-gray-600/50 dark:bg-gray-800/90"
              aria-labelledby="artist-trends-ai-spotlight-title"
              aria-busy={aiRefreshing}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-700 via-emerald-600 to-amber-600 opacity-70" />
              <div className="relative">
                <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-700/50">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300">
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
                            d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2
                          id="artist-trends-ai-spotlight-title"
                          className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
                        >
                          {t("aiSpotlightTitle")}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {t("aiSpotlightHint")}
                          {displayAiCommentary &&
                            ((summaryVersion === "technical" &&
                              aiCommentary?.commentaryCached) ||
                              (summaryVersion === "light" &&
                                aiCommentary?.commentaryLightCached)) && (
                              <span className="ml-1">{t("aiCached")}</span>
                            )}
                          {aiRefreshing && (
                            <span className="ml-2 inline-flex items-center gap-1.5 text-violet-700/90 dark:text-violet-300/80">
                              <span
                                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                                aria-hidden
                              />
                              <span>{t("aiUpdating")}</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {(aiCommentary?.commentaryLight || aiCommentary?.commentary) && (
                      <div
                        className="flex rounded-lg border border-gray-200 bg-gray-50/80 p-1 dark:border-gray-600 dark:bg-gray-700/30"
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
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            summaryVersion === "light"
                              ? "bg-white text-violet-700 shadow-sm dark:bg-gray-800 dark:text-violet-300"
                              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
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
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            summaryVersion === "technical"
                              ? "bg-white text-violet-700 shadow-sm dark:bg-gray-800 dark:text-violet-300"
                              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          }`}
                        >
                          {t("summaryVersionTechnical")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  {showAiSkeleton ? (
                    <div className="space-y-3 animate-pulse" aria-busy="true">
                      <div className="h-4 bg-gray-200 rounded w-full max-w-3xl dark:bg-gray-700" />
                      <div className="h-4 bg-gray-200 rounded w-full max-w-2xl dark:bg-gray-700" />
                      <div className="h-4 bg-gray-200 rounded w-4/5 max-w-xl dark:bg-gray-700" />
                    </div>
                  ) : activeAiError ? (
                    isGroqDailyQuotaError(activeAiError) ? (
                      <GroqQuotaNotice error={activeAiError} />
                    ) : (
                      <p
                        className="text-sm text-red-600 dark:text-red-400"
                        role="alert"
                      >
                        {activeAiError.message}
                      </p>
                    )
                  ) : aiCommentary?.aiUnavailable ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("aiUnavailable")}
                    </p>
                  ) : hasDisplayableAiParagraph ? (
                    <p
                      className={`text-gray-700 leading-relaxed whitespace-pre-line transition-opacity duration-200 dark:text-gray-200 ${
                        aiRefreshing ? "opacity-60" : ""
                      }`}
                    >
                      {displayAiCommentary}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("aiEmpty")}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {selectedIds.length > 0 && (rising.length > 0 || declining.length > 0) && (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-200 ${
                chartDataSyncing ? "opacity-60" : ""
              }`}
              aria-busy={chartDataSyncing}
            >
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg backdrop-blur-sm dark:border-gray-600/50 dark:bg-gray-800/90">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-600 via-violet-700 to-transparent opacity-70" />
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">↑</span>
                  {t("rising")}
                </h2>
                <ul className="space-y-2">
                  {rising.map((r) => (
                    <li
                      key={r.artistId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-700/30"
                    >
                      <span className="min-w-0 truncate text-gray-900 dark:text-white">
                        {r.artistName}
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 font-medium tabular-nums text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        +{r.deltaPercent}% ({r.delta > 0 ? "+" : ""}
                        {r.delta.toLocaleString(locale)} {t("listensDelta")})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg backdrop-blur-sm dark:border-gray-600/50 dark:bg-gray-800/90">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-rose-700 via-violet-700 to-transparent opacity-70" />
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">↓</span>
                  {t("declining")}
                </h2>
                <ul className="space-y-2">
                  {declining.map((r) => (
                    <li
                      key={r.artistId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-700/30"
                    >
                      <span className="min-w-0 truncate text-gray-900 dark:text-white">
                        {r.artistName}
                      </span>
                      <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 font-medium tabular-nums text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                        {r.deltaPercent}% ({r.delta.toLocaleString(locale)}{" "}
                        {t("listensDelta")})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
      <div className="mt-6 space-y-12">
        <ArtistTrendsHeroFrame
          artistsHref={artistsHref}
          subtitleKey="subtitle"
          badgeLabel={badgeLabel}
          panel={<ArtistTrendsHeroPanel period={period} selectedCount={0} />}
        />
        <GenreTrendsSkeleton />
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
