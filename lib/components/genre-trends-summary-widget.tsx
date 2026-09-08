"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { useGenreTrends } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { GenreAccuracyChooser } from "@/lib/components/palette/genre-accuracy-chooser";
import { useTheme } from "@/lib/providers/theme-provider";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_FILTER_CHIP,
  DASHBOARD_FILTER_CHIP_ACTIVE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";

const DEFAULT_GENRE_COUNT = 2;
const MAX_FILTER_GENRE_COUNT = 12;

export type GenreTrendsSummaryWidgetProps = {
  startDate?: string;
  endDate?: string;
  embedded?: boolean;
};

/**
 * Compact multi-line genre trends chart for the overview dashboard.
 * Mirrors /dashboard/genres/trends (monthly aggregation, top genres by default).
 */
export function GenreTrendsSummaryWidget({
  startDate,
  endDate,
  embedded = false,
}: GenreTrendsSummaryWidgetProps) {
  const t = useTranslations("genreTrends");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const { resolvedTheme } = useTheme();
  const chartThemeName = resolvedTheme === "dark" ? "dark" : "light";
  const getColor = useCallback(
    (index: number) => getCrystalSeriesColor(index, chartThemeName),
    [chartThemeName]
  );
  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${t("listensDelta")}`,
    [locale, t]
  );

  const { data, isLoading, error, refetch } = useGenreTrends(
    startDate,
    endDate,
    "month",
    undefined,
    viewerUserId
  );

  const availableGenres = useMemo(
    () => data?.availableGenres ?? [],
    [data?.availableGenres]
  );
  const filterGenres = useMemo(
    () => availableGenres.slice(0, MAX_FILTER_GENRE_COUNT),
    [availableGenres]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const trendsMinWidth = useMemo(
    () => (chartData.length > 8 ? Math.max(280, chartData.length * 28) : undefined),
    [chartData.length]
  );

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");

  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedGenres),
    [chartData, chartView, selectedGenres]
  );

  const chartSeries = useMemo(
    () =>
      selectedGenres.map((genre) => ({
        dataKey: genre,
        name: genre,
        color: getColor(availableGenres.indexOf(genre)),
      })),
    [availableGenres, getColor, selectedGenres]
  );

  useEffect(() => {
    if (availableGenres.length === 0) return;
    if (selectedGenres.length > 0) return;
    const n = Math.min(DEFAULT_GENRE_COUNT, availableGenres.length);
    setSelectedGenres(availableGenres.slice(0, n));
  }, [availableGenres, selectedGenres.length]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const trendsQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    p.set("period", "month");
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `?${qs}` : "?period=month";
  }, [startDate, endDate, viewerUserId]);

  const shellClass = embedded
    ? "min-h-[320px] w-full min-w-0"
    : "sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0";

  if (isLoading) {
    return (
      <div className={shellClass} role="status" aria-label={t("evolution")}>
        <div className="h-4 w-24 animate-shimmer rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-8 w-64 max-w-full animate-shimmer rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-6 h-[260px] animate-shimmer rounded-[22px] bg-black/10 dark:bg-white/10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={embedded ? "w-full min-w-0" : "sm:col-span-2 lg:col-span-4 w-full min-w-0"}>
        <ErrorState error={error} message={t("errorLoading")} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data || (chartData.length === 0 && availableGenres.length === 0)) {
    return null;
  }

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("title")}</p>
          <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1`}>{t("evolution")}</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted">{t("chartHint")}</p>
          {!isPublicDemoViewer ? (
            <GenreAccuracyChooser viewerUserId={viewerUserId} variant="compact" className="mt-4" />
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          <Link href={`/dashboard/genres/trends${trendsQuery}`} className={`${DASHBOARD_BTN_GHOST} shrink-0`}>
            {tOverview("seeMore")}
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-3 text-[13px] text-muted">{t("genresToDisplay")}</p>
          <div
            className="flex flex-wrap gap-2"
            role="listbox"
            aria-label={t("genresToDisplay")}
            aria-multiselectable="true"
          >
            {filterGenres.map((genre, idx) => {
              const selected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggleGenre(genre)}
                  className={selected ? DASHBOARD_FILTER_CHIP_ACTIVE : DASHBOARD_FILTER_CHIP}
                  title={genre}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: selected ? getColor(idx) : "transparent",
                      boxShadow: selected ? undefined : "inset 0 0 0 1px var(--glass-hairline)",
                    }}
                  />
                  <span className="truncate">{genre}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedGenres.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">{t("selectAtLeastOne")}</p>
        ) : (
          <OverviewTrendsChart
            data={displayChartData}
            series={chartSeries}
            formatValue={formatValue}
            minWidth={trendsMinWidth}
          />
        )}
      </div>
    </div>
  );
}
