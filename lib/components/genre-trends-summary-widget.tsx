"use client";

import { memo, useMemo, useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
import { useGenreTrends } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { GroqGenreBackfillCta } from "@/lib/components/palette/groq-genre-backfill-cta";

const COLORS = [
  "#818cf8",
  "#f472b6",
  "#f59e0b",
  "#06b6d4",
  "#84cc16",
  "#8b5cf6",
  "#10b981",
  "#f97316",
  "#6366f1",
  "#f43f5e",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

const GENRE_TREND_CARD_CLASS =
  "relative h-full overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-[#fff8fb] to-[#f3f7ff] shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-300/40 hover:shadow-card-hover dark:from-slate-900/92 dark:via-slate-900/88 dark:to-slate-800/90 dark:ring-white/10";

const GENRE_TREND_BACKGROUND = (
  <>
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.16),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(244,114,182,0.14),transparent_32%),radial-gradient(circle_at_52%_100%,rgba(245,158,11,0.1),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.2),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(244,114,182,0.16),transparent_32%),radial-gradient(circle_at_52%_100%,rgba(245,158,11,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%)]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-rose-300/20 blur-3xl dark:bg-rose-300/12"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-indigo-300/18 blur-3xl dark:bg-indigo-300/12"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/60 to-transparent"
      aria-hidden
    />
  </>
);

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

const DEFAULT_GENRE_COUNT = 5;
const MAX_FILTER_GENRE_COUNT = 12;

export type GenreTrendsSummaryWidgetProps = {
  startDate?: string;
  endDate?: string;
};

/**
 * Compact multi-line genre trends chart for the overview dashboard.
 * Mirrors /dashboard/genres/trends (monthly aggregation, top genres by default).
 */
