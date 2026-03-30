"use client";

import { Suspense, useState, useMemo, useCallback, memo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useGenres } from "@/lib/hooks/use-listening";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { GenresSkeleton } from "@/lib/components/skeleton-loaders";

type ChartType = "pie" | "bar";

// Couleurs pour les genres – palette accent du projet
const COLORS = [
  "#8b5cf6", // accent-violet
  "#6366f1", // accent-indigo
  "#ec4899", // accent-rose
  "#06b6d4", // accent-cyan
  "#10b981", // accent-emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#f97316", // orange
  "#14b8a6", // teal
  "#a855f7", // purple
];

/** Tranches max. sous le camembert / barres (le reste → « Autres »). 8 évite une légende illisible. */
const MAX_CHART_SLICES = 12;

type ChartRow = {
  name: string;
  value: number;
  percentage: number;
  count: number;
};

function aggregateChartSeries(
  rows: ChartRow[],
  totalListens: number,
  otherLabel: string
): ChartRow[] {
  if (rows.length <= MAX_CHART_SLICES) {
    return rows;
  }
  const top = rows.slice(0, MAX_CHART_SLICES - 1);
  const tail = rows.slice(MAX_CHART_SLICES - 1);
  const otherCount = tail.reduce((sum, x) => sum + x.count, 0);
  const otherPercentage =
    totalListens > 0
      ? (otherCount / totalListens) * 100
      : tail.reduce((sum, x) => sum + x.percentage, 0);
  return [
    ...top,
    {
      name: otherLabel,
      value: otherCount,
      count: otherCount,
      percentage: otherPercentage,
    },
  ];
}

/** Icône chevron pour expand/collapse */
function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      {direction === "down" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      )}
    </svg>
  );
}

/** Icône genre musical */
function GenreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553z" />
    </svg>
  );
}

