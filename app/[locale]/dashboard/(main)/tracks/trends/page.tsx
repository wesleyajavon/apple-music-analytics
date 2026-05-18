"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPeriodFromSearchParams, PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { TrackTrendsTrackPicker } from "@/lib/components/track-trends-track-picker";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useTrackTrendsChart } from "@/lib/hooks/use-tracks";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ArrowLeft } from "lucide-react";

const COLORS = [
  "#22d3ee",
  "#f97316",
  "#8b5cf6",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#84cc16",
  "#f59e0b",
  "#14b8a6",
];
const MAX_SERIES_TRACKS = 50;
const TRACK_SELECTION_DEBOUNCE_MS = 450;

const TRENDS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 -mt-4 border-b border-white/10 bg-surface-glass/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8";

function idsEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function periodToLabelKey(period: PeriodType): "daily" | "weekly" | "monthly" {
  if (period === "day") return "daily";
  if (period === "week") return "weekly";
  return "monthly";
}

function useTrackTrendsBadgeLabel() {
  const locale = useLocale();
  const tOverview = useTranslations("overview");
  const { startDate, endDate } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(startDate, endDate, locale);
  return dateRangeLabel || tOverview("allData");
}

function TrackTrendsSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
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

function TrackTrendsHeroPanelSkeleton() {
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

function TrackTrendsHeroPanel({ period, selectedCount }: { period: PeriodType; selectedCount: number }) {
  const t = useTranslations("trackTrends");
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
          {selectedCount} / {MAX_SERIES_TRACKS}
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroPanelSeries")}</p>
      </div>
    </div>
  );
}

