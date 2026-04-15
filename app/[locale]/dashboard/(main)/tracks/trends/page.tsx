"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
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
import { PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { TrackTrendsTrackPicker } from "@/lib/components/track-trends-track-picker";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useTrackTrendsChart } from "@/lib/hooks/use-tracks";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#14b8a6",
];
const MAX_SERIES_TRACKS = 50;
const TRACK_SELECTION_DEBOUNCE_MS = 450;

function idsEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function TrendsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("trackTrends");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = (searchParams.get("period") || "month") as PeriodType;
  const userId = searchParams.get("userId") ?? undefined;

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
        <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
        </div>
        <div className="mt-6"><GenreTrendsSkeleton /></div>
      </>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <ErrorState error={error} message={t("errorLoading")} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data || (chartData.length === 0 && pickerTracks.length === 0)) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
          <PeriodSelector defaultPeriod="month" />
        </div>
        <div className="mt-6">
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
      <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
        <PeriodSelector defaultPeriod="month" />
      </div>

      <div className="mt-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("subtitleExtended")}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("tracksToDisplay")}</span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={selectAll} className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">{t("all")}</button>
              <button type="button" onClick={selectNone} className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">{t("none")}</button>
            </div>
          </div>
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

        <section className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">{t("evolution")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("chartHint")}</p>
          </div>
          <div className="p-6 sm:p-8 md:p-10">
            {selectedIds.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">{t("selectAtLeastOne")}</p>
            ) : (
              <div className="relative min-h-[500px]" aria-busy={isFetching || selectionPending}>
                {(isFetching || selectionPending) && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/60 backdrop-blur-[2px] dark:bg-gray-900/50 px-4 text-center">
                    <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" aria-hidden />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{selectionPending ? t("selectionPending") : t("chartUpdating")}</span>
                  </div>
                )}
                <div className={`transition-opacity duration-200 ${isFetching || selectionPending ? "opacity-40 pointer-events-none" : ""}`}>
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                      <XAxis dataKey="formattedDate" tick={{ fill: "currentColor", fontSize: 12 }} stroke="#6b7280" className="dark:stroke-gray-400" angle={-45} textAnchor="end" height={80} />
                      <YAxis tick={{ fill: "currentColor", fontSize: 12 }} stroke="#6b7280" className="dark:stroke-gray-400" />
                      <Tooltip />
                      <Legend formatter={(value) => {
                        const track = idToTrack.get(String(value));
                        return track ? getTrackLabel(track) : String(value);
                      }} />
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
  const t = useTranslations("trackTrends");
  return (
    <>
      <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
      </div>
      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
        </div>
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function TrackTrendsPage() {
  return (
    <Suspense fallback={<TrackTrendsFallback />}>
      <TrendsContent />
    </Suspense>
  );
}
