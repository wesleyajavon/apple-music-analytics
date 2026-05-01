"use client";

import { Suspense, useState, useMemo, useCallback, memo, useEffect, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
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
import { Tags } from "lucide-react";

type ChartType = "pie" | "bar";

// Couleurs pour les genres – vibe spectrum / synthwave analytics.
const COLORS = [
  "#818cf8", // indigo
  "#f472b6", // pink
  "#22d3ee", // cyan
  "#f59e0b", // amber
  "#a78bfa", // violet
  "#fb7185", // rose
  "#2dd4bf", // teal
  "#c084fc", // purple
  "#38bdf8", // sky
  "#f97316", // orange
];
const GENRE_RAIL_CLASS = "bg-gradient-to-r from-indigo-400 via-rose-400 to-amber-300";
const GENRE_ACTIVE_TAB_CLASS =
  "bg-gradient-to-r from-indigo-500 via-rose-500 to-amber-400 text-white shadow-sm shadow-rose-950/20";

const GENRES_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-indigo-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.32),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.24),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_48%,_#312e81_100%)] px-6 py-8 shadow-2xl shadow-indigo-950/40 sm:px-8 sm:py-10";

const TRENDS_CTA_CLASS =
  "inline-flex min-h-[44px] w-fit shrink-0 items-center justify-center rounded-full border border-indigo-100/30 bg-white/95 px-5 py-2.5 text-sm font-semibold text-indigo-950 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

function GenresHeroFrame({
  trendsHref,
  stats,
  dateSummary,
  genreExtras,
}: {
  trendsHref: string;
  stats: ReactNode;
  dateSummary: string;
  genreExtras?: string;
}) {
  const t = useTranslations("genres");
  const meta = [dateSummary, genreExtras].filter(Boolean).join(" · ");
  return (
    <div className={GENRES_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(129,140,248,0.11)_1px,_transparent_1px),linear-gradient(90deg,_rgba(251,191,36,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-rose-400/20 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-cyan-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${GENRE_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <Tags className="h-9 w-9 shrink-0 text-indigo-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${GENRE_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(129,140,248,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-indigo-100/90 sm:text-lg">{t("subtitle")}</p>
          {meta ? (
            <p className="mt-2 text-sm font-medium tracking-wide text-amber-100/90" aria-live="polite">
              {meta}
            </p>
          ) : null}
          {stats}
        </div>
        <Link href={trendsHref} className={TRENDS_CTA_CLASS}>
          {t("viewTrends")}
        </Link>
      </div>
    </div>
  );
}

function GenresHeroStats({
  genreCount,
  totalListens,
  topGenreName,
  locale,
}: {
  genreCount: number;
  totalListens: number;
  topGenreName: string;
  locale: string;
}) {
  const t = useTranslations("genres");
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      <div className="rounded-xl border border-indigo-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-indigo-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-100/80">{t("statGenres")}</p>
        <p className="text-2xl font-bold text-white">{genreCount.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-rose-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-rose-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-rose-100/80">{t("totalListens")}</p>
        <p className="text-2xl font-bold text-white">{totalListens.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-amber-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-100/80">{t("statTopGenre")}</p>
        <p className="text-2xl font-bold text-white truncate max-w-[200px]">{topGenreName}</p>
      </div>
    </div>
  );
}

function GenresHeroStatsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[140px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-initial"
        >
          <div className="mb-2 h-3 w-20 rounded bg-white/15" />
          <div className="h-8 w-24 rounded bg-white/20" />
        </div>
      ))}
    </div>
  );
}

function TopGenresSpotlightSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="min-h-[280px] rounded-3xl bg-gray-100 animate-shimmer dark:bg-gray-800 sm:min-h-[300px]" />
      ))}
    </div>
  );
}