function TrackTrendsHeroFrame({
  tracksHref,
  subtitleKey,
  badgeLabel,
  panel,
}: {
  tracksHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
  badgeLabel: string;
  panel: ReactNode;
}) {
  const t = useTranslations("trackTrends");
  return (
    <div className={TRENDS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_30%),radial-gradient(circle_at_78%_8%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.85)_48%,rgba(8,47,73,0.65))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t(subtitleKey)}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={tracksHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToTracks")}
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

function TrackPickerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-10 w-full max-w-md rounded-xl border border-slate-200/90 bg-slate-100/90 animate-shimmer" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="h-9 rounded-full border border-slate-200/80 bg-slate-100/80 animate-shimmer"
            style={{ width: `${96 + ((index * 19) % 90)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function TrackTrendsChartSkeleton() {
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
            d="M0 230 C120 170 180 250 290 185 S500 120 610 165 720 220 800 135"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-cyan-300"
            opacity="0.35"
          />
          <path
            d="M0 285 C150 220 220 235 330 205 S520 250 640 160 730 115 800 150"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-violet-300"
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

function TrendsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("trackTrends");
  const emptyStatePresets = useEmptyStatePresets();
  const badgeLabel = useTrackTrendsBadgeLabel();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = getPeriodFromSearchParams(searchParams, "month");
  const userId = searchParams.get("userId") ?? undefined;

  const tracksHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const qs = params.toString();
    return qs ? `/dashboard/tracks?${qs}` : "/dashboard/tracks";
  }, [searchParams]);

  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extraSearchTracks, setExtraSearchTracks] = useState<TrackTrendsChartTrack[]>([]);
  const defaultSelectionAppliedRef = useRef(false);
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);

  useEffect(() => {
    defaultSelectionAppliedRef.current = false;
  }, [startDate, endDate, period]);

  const debouncedSelectedIds = useDebouncedValue(selectedIds, selectionDebounceMs);
  const selectionPending = !idsEqualSorted(selectedIds, debouncedSelectedIds);
  const trackIdsForFetch = debouncedSelectedIds.length > 0 ? debouncedSelectedIds : undefined;

  const { data, isLoading, isFetching, error, refetch } = useTrackTrendsChart(
    startDate,
    endDate,
    period,
    trackIdsForFetch,
    20,
    userId
  );

  useEffect(() => {
    setSelectionDebounceMs(0);
  }, [startDate, endDate, period]);

  useEffect(() => {
    if (!isFetching && data && !error) {
      setSelectionDebounceMs(TRACK_SELECTION_DEBOUNCE_MS);
    }
  }, [isFetching, data, error]);

  const pickerTracks = useMemo(() => {
    const base = data?.catalogTracks ?? data?.availableTracks ?? [];
    const merged = new Map<string, TrackTrendsChartTrack>();
    for (const item of base) merged.set(item.id, item);
    for (const item of extraSearchTracks) merged.set(item.id, item);
    return Array.from(merged.values());
  }, [data?.catalogTracks, data?.availableTracks, extraSearchTracks]);

  useEffect(() => {
    const catalog = data?.catalogTracks;
    if (!catalog?.length) return;
    setExtraSearchTracks((prev) => {
      const ids = new Set(catalog.map((item) => item.id));
      return prev.filter((item) => !ids.has(item.id));
    });
  }, [data?.catalogTracks]);

  const defaultSourceIds = useMemo(() => pickerTracks.map((item) => item.id), [pickerTracks]);
  useEffect(() => {
    if (defaultSourceIds.length === 0) return;
    if (defaultSelectionAppliedRef.current) return;
    if (selectedIds.length > 0) return;
    const defaultSelected =
      defaultSourceIds.length <= 5 ? [...defaultSourceIds] : defaultSourceIds.slice(0, 5);
    setSelectedIds(defaultSelected);
    defaultSelectionAppliedRef.current = true;
  }, [defaultSourceIds, selectedIds.length]);

  const toggleTrack = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERIES_TRACKS) return prev;
      return [...prev, id];
    });
  }, []);

  const handlePickRemoteTrack = useCallback((track: TrackTrendsChartTrack) => {
    setExtraSearchTracks((prev) => (prev.some((p) => p.id === track.id) ? prev : [...prev, track]));
    setSelectedIds((prev) => {
      if (prev.includes(track.id)) return prev;
      if (prev.length >= MAX_SERIES_TRACKS) return prev;
      return [...prev, track.id];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(pickerTracks.slice(0, MAX_SERIES_TRACKS).map((item) => item.id));
  }, [pickerTracks]);

  const selectNone = useCallback(() => setSelectedIds([]), []);
  const getTrackIndex = useCallback((trackId: string) => pickerTracks.findIndex((x) => x.id === trackId), [pickerTracks]);
  const idToTrack = useMemo(() => new Map(pickerTracks.map((item) => [item.id, item])), [pickerTracks]);
  const chartData = data?.data ?? [];

  const heroPanel =
    isLoading && !data ? (
      <TrackTrendsHeroPanelSkeleton />
    ) : (
      <TrackTrendsHeroPanel period={period} selectedCount={selectedIds.length} />
    );

  if (!isLoading && error && !data) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-12">
          <TrackTrendsHeroFrame
            tracksHref={tracksHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<TrackTrendsHeroPanel period={period} selectedCount={selectedIds.length} />}
          />
          <ErrorState error={error} message={t("errorLoading")} onRetry={() => refetch()} />
        </div>
      </>
    );
  }

  if (!isLoading && (!data || (chartData.length === 0 && pickerTracks.length === 0))) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-12">
          <TrackTrendsHeroFrame
            tracksHref={tracksHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<TrackTrendsHeroPanel period={period} selectedCount={selectedIds.length} />}
          />
          <EmptyState
            {...emptyStatePresets.changeDates(pathname)}
            message={t("noTrackData")}
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
        <TrackTrendsHeroFrame
          tracksHref={tracksHref}
          subtitleKey="subtitleExtended"
          badgeLabel={badgeLabel}
          panel={heroPanel}
        />

        <section className="relative animate-fade-in-up">
          <TrackTrendsSectionHeader
            eyebrow={t("sections.picker.eyebrow")}
            title={t("sections.picker.title")}
            description={t("sections.picker.description")}
          />
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-white text-slate-900 shadow-xl shadow-slate-900/[0.07] ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-slate-300/50 dark:from-slate-100 dark:via-white dark:to-slate-50 dark:text-slate-900 dark:hover:shadow-black/25">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.08),transparent_36%),radial-gradient(circle_at_92%_12%,rgba(139,92,246,0.06),transparent_32%)]"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent" aria-hidden />
            <div className="relative border-b border-slate-200/80 px-5 py-5 sm:px-8 dark:border-slate-200/90">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_14px_rgb(6_182_212_/0.45)]" aria-hidden />
                  {t("sections.picker.badge")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded-xl border border-cyan-200/80 bg-white px-4 py-2 text-sm font-semibold text-cyan-950 shadow-sm transition-colors hover:bg-cyan-50/90 dark:border-cyan-300/50 dark:bg-white dark:text-cyan-950 dark:hover:bg-cyan-50/80"
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
                  <TrackPickerSkeleton />
                ) : (
                  <TrackTrendsTrackPicker
                    catalogTracks={pickerTracks}
                    selectedIds={selectedIds}
                    onToggle={toggleTrack}
                    getColor={getColor}
                    getTrackIndex={getTrackIndex}
                    enableRemoteSearch
                    onPickRemoteTrack={handlePickRemoteTrack}
                    maxSelectable={MAX_SERIES_TRACKS}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative animate-fade-in-up transition-all duration-300" style={{ animationDelay: "60ms" }}>
          <TrackTrendsSectionHeader
            eyebrow={t("sections.chart.eyebrow")}
            title={t("sections.chart.title")}
            description={t("sections.chart.description")}
          />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/35">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_12%_70%,rgba(34,211,238,0.1),transparent_34%)]"
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
                  <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{t("evolution")}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t("chartHint")}</p>
                </div>
                <span className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                  {t("selectionCount", { selected: selectedIds.length, max: MAX_SERIES_TRACKS })}
                </span>
              </div>
            </div>
            <div className="relative p-4 sm:p-6 lg:p-8">
              {isLoading ? (
                <TrackTrendsChartSkeleton />
              ) : selectedIds.length === 0 ? (
                <div className="rounded-[1.35rem] border border-white/10 bg-black/30 px-6 py-12 text-center">
                  <p className="text-sm text-slate-400">{t("selectAtLeastOne")}</p>
                </div>
              ) : (
                <div className="relative min-h-[500px] rounded-[1.35rem] border border-white/10 bg-black/25 p-3 backdrop-blur-sm" aria-busy={isFetching || selectionPending}>
                  {(isFetching || selectionPending) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[1.35rem] bg-slate-950/80 backdrop-blur-[2px] px-4 text-center">
                      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" aria-hidden />
                      <span className="text-sm font-medium text-white">
                        {selectionPending ? t("selectionPending") : t("chartUpdating")}
                      </span>
                    </div>
                  )}
                  <div className={`transition-opacity duration-200 ${isFetching || selectionPending ? "pointer-events-none opacity-40" : ""}`}>
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
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLES.contentStyle} labelStyle={CHART_TOOLTIP_STYLES.labelStyle} itemStyle={CHART_TOOLTIP_STYLES.itemStyle} />
                        <Legend
                          wrapperStyle={{ color: "#cbd5e1", paddingTop: 14, fontSize: "12px" }}
                          formatter={(value) => {
                            const track = idToTrack.get(String(value));
                            return track ? getTrackLabel(track) : String(value);
                          }}
                        />
                        {selectedIds.map((trackId) => {
                          const idx = getTrackIndex(trackId);
                          const label = idToTrack.get(trackId);
                          return (
                            <Line
                              key={trackId}
                              type="monotone"
                              dataKey={trackId}
                              name={label ? getTrackLabel(label) : trackId}
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
      </div>
    </>
  );
}

function TrackTrendsFallback() {
  const searchParams = useSearchParams();
  const badgeLabel = useTrackTrendsBadgeLabel();
  const period = getPeriodFromSearchParams(searchParams, "month");
  const tracksHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const qs = params.toString();
    return qs ? `/dashboard/tracks?${qs}` : "/dashboard/tracks";
  }, [searchParams]);

  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 w-64 animate-pulse rounded-xl border border-white/10 bg-white/10" />
      </div>
      <div className="mt-6 space-y-12">
        <TrackTrendsHeroFrame
          tracksHref={tracksHref}
          subtitleKey="subtitle"
          badgeLabel={badgeLabel}
          panel={<TrackTrendsHeroPanel period={period} selectedCount={0} />}
        />
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function TrackTrendsPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<TrackTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