/** Une colonne d’image (top artiste du genre) pour le fond des cartes spotlight. */
function TopGenreArtistBgSlot({
  imageUrl,
  label,
  fallbackClass,
}: {
  imageUrl: string | null;
  label: string;
  fallbackClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(imageUrl && !failed);
  return (
    <div className="relative min-h-[120px] flex-1 min-w-0 border-r border-white/10 last:border-r-0 sm:min-h-[140px]">
      {showImg ? (
        <img
          src={imageUrl!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${fallbackClass}`}
          aria-hidden
        />
      )}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

// Custom tooltip - needs to be inside component to use translations
function createCustomTooltip(t: (k: string) => string, locale: string) {
  const T = memo(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip-accessible min-w-[180px] p-4">
          <p className="font-semibold">{data.name}</p>
          <p className="chart-tooltip-secondary text-sm mt-1">
            {data.count.toLocaleString(locale)} {t("listens")} · {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  });
  T.displayName = "CustomTooltip";
  return T;
}

/** Légende personnalisée pour le pie chart – grille compacte (max ~8 entrées côté données). */
function PieChartLegend({
  data,
  colors,
  locale,
}: {
  data: Array<{ name: string; percentage: number }>;
  colors: string[];
  locale: string;
}) {
  return (
    <div
      className="mt-4 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5 max-w-3xl mx-auto"
      role="list"
    >
      {data.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="flex items-center gap-2 min-w-0"
          role="listitem"
        >
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: colors[index % colors.length] }}
            aria-hidden
          />
          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate">
            {item.name}
          </span>
          <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
            {item.percentage.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function GenresContent() {
  const pathname = usePathname();
  const t = useTranslations("genres");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const CustomTooltip = useMemo(() => createCustomTooltip(t, locale), [t, locale]);

  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const [chartType, setChartType] = useState<ChartType>("pie");
  const [detailExpanded, setDetailExpanded] = useState(false);

  const { data, isLoading, error, refetch } = useGenres(startDate, endDate, undefined, {
    enabled: !!startDate && !!endDate,
  });

  const isLoadingOrFetching = isRangeLoading || isLoading;

  // Formater les données pour les graphiques - mémorisé pour éviter les recalculs
  const chartData = useMemo(
    () =>
      data?.data.map((item) => ({
        name: item.genre,
        value: item.count,
        percentage: item.percentage,
        count: item.count,
      })) || [],
    [data]
  );

  /** Données agrégées pour les graphiques (max. 8 tranches, le reste → « Autres » / Other). */
  const chartDisplayData = useMemo(
    () =>
      aggregateChartSeries(
        chartData,
        data?.totalListens ?? 0,
        t("other")
      ),
    [chartData, data?.totalListens, t]
  );

  // Label pour le pie chart - affichage conditionnel + taille réduite pour éviter le débordement mobile
  const renderCustomLabel = useCallback((props: any) => {
    const { cx, cy, midAngle, outerRadius, percent } = props;
    const pct = (percent ?? 0) * 100;
    /* Masque les % sur les petites tranches pour limiter le bruit visuel sur le camembert */
    if (pct <= 12) return null;
    const RADIAN = Math.PI / 180;
    const radius = (outerRadius as number) * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-700 dark:fill-gray-300"
        style={{ fontSize: "clamp(9px, 2vw, 12px)" }}
      >
        {`${pct.toFixed(1)}%`}
      </text>
    );
  }, []);

  const emptyStatePresets = useEmptyStatePresets();

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const top3Genres = chartData.slice(0, 3);
  const gradientByRank = [
    "from-violet-500 via-purple-500 to-fuchsia-500",
    "from-pink-500 via-rose-500 to-red-400",
    "from-indigo-500 via-violet-500 to-purple-500",
  ];
  /** Fallback visuel par colonne si pas d’image ou moins de 3 artistes. */
  const slotFallbacks = [
    "from-violet-800/95 via-purple-900/90 to-black/80",
    "from-rose-800/95 via-fuchsia-900/90 to-black/80",
    "from-indigo-800/95 via-violet-900/90 to-black/80",
  ];

  const topArtistsByGenre = useMemo(() => {
    const entries = data?.topArtistsForTopGenres ?? [];
    return new Map(entries.map((e) => [e.genre, e.artists]));
  }, [data?.topArtistsForTopGenres]);

  return (
    <>
      <div className="mt-4 sm:mt-6 space-y-8">
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20">
              <GenreIcon className="w-5 h-5 text-accent-violet" />
              <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
                {startDate && endDate ? formatDateRange(startDate, endDate) : t("allData")}
              </span>
            </div>
            {chartData.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {chartData.length} {t("statGenres")}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl lg:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("subtitle")}
          </p>
        </header>

        {isLoadingOrFetching ? (
          <GenresSkeleton />
        ) : error ? (
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState {...emptyStatePresets.changeDates(pathname)} />
        ) : (
          <div className="space-y-8">
            {/* Hero bandeau – style Artists */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 shadow-2xl sm:px-8 sm:py-10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("heroTitle")}</h2>
                <p className="mt-1 text-white/90">{t("heroSubtitle")}</p>
                <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
                  <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("statGenres")}</p>
                    <p className="text-2xl font-bold text-white">{chartData.length.toLocaleString(locale)}</p>
                  </div>
                  <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("totalListens")}</p>
                    <p className="text-2xl font-bold text-white">{data.totalListens.toLocaleString(locale)}</p>
                  </div>
                  <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("statTopGenre")}</p>
                    <p className="text-2xl font-bold text-white truncate max-w-[180px]">
                      {chartData[0]?.name ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 3 genres spotlight – style Replay */}
            {top3Genres.length > 0 && (
              <section>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("top3Title")}</h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">{t("top3Subtitle")}</p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {top3Genres.map((genre, index) => {
                    const maxCount = chartData[0]?.count ?? 1;
                    const progress = (genre.count / maxCount) * 100;
                    const artists = topArtistsByGenre.get(genre.name) ?? [];
                    const slots = Array.from({ length: 3 }, (_, i) => artists[i] ?? null);
                    return (
                      <div
                        key={genre.name}
                        className="group relative overflow-hidden rounded-3xl bg-gray-900
                          shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1
                          opacity-0 animate-fade-in-up ring-1 ring-white/10"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div className="absolute inset-0 flex">
                          {slots.map((artist, slotIdx) => (
                            <TopGenreArtistBgSlot
                              key={`${genre.name}-slot-${slotIdx}`}
                              imageUrl={artist?.imageUrl ?? null}
                              label={artist?.name ?? ""}
                              fallbackClass={slotFallbacks[slotIdx] ?? slotFallbacks[0]}
                            />
                          ))}
                        </div>
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${gradientByRank[index]} opacity-[0.12] mix-blend-overlay`}
                          aria-hidden
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35"
                          aria-hidden
                        />
                        <div className="relative z-10 flex min-h-[280px] flex-col justify-end p-6 pt-16 sm:min-h-[300px]">
                          <span className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-gray-900 shadow-lg ring-2 ring-black/20">
                            {index + 1}
                          </span>
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {artists.slice(0, 3).map((a) => (
                              <span
                                key={a.id}
                                className="truncate rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/95 backdrop-blur-sm max-w-full"
                                title={a.name}
                              >
                                {a.name}
                              </span>
                            ))}
                          </div>
                          <h3 className="text-lg font-bold text-white drop-shadow-sm truncate">
                            {genre.name}
                          </h3>
                          <p className="mt-1 text-2xl font-extrabold tabular-nums text-white drop-shadow-md">
                            {genre.count.toLocaleString(locale)}
                          </p>
                          <p className="text-sm text-white/75">{t("listens")}</p>
                          <div className="mt-4 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-white/20">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-white/90 to-white/60 transition-all duration-500"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Chart type selector */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">
                {t("chart")}
              </span>
              <div className="flex items-center bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50 w-fit">
                <button
                  onClick={() => setChartType("pie")}
                  className={`
                    px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                    ${chartType === "pie" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                  `}
                >
                  {t("pie")}
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`
                    px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                    ${chartType === "bar" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                  `}
                >
                  {t("bar")}
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="overflow-hidden rounded-xl border-l-4 border-l-accent-violet border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card hover:shadow-card-hover transition-shadow duration-300">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {t("distributionTitle")}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("totalListens")}: {data.totalListens.toLocaleString(locale)} {t("listens")}
                </p>
              </div>
              <div className="p-4 sm:p-6 overflow-x-auto">
              {chartType === "pie" ? (
                <div className="h-[280px] sm:h-[380px] lg:h-[500px] min-w-[260px] mb-10">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDisplayData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius="75%"
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartDisplayData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={CustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <PieChartLegend data={chartDisplayData} colors={COLORS} locale={locale} />
                </div>
              ) : (
                <div className="h-[320px] sm:h-[400px] lg:h-[500px] min-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDisplayData}
                    margin={{ top: 12, right: 12, left: 0, bottom: 80 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: "currentColor", fontSize: 10 }}
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                    />
                    <defs>
                      <linearGradient id="genreBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <Tooltip content={CustomTooltip} />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name={t("Listens")}
                      fill="url(#genreBarGradient)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              )}

              {/* Liste des genres avec barres de progression - design moderne */}
              <div className="mt-12 pt-8 sm:mt-14 sm:pt-10 border-t border-gray-100 dark:border-gray-700/50">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                  {t("detailByGenre")}
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {(detailExpanded ? chartData : chartData.slice(0, 5)).map((item, index) => {
                    const maxCount = chartData[0]?.count ?? 1;
                    const widthPercent = (item.count / maxCount) * 100;
                    const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                    const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                    const rankStyle = index < 3 ? rankColors[index] : "text-gray-400 dark:text-gray-500";
                    const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-800";
                    return (
                      <div key={item.name} className="group">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 mb-1 sm:mb-1.5">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <span className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg text-[10px] sm:text-xs font-bold ${rankStyle} ${rankBgStyle}`}>
                              {index + 1}
                            </span>
                            <div
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              aria-hidden
                            />
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate min-w-0">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 ml-8 sm:ml-0 shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                              {item.count.toLocaleString(locale)}
                            </span>
                            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 w-10 sm:w-12 text-right tabular-nums shrink-0">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="ml-8 sm:ml-10 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/50">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {chartData.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setDetailExpanded((prev) => !prev)}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20 transition-colors"
                    aria-expanded={detailExpanded}
                  >
                    {detailExpanded ? (
                      <>
                        <ChevronIcon direction="up" />
                        {tCommon("less")}
                      </>
                    ) : (
                      <>
                        <ChevronIcon direction="down" />
                        {tCommon("more")} ({chartData.length - 5})
                      </>
                    )}
                  </button>
                )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function GenresFallback() {
  const t = useTranslations("genres");
  return (
    <div className="mt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>
      <GenresSkeleton />
    </div>
  );
}

export default function GenresPage() {
  return (
    <Suspense fallback={<GenresFallback />}>
      <GenresContent />
    </Suspense>
  );
}