function GenreChartSkeleton({ type }: { type: ChartType }) {
  if (type === "pie") {
    return (
      <div className="relative mb-10 flex min-w-[260px] items-center justify-center rounded-2xl border border-indigo-200/20 bg-white/50 p-3 shadow-inner dark:border-indigo-300/10 dark:bg-slate-950/20 h-[280px] sm:h-[380px] lg:h-[500px]" aria-busy="true">
        <div className="h-44 w-44 rounded-full border-[28px] border-indigo-100 bg-gray-100 animate-shimmer dark:border-indigo-900/60 dark:bg-gray-800 sm:h-60 sm:w-60 sm:border-[38px]" />
      </div>
    );
  }

  return (
    <div className="relative min-w-[280px] rounded-2xl border border-indigo-200/20 bg-white/50 p-6 shadow-inner dark:border-indigo-300/10 dark:bg-slate-950/20 h-[320px] sm:h-[400px] lg:h-[500px]" aria-busy="true">
      <div className="flex h-full items-end justify-between gap-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="w-full rounded-t-lg bg-indigo-200 animate-shimmer dark:bg-indigo-900/70"
            style={{ height: `${28 + ((index * 17) % 62)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function GenreDetailRowsSkeleton() {
  return (
    <div className="max-h-[460px] overflow-y-auto pr-1 space-y-3 sm:space-y-4" aria-busy="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="group">
          <div className="mb-1 flex items-center gap-3">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-gray-200 animate-shimmer dark:bg-gray-700" />
            <div className="h-3 w-3 shrink-0 rounded-full bg-gray-200 animate-shimmer dark:bg-gray-700" />
            <div className="h-4 w-40 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
            <div className="ml-auto h-4 w-20 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
          </div>
          <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-indigo-100/70 dark:bg-indigo-950/45">
            <div
              className="h-full rounded-full bg-indigo-200 animate-shimmer dark:bg-indigo-800"
              style={{ width: `${35 + ((index * 13) % 55)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function useGenresTrendsHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("genresPage");
    params.delete("genresPageSize");
    const qs = params.toString();
    return qs ? `/dashboard/genres/trends?${qs}` : "/dashboard/genres/trends";
  }, [searchParams]);
}

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
        // eslint-disable-next-line @next/next/no-img-element
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
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("genres");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const CustomTooltip = useMemo(() => createCustomTooltip(t, locale), [t, locale]);

  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const [chartType, setChartType] = useState<ChartType>("pie");
  const detailPage = Math.max(1, Number.parseInt(searchParams.get("genresPage") ?? "1", 10) || 1);
  const detailPageSize = [10, 20, 50].includes(
    Number.parseInt(searchParams.get("genresPageSize") ?? "10", 10)
  )
    ? Number.parseInt(searchParams.get("genresPageSize") ?? "10", 10)
    : 10;
  const detailOffset = (detailPage - 1) * detailPageSize;

  const updateDetailPaginationParams = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("genresPage", String(Math.max(1, nextPage)));
      params.set("genresPageSize", String(nextPageSize));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const { data, isLoading, error, refetch } = useGenres(startDate, endDate, userId, {
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
  const detailRows = chartData.slice(detailOffset, detailOffset + detailPageSize);
  const detailTotal = chartData.length;
  const detailTotalPages = Math.max(1, Math.ceil(detailTotal / detailPageSize));
  const detailStart = detailTotal === 0 ? 0 : detailOffset + 1;
  const detailEnd = Math.min(detailOffset + detailRows.length, detailTotal);
  const trendsHref = useGenresTrendsHref();

  useEffect(() => {
    if (detailPage > detailTotalPages) {
      updateDetailPaginationParams(detailTotalPages, detailPageSize);
    }
  }, [detailPage, detailPageSize, detailTotalPages, updateDetailPaginationParams]);
  const gradientByRank = [
    "from-indigo-400 via-cyan-400 to-sky-400",
    "from-fuchsia-500 via-rose-500 to-orange-400",
    "from-violet-500 via-indigo-500 to-amber-400",
  ];
  /** Fallback visuel par colonne si pas d’image ou moins de 3 artistes. */
  const slotFallbacks = [
    "from-indigo-800/95 via-sky-900/90 to-black/80",
    "from-rose-800/95 via-fuchsia-900/90 to-black/80",
    "from-amber-800/95 via-indigo-900/90 to-black/80",
  ];

  const topArtistsByGenre = useMemo(() => {
    const entries = data?.topArtistsForTopGenres ?? [];
    return new Map(entries.map((e) => [e.genre, e.artists]));
  }, [data?.topArtistsForTopGenres]);

  const dateSummary = startDate && endDate ? formatDateRange(startDate, endDate) : t("allData");
  const genreExtras =
    !isLoadingOrFetching && chartData.length > 0
      ? `${chartData.length} ${t("statGenres")}`
      : undefined;
  const heroStats = isLoadingOrFetching ? (
    <GenresHeroStatsSkeleton />
  ) : error || !data || data.data.length === 0 ? null : (
    <GenresHeroStats
      genreCount={chartData.length}
      totalListens={data.totalListens}
      topGenreName={chartData[0]?.name ?? "—"}
      locale={locale}
    />
  );

  return (
    <div className="space-y-8">
      <GenresHeroFrame
        trendsHref={trendsHref}
        stats={heroStats}
        dateSummary={dateSummary}
        genreExtras={genreExtras}
      />
      <div className="max-w-3xl rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-sm shadow-amber-950/5 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">{t("apiMappingNoticeTitle")}</p>
        <p className="mt-1">
          {t("apiMappingNoticeBody")}{" "}
          <Link
            href="/dashboard/genres/palette"
            className="font-semibold underline decoration-amber-500/60 underline-offset-2 hover:decoration-amber-600 dark:decoration-amber-300/70"
          >
            {t("apiMappingNoticeLink")}
          </Link>
        </p>
      </div>
      {!isLoadingOrFetching && error ? (
        <ErrorState
          error={error}
          message={t("errorLoading")}
          onRetry={() => refetch()}
        />
      ) : !isLoadingOrFetching && (!data || data.data.length === 0) ? (
        <EmptyState {...emptyStatePresets.changeDates(pathname)} />
      ) : (
        <div className="space-y-8">
            {/* Top 3 genres spotlight – style Replay */}
            {isLoadingOrFetching ? (
              <section>
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("top3Title")}</h3>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">{t("top3Subtitle")}</p>
                <TopGenresSpotlightSkeleton />
              </section>
            ) : top3Genres.length > 0 && (
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
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted shrink-0">
                {t("chart")}
              </span>
              <div className="flex w-fit items-center rounded-xl border border-indigo-300/20 bg-surface p-1.5 shadow-sm">
                <button
                  onClick={() => setChartType("pie")}
                  className={`
                    relative z-10 px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${chartType === "pie" ? GENRE_ACTIVE_TAB_CLASS : "text-muted hover:text-foreground"}
                  `}
                >
                  {t("pie")}
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`
                    relative z-10 px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${chartType === "bar" ? GENRE_ACTIVE_TAB_CLASS : "text-muted hover:text-foreground"}
                  `}
                >
                  {t("bar")}
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="relative overflow-hidden rounded-2xl border border-indigo-300/20 border-l-4 border-l-rose-400 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card transition-shadow duration-300 hover:shadow-card-hover dark:border-indigo-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.12),_transparent_30%),rgb(var(--card-rgb)/0.9)]">
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${GENRE_RAIL_CLASS} opacity-80`} />
              <div className="border-b border-indigo-200/20 px-4 py-3 dark:border-indigo-300/10 sm:px-6 sm:py-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {t("distributionTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-indigo-700/80 dark:text-indigo-100/70 sm:text-sm">
                  {data
                    ? `${t("totalListens")}: ${data.totalListens.toLocaleString(locale)} ${t("listens")}`
                    : t("totalListens")}
                </p>
              </div>
              <div className="relative overflow-x-auto p-4 sm:p-6">
              <div className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-rose-400/10 blur-3xl dark:bg-rose-400/15" />
              {isLoadingOrFetching ? (
                <GenreChartSkeleton type={chartType} />
              ) : chartType === "pie" ? (
                <div className="relative mb-10 min-w-[260px] rounded-2xl border border-indigo-200/20 bg-white/50 p-3 shadow-inner dark:border-indigo-300/10 dark:bg-slate-950/20 h-[280px] sm:h-[380px] lg:h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="genrePieGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#4f46e5" floodOpacity="0.18" />
                      </filter>
                    </defs>
                    <Pie
                      data={chartDisplayData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      innerRadius="38%"
                      outerRadius="75%"
                      paddingAngle={2}
                      dataKey="value"
                      filter="url(#genrePieGlow)"
                    >
                      {chartDisplayData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="rgb(var(--card-rgb) / 0.95)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={CustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <PieChartLegend data={chartDisplayData} colors={COLORS} locale={locale} />
                </div>
              ) : (
                <div className="relative min-w-[280px] rounded-2xl border border-indigo-200/20 bg-white/50 p-3 shadow-inner dark:border-indigo-300/10 dark:bg-slate-950/20 h-[320px] sm:h-[400px] lg:h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartDisplayData}
                    margin={{ top: 18, right: 18, left: 0, bottom: 80 }}
                  >
                    <defs>
                      <linearGradient id="genreBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="48%" stopColor="#f472b6" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <filter id="genreBarGlow" x="-20%" y="-20%" width="140%" height="150%">
                        <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#e879f9" floodOpacity="0.22" />
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#c7d2fe"
                      strokeOpacity={0.32}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: "currentColor", fontSize: 10 }}
                      stroke="#6366f1"
                      className="dark:stroke-gray-400"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      stroke="#6366f1"
                      className="dark:stroke-gray-400"
                    />
                    <Tooltip content={CustomTooltip} />
                    <Legend wrapperStyle={{ color: "rgb(var(--muted-rgb))", fontSize: 12 }} />
                    <Bar
                      dataKey="count"
                      name={t("Listens")}
                      fill="url(#genreBarGradient)"
                      filter="url(#genreBarGlow)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              )}

              {/* Liste des genres avec barres de progression - design moderne */}
              <div className="mt-12 border-t border-indigo-200/20 pt-8 dark:border-indigo-300/10 sm:mt-14 sm:pt-10">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                  {t("detailByGenre")}
                </h3>
                {isLoadingOrFetching ? (
                  <GenreDetailRowsSkeleton />
                ) : (
                <div className="max-h-[460px] overflow-y-auto pr-1 space-y-3 sm:space-y-4">
                  {detailRows.map((item, index) => {
                    const absoluteIndex = detailOffset + index;
                    const maxCount = chartData[0]?.count ?? 1;
                    const widthPercent = (item.count / maxCount) * 100;
                    const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                    const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                    const rankStyle = absoluteIndex < 3 ? rankColors[absoluteIndex] : "text-gray-400 dark:text-gray-500";
                    const rankBgStyle = absoluteIndex < 3 ? rankBg[absoluteIndex] : "bg-gray-100 dark:bg-gray-800";
                    return (
                      <div key={item.name} className="group">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 mb-1 sm:mb-1.5">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <span className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg text-[10px] sm:text-xs font-bold ${rankStyle} ${rankBgStyle}`}>
                              {absoluteIndex + 1}
                            </span>
                            <div
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 rounded-full"
                              style={{ backgroundColor: COLORS[absoluteIndex % COLORS.length] }}
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
                        <div className="ml-8 h-1.5 overflow-hidden rounded-full bg-indigo-100/70 dark:bg-indigo-950/45 sm:ml-10">
                          <div
                            className="h-full rounded-full shadow-[0_0_18px_-6px_currentColor] transition-all duration-500 ease-out"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: COLORS[absoluteIndex % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
                <div className="mt-4 flex flex-col gap-3 border-t border-indigo-200/30 bg-indigo-50/25 pt-4 dark:border-indigo-400/15 dark:bg-indigo-950/15 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-indigo-900/75 dark:text-indigo-100/75">
                    {t("paginationSummary", {
                      start: detailStart,
                      end: detailEnd,
                      total: detailTotal,
                    })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateDetailPaginationParams(detailPage - 1, detailPageSize)}
                      disabled={detailPage === 1}
                      className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-indigo-200/70 bg-white/90 px-3 py-1.5 text-sm font-medium text-indigo-950 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-slate-900/60 dark:text-indigo-50 dark:hover:bg-indigo-950/35"
                    >
                      {t("paginationPrevious")}
                    </button>
                    <label className="ml-2 inline-flex items-center gap-2 text-sm text-indigo-900/85 dark:text-indigo-100/80">
                      <span>{t("pageSizeLabel")}</span>
                      <select
                        value={detailPageSize}
                        onChange={(e) => updateDetailPaginationParams(1, Number(e.target.value))}
                        className="rounded-lg border border-indigo-200/70 bg-white px-2 py-1 text-sm text-indigo-950 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-50"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                    <span className="px-2 text-sm text-indigo-900/85 dark:text-indigo-100/80">
                      {t("paginationPage", { page: detailPage, totalPages: detailTotalPages })}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDetailPaginationParams(detailPage + 1, detailPageSize)}
                      disabled={detailPage >= detailTotalPages}
                      className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-indigo-200/70 bg-white/90 px-3 py-1.5 text-sm font-medium text-indigo-950 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-slate-900/60 dark:text-indigo-50 dark:hover:bg-indigo-950/35"
                    >
                      {t("paginationNext")}
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function GenresFallback() {
  const trendsHref = useGenresTrendsHref();
  const t = useTranslations("genres");
  const locale = useLocale();
  const { startDate, endDate } = useListenDateRange();
  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
  };
  const dateSummary = startDate && endDate ? formatDateRange(startDate, endDate) : t("allData");
  return (
    <div className="space-y-8">
      <GenresHeroFrame
        trendsHref={trendsHref}
        stats={<GenresHeroStatsSkeleton />}
        dateSummary={dateSummary}
      />
      <GenresSkeleton />
    </div>
  );
}

export default function GenresPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<GenresFallback />}>
        <GenresContent />
      </Suspense>
    </div>
  );
}