export function GenreTrendsSummaryWidget({
  startDate,
  endDate,
}: GenreTrendsSummaryWidgetProps) {
  const t = useTranslations("genreTrends");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);

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

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

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

  if (isLoading) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0">
        <div className={`${GENRE_TREND_CARD_CLASS} animate-fade-in-up`} role="status" aria-label={t("evolution")}>
          {GENRE_TREND_BACKGROUND}
          <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/10">
            <div className="mb-3 h-7 w-36 animate-shimmer rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-64 max-w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-4 w-80 max-w-full animate-shimmer rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="relative space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-24 animate-shimmer rounded-full bg-white/70 dark:bg-white/10"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
            <div className="h-[260px] animate-shimmer rounded-3xl border border-white/60 bg-white/50 shadow-inner dark:border-white/10 dark:bg-slate-950/20" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 w-full min-w-0">
        <div className={`${GENRE_TREND_CARD_CLASS} p-6`}>
          {GENRE_TREND_BACKGROUND}
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (!data || (chartData.length === 0 && availableGenres.length === 0)) {
    return null;
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0">
      <div className={`${GENRE_TREND_CARD_CLASS} animate-fade-in-up`}>
        {GENRE_TREND_BACKGROUND}
        <div className="relative">
          <div className="border-b border-white/70 px-6 py-5 dark:border-white/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-300/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 shadow-sm backdrop-blur dark:bg-white/10 dark:text-rose-100">
                  <span
                    className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_16px_rgb(251_191_36_/0.7)]"
                    aria-hidden
                  />
                  {t("title")}
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-3xl">
                  {t("evolution")}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted sm:text-base">
                  {t("chartHint")}
                </p>
                {!isPublicDemoViewer ? (
                  <div className="mt-4 overflow-hidden rounded-3xl border border-white/70 bg-white/58 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/24">
                    <div className="relative p-4">
                      <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_36%),radial-gradient(circle_at_95%_10%,rgba(244,114,182,0.12),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_36%),radial-gradient(circle_at_95%_10%,rgba(244,114,182,0.1),transparent_32%)]"
                        aria-hidden
                      />
                      <div className="relative flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/12 text-amber-700 shadow-sm dark:text-amber-100">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.7}
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-100">
                            {t("chartGenreAccuracyTitle")}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-slate-200">
                            {t("chartGenreAccuracyIntro")}
                          </p>
                        </div>
                      </div>

                      <div className="relative mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-amber-300/20 bg-white/72 p-3 text-xs leading-5 text-gray-700 shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                          {t.rich("chartGenreAccuracyPalette", {
                            manualLabel: (chunks) => (
                              <span className="font-semibold text-gray-950 dark:text-white">{chunks}</span>
                            ),
                            palette: (chunks) => (
                              <Link
                                href="/dashboard/genres/palette"
                                className="font-semibold text-rose-600 underline underline-offset-2 hover:text-rose-700 dark:text-rose-100 dark:hover:text-white"
                              >
                                {chunks}
                              </Link>
                            ),
                          })}
                        </div>
                        <div className="rounded-2xl border border-rose-300/20 bg-white/72 p-3 text-xs leading-5 text-gray-700 shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-slate-200">
                          {t.rich("chartGenreAccuracyGroq", {
                            aiLabel: (chunks) => (
                              <span className="font-semibold text-gray-950 dark:text-white">{chunks}</span>
                            ),
                          })}
                        </div>
                      </div>

                      <GroqGenreBackfillCta
                        viewerUserId={viewerUserId}
                        className="relative mt-4 space-y-2 border-t border-amber-300/25 pt-3 dark:border-white/10"
                        textClassName="text-[11px] leading-snug text-gray-600 dark:text-slate-300"
                        buttonClassName="group relative inline-flex min-h-[36px] items-center justify-center overflow-hidden rounded-full border border-white/20 bg-brand-gradient px-3.5 py-2 text-[11px] font-semibold text-white shadow-brand-glow transition-all duration-300 hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <Link
                href={`/dashboard/genres/trends${trendsQuery}`}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-2xl border border-card-border bg-white/70 px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:bg-white/10 dark:text-rose-100 dark:hover:bg-white/15"
              >
                {tOverview("seeMore")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative space-y-5 p-6">
            <div className="rounded-3xl border border-white/70 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/22">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {t("genresToDisplay")}
                </p>
                <span className="rounded-full border border-rose-300/25 bg-rose-300/10 px-3 py-1 text-xs font-semibold tabular-nums text-rose-700 dark:text-rose-100">
                  {selectedGenres.length}/{filterGenres.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filterGenres.map((genre, idx) => {
                  const selected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`group inline-flex max-w-[min(100%,220px)] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 ${
                        selected
                          ? "border-rose-300/30 bg-white/85 text-gray-950 shadow-card dark:border-white/15 dark:bg-white/12 dark:text-white"
                          : "border-white/70 bg-white/45 text-muted hover:bg-white/75 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                      title={genre}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: selected ? getColor(idx) : "transparent",
                          boxShadow: selected ? `0 0 16px ${getColor(idx)}66` : "none",
                          border: selected ? "none" : "1px solid rgb(148 163 184 / 0.75)",
                        }}
                      />
                      <span className="truncate">{genre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedGenres.length === 0 ? (
              <p className="rounded-3xl border border-white/70 bg-white/55 py-10 text-center text-sm text-muted shadow-inner dark:border-white/10 dark:bg-slate-950/22">
                {t("selectAtLeastOne")}
              </p>
            ) : (
              <div className="relative rounded-3xl border border-white/70 bg-white/60 p-3 shadow-inner backdrop-blur dark:border-white/10 dark:bg-slate-950/24">
                <div className="pointer-events-none absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-rose-300/10 blur-3xl dark:bg-rose-300/14" />
                <div className="relative h-[290px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 12, right: 16, left: 0, bottom: 50 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke="rgb(148 163 184 / 0.26)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fill: "rgb(100 116 139)", fontSize: 11, fontWeight: 600 }}
                        stroke="rgb(148 163 184 / 0.45)"
                        tickLine={false}
                        axisLine={false}
                        angle={-40}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis
                        tick={{ fill: "rgb(100 116 139)", fontSize: 11, fontWeight: 600 }}
                        stroke="rgb(148 163 184 / 0.45)"
                        tickLine={false}
                        axisLine={false}
                        width={42}
                      />
                      <Tooltip content={<TrendsTooltip />} />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: 12,
                          fontWeight: 600,
                          paddingTop: 8,
                        }}
                      />
                      {selectedGenres.map((genre) => {
                        const color = getColor(availableGenres.indexOf(genre));
                        return (
                          <Line
                            key={genre}
                            type="monotone"
                            dataKey={genre}
                            name={genre}
                            stroke={color}
                            strokeWidth={2.75}
                            dot={false}
                            activeDot={{
                              r: 5,
                              stroke: "rgb(var(--card-rgb) / 0.95)",
                              strokeWidth: 2,
                              fill: color,
                            }}
                            animationDuration={650}
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
      </div>
    </div>
  );
}
