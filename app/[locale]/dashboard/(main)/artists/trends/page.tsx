"use client";

import {
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  memo,
} from "react";
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
import { PeriodSelector, PeriodType } from "@/lib/components/period-selector";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { ArtistTrendsArtistPicker } from "@/lib/components/artist-trends-artist-picker";
import type { ArtistTrendsChartArtist } from "@/lib/dto/artist";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { TrendingUp } from "lucide-react";

const MAX_SERIES_ARTISTS = 50;
/** Délai après lequel les sélections d’artistes déclenchent chart + IA (évite rafales de requêtes). */
const ARTIST_SELECTION_DEBOUNCE_MS = 450;

const ARTIST_RAIL_CLASS = "bg-gradient-to-r from-violet-400 via-cyan-300 to-lime-300";
const ARTISTS_TRENDS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-violet-400/25 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.34),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_48%,_#164e63_100%)] px-6 py-8 shadow-2xl shadow-violet-950/35 sm:px-8 sm:py-10";
const ARTIST_TRENDS_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-violet-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card transition-shadow duration-300 hover:shadow-card-hover dark:border-violet-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.12),_transparent_30%),rgb(var(--card-rgb)/0.9)]";
const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 bg-surface-glass border-b border-violet-200/30 dark:border-violet-400/15 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 shadow-[0_1px_0_0_rgb(139_92_246_/_0.2)] backdrop-blur-md";
const TRENDS_CTA_CLASS =
  "inline-flex min-h-[44px] w-fit shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-white/95 px-5 py-2.5 text-sm font-semibold text-cyan-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

function useArtistsListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/artists?${qs}` : "/dashboard/artists";
  }, [searchParams]);
}

function ArtistTrendsHero({
  artistsHref,
  subtitleKey,
}: {
  artistsHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
}) {
  const t = useTranslations("artistTrends");
  return (
    <div className={ARTISTS_TRENDS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(6,182,212,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-cyan-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ARTIST_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <TrendingUp className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${ARTIST_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(139,92,246,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-cyan-100/90 sm:text-lg">{t(subtitleKey)}</p>
        </div>
        <Link href={artistsHref} className={TRENDS_CTA_CLASS}>
          {t("backToArtists")}
        </Link>
      </div>
    </div>
  );
}

function ArtistPickerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-10 w-full max-w-md rounded-xl bg-gray-100 animate-shimmer dark:bg-gray-800" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="h-9 rounded-full bg-gray-100 animate-shimmer dark:bg-gray-800"
            style={{ width: `${96 + ((index * 23) % 88)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function ArtistTrendsChartSkeleton() {
  return (
    <div className="relative min-h-[500px] rounded-xl border border-card-border bg-surface/60 p-6 shadow-inner" aria-busy="true">
      <div className="flex h-[452px] flex-col justify-between">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="absolute inset-x-8 bottom-20 top-16">
        <svg className="h-full w-full" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 250 C90 210 160 190 250 205 S430 120 540 150 700 210 800 105"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-violet-200 dark:text-violet-900"
            opacity="0.8"
          />
          <path
            d="M0 285 C120 230 230 250 320 180 S510 210 620 145 735 125 800 170"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-cyan-200 dark:text-cyan-900"
            opacity="0.75"
          />
        </svg>
      </div>
      <div className="absolute inset-x-8 bottom-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-3 w-28 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
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
  "rgb(var(--brand-violet-rgb))",
  "rgb(var(--brand-rose-rgb))",
  "rgb(var(--brand-cyan-rgb))",
  "rgb(var(--brand-emerald-rgb))",
  "rgb(var(--brand-pink-rgb))",
  "rgb(var(--brand-indigo-rgb))",
  "rgb(var(--primary-rgb))",
  "rgb(var(--brand-violet-rgb) / 0.72)",
  "rgb(var(--brand-rose-rgb) / 0.72)",
  "rgb(var(--brand-cyan-rgb) / 0.72)",
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
  const period = (searchParams.get("period") || "month") as PeriodType;

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

  if (!isLoading && error && !data) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" />
        </div>
        <div className="mt-6 space-y-6">
          <ArtistTrendsHero artistsHref={artistsHref} subtitleKey="subtitleExtended" />
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
          <PeriodSelector defaultPeriod="month" />
        </div>
        <div className="mt-6 space-y-6">
          <ArtistTrendsHero artistsHref={artistsHref} subtitleKey="subtitleExtended" />
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
        <PeriodSelector defaultPeriod="month" />
      </div>

      <div className="mt-6 space-y-6">
        <ArtistTrendsHero artistsHref={artistsHref} subtitleKey="subtitleExtended" />

        <div className="space-y-6">
          <div className={ARTIST_TRENDS_PANEL_CLASS}>
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ARTIST_RAIL_CLASS} opacity-80`} />
            <div className="relative z-10 border-b border-violet-200/25 px-4 py-4 dark:border-violet-400/15 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className={`h-2 w-2 rounded-full ${ARTIST_RAIL_CLASS} shadow-[0_0_14px_rgb(139_92_246_/_0.4)]`} aria-hidden />
                {t("artistsToDisplay")}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="rounded-lg border border-violet-200/40 bg-white/70 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-violet-50/90 dark:border-violet-400/25 dark:bg-surface-glass dark:hover:bg-violet-950/30"
                >
                  {t("all")}
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="rounded-lg border border-card-border bg-surface-glass px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-card-surface hover:text-foreground"
                >
                  {t("none")}
                </button>
              </div>
              </div>
            </div>
            <div className="relative z-10 p-4 sm:p-6">
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

          <section
            className={`${ARTIST_TRENDS_PANEL_CLASS} animate-fade-in-up transition-all duration-300`}
            aria-labelledby="artist-trends-spotlight-title"
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ARTIST_RAIL_CLASS} opacity-80`} />
            <div className="relative">
              <div className="border-b border-violet-200/25 px-6 py-5 dark:border-violet-400/15">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 id="artist-trends-spotlight-title" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                      {t("evolution")}
                    </h2>
                    <p className="mt-0.5 text-sm text-violet-800/85 dark:text-violet-100/75">
                      {t("chartHint")}
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-violet-200/35 bg-violet-50/85 px-2.5 py-1 text-xs font-medium text-violet-950 dark:border-violet-400/25 dark:bg-surface-glass dark:text-violet-100/90">
                    {t("selectionCount", { selected: selectedIds.length, max: MAX_SERIES_ARTISTS })}
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-6 md:p-8">
                {isLoading ? (
                  <ArtistTrendsChartSkeleton />
                ) : selectedIds.length === 0 ? (
                  <div className="rounded-xl border border-card-border bg-surface/60 px-6 py-10 text-center">
                    <p className="text-sm text-muted">
                      {t("selectAtLeastOne")}
                    </p>
                  </div>
                ) : (
                  <div
                    className="relative min-h-[500px] rounded-xl border border-card-border bg-surface/60 p-3 shadow-inner"
                    aria-busy={chartDataSyncing}
                  >
                    {chartDataSyncing && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-card-surface/75 backdrop-blur-[2px] px-4 text-center">
                        <span
                          className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent dark:border-violet-400"
                          aria-hidden
                        />
                        <span className="text-sm font-medium text-foreground">
                          {selectionPending
                            ? t("selectionPending")
                            : t("chartUpdating")}
                        </span>
                      </div>
                    )}
                    <div
                      className={`transition-opacity duration-200 ${
                        chartDataSyncing ? "opacity-40 pointer-events-none" : ""
                      }`}
                    >
                      <ResponsiveContainer width="100%" height={500}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgb(var(--border-rgb) / 0.45)"
                      />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fill: "rgb(var(--muted-rgb) / 0.95)", fontSize: 12 }}
                        stroke="rgb(var(--border-rgb) / 0.85)"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fill: "rgb(var(--muted-rgb) / 0.95)", fontSize: 12 }}
                        stroke="rgb(var(--border-rgb) / 0.85)"
                      />
                      <Tooltip content={<TrendsTooltip />} />
                      <Legend wrapperStyle={{ color: "rgb(var(--muted-rgb))", paddingTop: 12 }} />
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
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            animationDuration={500}
                            animationEasing="ease-in-out"
                          />
                        );
                      })}
                    </LineChart>
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
  const artistsHref = useArtistsListHref();
  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
      </div>
      <div className="mt-6 space-y-6">
        <ArtistTrendsHero artistsHref={artistsHref} subtitleKey="subtitle" />
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
