"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getPeriodFromSearchParams, PeriodSelector } from "@/lib/components/period-selector";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { TrackTrendsTrackPicker } from "@/lib/components/track-trends-track-picker";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useTrackTrendsChart } from "@/lib/hooks/use-tracks";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";
import { TrendingUp } from "lucide-react";

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
const TRACK_RAIL_CLASS = "bg-gradient-to-r from-cyan-300 via-emerald-400 to-lime-300";
const TRACK_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card transition-shadow duration-300 hover:shadow-card-hover dark:border-cyan-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.12),_transparent_30%),rgb(var(--card-rgb)/0.9)]";
const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 bg-surface-glass border-b border-cyan-200/30 dark:border-cyan-300/15 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 shadow-[0_1px_0_0_rgb(34_211_238_/_0.2)] backdrop-blur-md";

function idsEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function TrackTrendsHero({
  tracksHref,
  subtitleKey,
}: {
  tracksHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
}) {
  const t = useTranslations("trackTrends");
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.34),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#063b36_100%)] px-6 py-8 shadow-2xl shadow-emerald-950/40 sm:px-8 sm:py-10">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.11)_1px,_transparent_1px),linear-gradient(90deg,_rgba(132,204,22,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-lime-300/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TRACK_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <TrendingUp className="h-9 w-9 shrink-0 text-cyan-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${TRACK_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(34,211,238,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-cyan-100/90 sm:text-lg">{t(subtitleKey)}</p>
        </div>
        <Link
          href={tracksHref}
          className="inline-flex min-h-[44px] w-fit shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-white/95 px-5 py-2.5 text-sm font-semibold text-cyan-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        >
          {t("backToTracks")}
        </Link>
      </div>
    </div>
  );
}

function TrendsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("trackTrends");
  const emptyStatePresets = useEmptyStatePresets();
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

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useTrackTrendsChart(startDate, endDate, period, trackIdsForFetch, 20, userId);

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

  if (isLoading) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
        </div>
        <div className="mt-6 space-y-6">
          <TrackTrendsHero tracksHref={tracksHref} subtitleKey="subtitleExtended" />
          <GenreTrendsSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-6">
          <TrackTrendsHero tracksHref={tracksHref} subtitleKey="subtitleExtended" />
          <ErrorState error={error} message={t("errorLoading")} onRetry={() => refetch()} />
        </div>
      </>
    );
  }

  if (!data || (chartData.length === 0 && pickerTracks.length === 0)) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-6">
          <TrackTrendsHero tracksHref={tracksHref} subtitleKey="subtitleExtended" />
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

      <div className="mt-6 space-y-6">
        <TrackTrendsHero tracksHref={tracksHref} subtitleKey="subtitleExtended" />

        <div className={TRACK_PANEL_CLASS}>
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TRACK_RAIL_CLASS} opacity-80`} />
          <div className="relative z-10 border-b border-cyan-200/20 px-4 py-4 dark:border-cyan-300/10 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className={`h-2 w-2 rounded-full ${TRACK_RAIL_CLASS} shadow-[0_0_14px_rgb(34_211_238_/_0.45)]`} aria-hidden />
              {t("tracksToDisplay")}
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={selectAll} className="rounded-lg border border-cyan-200/25 bg-white/60 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-cyan-50/90 dark:border-cyan-400/20 dark:bg-surface-glass dark:hover:bg-cyan-950/30">{t("all")}</button>
              <button type="button" onClick={selectNone} className="rounded-lg border border-card-border bg-surface-glass px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-card-surface hover:text-foreground">{t("none")}</button>
            </div>
            </div>
          </div>
          <div className="relative z-10 p-4 sm:p-6">
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
          </div>
        </div>

        <section className={`${TRACK_PANEL_CLASS} animate-fade-in-up transition-all duration-300`}>
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TRACK_RAIL_CLASS} opacity-80`} />
          <div className="border-b border-cyan-200/20 px-6 py-5 dark:border-cyan-300/10">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">{t("evolution")}</h2>
                <p className="mt-0.5 text-sm text-cyan-800/85 dark:text-cyan-100/70">{t("chartHint")}</p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-cyan-200/30 bg-cyan-50/80 px-2.5 py-1 text-xs font-medium text-cyan-950 dark:border-cyan-400/25 dark:bg-surface-glass dark:text-cyan-100/90">
                {t("selectionCount", { selected: selectedIds.length, max: MAX_SERIES_TRACKS })}
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-6 md:p-8">
            {selectedIds.length === 0 ? (
              <div className="rounded-xl border border-card-border bg-surface/60 px-6 py-10 text-center">
                <p className="text-sm text-muted">{t("selectAtLeastOne")}</p>
              </div>
            ) : (
              <div className="relative min-h-[500px] rounded-xl border border-card-border bg-surface/60 p-3 shadow-inner" aria-busy={isFetching || selectionPending}>
                {(isFetching || selectionPending) && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-card-surface/75 backdrop-blur-[2px] px-4 text-center">
                    <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" aria-hidden />
                    <span className="text-sm font-medium text-foreground">{selectionPending ? t("selectionPending") : t("chartUpdating")}</span>
                  </div>
                )}
                <div className={`transition-opacity duration-200 ${isFetching || selectionPending ? "opacity-40 pointer-events-none" : ""}`}>
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-rgb) / 0.45)" />
                      <XAxis dataKey="formattedDate" tick={{ fill: "rgb(var(--muted-rgb) / 0.95)", fontSize: 12 }} stroke="rgb(var(--border-rgb) / 0.85)" angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fill: "rgb(var(--muted-rgb) / 0.95)", fontSize: 12 }} stroke="rgb(var(--border-rgb) / 0.85)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card-surface)",
                          border: "1px solid var(--card-border)",
                          borderRadius: "0.75rem",
                          boxShadow: "var(--card-shadow)",
                          color: "rgb(var(--foreground-rgb))",
                        }}
                        labelStyle={{ color: "rgb(var(--foreground-rgb))", fontWeight: 600 }}
                      />
                      <Legend
                        wrapperStyle={{ color: "rgb(var(--muted-rgb))", paddingTop: 12 }}
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
        </section>
      </div>
    </>
  );
}

function TrackTrendsFallback() {
  const searchParams = useSearchParams();
  const tracksHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const qs = params.toString();
    return qs ? `/dashboard/tracks?${qs}` : "/dashboard/tracks";
  }, [searchParams]);

  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
      </div>
      <div className="mt-6 space-y-6">
        <TrackTrendsHero tracksHref={tracksHref} subtitleKey="subtitle" />
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
