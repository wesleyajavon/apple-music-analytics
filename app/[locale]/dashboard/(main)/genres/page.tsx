"use client";

import { Suspense, useState, useMemo, useCallback, memo, useEffect, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  getDateRangePresetFromSearchParams,
  type DateRangePreset,
} from "@/lib/components/date-range-filter";
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
import { PaletteMappingNotice } from "@/lib/components/palette/palette-mapping-notice";
import { GenresSkeleton } from "@/lib/components/skeleton-loaders";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { useArtistSpotifyImageResolution } from "@/lib/hooks/use-artist-spotify-image-resolution";
import { LineChart } from "lucide-react";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_FOOTER,
  DASHBOARD_SPOTLIGHT_FOOTER_TEXT,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_SELECT,
  DASHBOARD_SPOTLIGHT_LABEL,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { useTheme } from "@/lib/providers/theme-provider";

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
const GENRE_ACTIVE_TAB_CLASS =
  "bg-white text-violet-950 shadow-sm dark:bg-white dark:text-violet-950";

const GENRES_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

/** Aligné sur `TopThreeArtists` — ombre forte et panneau d’infos au survol. */
const GENRE_SPOTLIGHT_CARD_SHELL_CLASS =
  "group relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 p-2 shadow-card backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:border-white hover:shadow-[0_28px_80px_-34px_rgba(80,42,130,0.65)] opacity-0 animate-fade-in-up ring-1 ring-card-border dark:border-white/10 dark:bg-black/30 dark:shadow-xl dark:shadow-black/40 dark:ring-white/10 dark:hover:border-white/20 dark:hover:shadow-[0_28px_70px_-40px_rgba(0,0,0,0.75)]";

function GenresHeroFrame({
  trendsHref,
  stats,
  badgeLabel,
}: {
  trendsHref: string;
  stats: ReactNode;
  badgeLabel: string;
}) {
  const t = useTranslations("genres");
  return (
    <div className={GENRES_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={trendsHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <LineChart className="h-4 w-4" aria-hidden />
              {t("viewTrends")}
            </Link>
            <span className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur">
              {badgeLabel}
            </span>
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
              {stats}
            </div>
          </div>
        </div>
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
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{genreCount.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("statGenres")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{totalListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("totalListens")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white truncate">{topGenreName}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("statTopGenre")}</p>
      </div>
    </div>
  );
}

function GenresHeroStatsSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-20 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function GenresSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
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

function formatDateRangeShort(startDate: string | undefined, endDate: string | undefined, locale: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

function useGenresHeroBadge() {
  const locale = useLocale();
  const t = useTranslations("genres");
  const searchParams = useSearchParams();
  const preset = getDateRangePresetFromSearchParams(searchParams);
  const { startDate: rangeStart, endDate: rangeEnd, isLoading: rangeLoading } = useListenDateRange();
  return useMemo(() => {
    const presetLabel: Record<DateRangePreset, string> = {
      "7d": t("periodLast7Days"),
      "30d": t("periodLast30Days"),
      ytd: t("periodYearToDate"),
      all: t("periodAllTime"),
      custom: t("periodCustom"),
    };
    const name = presetLabel[preset];
    const dates = formatDateRangeShort(rangeStart, rangeEnd, locale);
    if (dates) {
      return `${name} · ${dates}`;
    }
    if (preset === "all" && rangeLoading) {
      return name;
    }
    return name;
  }, [preset, rangeStart, rangeEnd, rangeLoading, locale, t]);
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

const TopGenreArtistBgSlotHydrated = memo(function TopGenreArtistBgSlotHydrated({
  artistId,
  imageUrl,
  label,
  fallbackClass,
}: {
  artistId: string;
  imageUrl: string | null;
  label: string;
  fallbackClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = useArtistSpotifyImageResolution(artistId, imageUrl);
  const url = resolved?.trim() ?? null;
  const showImg = Boolean(url && !failed);
  return (
    <div className="relative min-h-[120px] flex-1 min-w-0 border-r border-slate-200/80 last:border-r-0 sm:min-h-[140px] dark:border-white/10">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-focus-visible:scale-110"
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
});
TopGenreArtistBgSlotHydrated.displayName = "TopGenreArtistBgSlotHydrated";

/** Une colonne d’image (top artiste du genre) pour le fond des cartes spotlight. */
function TopGenreArtistBgSlot({
  artistId,
  imageUrl,
  label,
  fallbackClass,
}: {
  artistId: string | null;
  imageUrl: string | null;
  label: string;
  fallbackClass: string;
}) {
  if (!artistId) {
    return (
      <div className="relative min-h-[120px] flex-1 min-w-0 border-r border-slate-200/80 last:border-r-0 sm:min-h-[140px] dark:border-white/10">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${fallbackClass}`}
          aria-hidden
        />
        {label ? <span className="sr-only">{label}</span> : null}
      </div>
    );
  }
  return (
    <TopGenreArtistBgSlotHydrated
      artistId={artistId}
      imageUrl={imageUrl}
      label={label}
      fallbackClass={fallbackClass}
    />
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
  variant = "light",
}: {
  data: Array<{ name: string; percentage: number }>;
  colors: string[];
  locale: string;
  variant?: "light" | "dark";
}) {
  const nameClass = variant === "dark" ? "text-slate-200" : "text-gray-700 dark:text-gray-300";
  const pctClass = variant === "dark" ? "text-slate-400" : "text-gray-500 dark:text-gray-400";
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
          <span className={`text-xs sm:text-sm truncate ${nameClass}`}>
            {item.name}
          </span>
          <span className={`text-[11px] sm:text-xs tabular-nums shrink-0 ${pctClass}`}>
            {item.percentage.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

function GenresContent() {
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const userId = searchParams.get("userId") ?? undefined;
  const paletteAccessRestricted = searchParams.get("palette") === "restricted";
  const isPublicDemoViewer = usePublicDemoViewer(userId);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("genres");
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
        className="fill-slate-700 dark:fill-slate-200"
        style={{ fontSize: "clamp(9px, 2vw, 12px)" }}
      >
        {`${pct.toFixed(1)}%`}
      </text>
    );
  }, []);

  const emptyStatePresets = useEmptyStatePresets();

  const badgeLabel = useGenresHeroBadge();

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
    <div className="space-y-12">
      <GenresHeroFrame trendsHref={trendsHref} stats={heroStats} badgeLabel={badgeLabel} />
      {paletteAccessRestricted ? (
        <div className="max-w-3xl rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-950 shadow-sm shadow-cyan-950/5 dark:border-cyan-400/25 dark:bg-cyan-950/30 dark:text-cyan-100">
          <p className="font-semibold">{t("paletteRestrictedTitle")}</p>
          <p className="mt-1">{t("paletteRestrictedBody")}</p>
        </div>
      ) : null}
      <PaletteMappingNotice
        title={t("apiMappingNoticeTitle")}
        body={t("apiMappingNoticeBody")}
        linkLabel={t("apiMappingNoticeLink")}
        isPublicDemoViewer={isPublicDemoViewer}
        showGroqCta
        viewerUserId={userId}
      />
      {!isLoadingOrFetching && error ? (
        <ErrorState
          error={error}
          message={t("errorLoading")}
          onRetry={() => refetch()}
        />
      ) : !isLoadingOrFetching && (!data || data.data.length === 0) ? (
        <EmptyState {...emptyStatePresets.changeDates(pathname)} />
      ) : (
        <div className="space-y-12">
            {isLoadingOrFetching ? (
              <section className="relative animate-fade-in-up">
                <GenresSectionHeader
                  eyebrow={t("sections.spotlight.eyebrow")}
                  title={t("sections.spotlight.title")}
                  description={t("sections.spotlight.description")}
                />
                <TopGenresSpotlightSkeleton />
              </section>
            ) : top3Genres.length > 0 ? (
              <section className="relative animate-fade-in-up">
                <GenresSectionHeader
                  eyebrow={t("sections.spotlight.eyebrow")}
                  title={t("sections.spotlight.title")}
                  description={t("sections.spotlight.description")}
                />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {top3Genres.map((genre, index) => {
                    const artists = topArtistsByGenre.get(genre.name) ?? [];
                    const slots = Array.from({ length: 3 }, (_, i) => artists[i] ?? null);
                    return (
                      <div
                        key={genre.name}
                        className={GENRE_SPOTLIGHT_CARD_SHELL_CLASS}
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div className="relative min-h-[280px] overflow-hidden rounded-[1.35rem] bg-slate-100 dark:bg-slate-900 sm:min-h-[300px]">
                          <div className="absolute inset-0 flex">
                            {slots.map((artist, slotIdx) => (
                              <TopGenreArtistBgSlot
                                key={`${genre.name}-slot-${slotIdx}`}
                                artistId={artist?.id ?? null}
                                imageUrl={artist?.imageUrl ?? null}
                                label={artist?.name ?? ""}
                                fallbackClass={slotFallbacks[slotIdx] ?? slotFallbacks[0]}
                              />
                            ))}
                          </div>
                          <div
                            className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/10 opacity-70 transition-opacity duration-500 group-hover:opacity-35 dark:from-black/45 dark:via-transparent dark:to-black/30 dark:opacity-85 dark:group-hover:opacity-40"
                            aria-hidden
                          />
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 z-[11] h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300 group-hover:opacity-0 dark:from-black/70 dark:via-black/25"
                            aria-hidden
                          />
                          <span className="absolute right-4 top-4 z-[13] flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-lg font-black text-gray-950 shadow-xl shadow-black/10 backdrop-blur ring-1 ring-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:border-white/20 dark:bg-slate-900/95 dark:text-white dark:shadow-black/40 dark:ring-white/10">
                            {index + 1}
                          </span>
                          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[12] transition-opacity duration-300 group-hover:opacity-0">
                            <h3 className="truncate text-xl font-semibold tracking-[-0.03em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
                              {genre.name}
                            </h3>
                          </div>
                          <div className="absolute inset-x-3 bottom-3 z-[14] translate-y-6 rounded-3xl border border-white/80 bg-white/90 p-4 opacity-0 shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-slate-950/85">
                            {artists.length > 0 ? (
                              <div className="mb-3 flex flex-wrap gap-1.5">
                                {artists.slice(0, 3).map((a) => (
                                  <span
                                    key={a.id}
                                    className="truncate rounded-full border border-slate-200/90 bg-white/95 px-2 py-0.5 text-[11px] font-medium text-slate-800 shadow-sm backdrop-blur-sm max-w-full dark:border-white/15 dark:bg-white/12 dark:text-white/95"
                                    title={a.name}
                                  >
                                    {a.name}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <div className="flex items-end justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-xl font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">
                                  {genre.name}
                                </h3>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-gray-950 dark:text-white">
                                  {genre.count.toLocaleString(locale)}
                                </p>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                                  {t("listens")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="relative animate-fade-in-up" style={{ animationDelay: "40ms" }}>
              <GenresSectionHeader
                eyebrow={t("sections.distribution.eyebrow")}
                title={t("sections.distribution.title")}
                description={t("sections.distribution.description")}
              />
              <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-white px-5 py-4 shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] dark:border-white/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:shadow-black/25 dark:ring-white/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{t("chart")}</span>
                  <div className="flex w-fit items-center rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-inner dark:border-white/15 dark:bg-black/35 dark:shadow-inner dark:shadow-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => setChartType("pie")}
                      className={`relative z-10 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm ${
                        chartType === "pie"
                          ? GENRE_ACTIVE_TAB_CLASS
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {t("pie")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      className={`relative z-10 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm ${
                        chartType === "bar"
                          ? GENRE_ACTIVE_TAB_CLASS
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}
                    >
                      {t("bar")}
                    </button>
                  </div>
                </div>
              </div>

              <div className={DASHBOARD_SPOTLIGHT_SHELL}>
                <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
                <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
                <div className={`relative ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-5 sm:px-8`}>
                  <div className={`mb-2 ${DASHBOARD_SPOTLIGHT_BADGE_VIOLET}`}>
                    <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET} aria-hidden />
                    {t("distributionTitle")}
                  </div>
                  <p className={DASHBOARD_SPOTLIGHT_MUTED}>
                    {data
                      ? `${t("totalListens")}: ${data.totalListens.toLocaleString(locale)} ${t("listens")}`
                      : t("totalListens")}
                  </p>
                </div>
                <div className="relative overflow-x-auto p-4 sm:p-6 lg:p-8">
              {isLoadingOrFetching ? (
                <GenreChartSkeleton type={chartType} />
              ) : chartType === "pie" ? (
                <div className="relative mb-10 min-w-[260px] rounded-[1.35rem] border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-black/25 h-[280px] sm:h-[380px] lg:h-[500px]">
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
                          stroke={chartTheme.pieStroke}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={CustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <PieChartLegend data={chartDisplayData} colors={COLORS} locale={locale} variant={resolvedTheme === "dark" ? "dark" : "light"} />
                </div>
              ) : (
                <div className="relative min-w-[280px] rounded-[1.35rem] border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-black/25 h-[320px] sm:h-[400px] lg:h-[500px]">
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
                      stroke={chartTheme.grid}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: chartTheme.tick, fontSize: 10 }}
                      stroke={chartTheme.axisStroke}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fill: chartTheme.tick, fontSize: 12 }}
                      stroke={chartTheme.axisStroke}
                    />
                    <Tooltip content={CustomTooltip} />
                    <Legend wrapperStyle={{ color: chartTheme.legend, fontSize: 12 }} />
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

              <div className="mt-12 border-t border-slate-200/90 pt-8 dark:border-white/10 sm:mt-14 sm:pt-10">
                <h3 className="mb-3 text-xs font-semibold text-slate-900 sm:mb-4 sm:text-sm dark:text-white">
                  {t("detailByGenre")}
                </h3>
                {isLoadingOrFetching ? (
                  <GenreDetailRowsSkeleton />
                ) : (
                <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1 sm:space-y-4">
                  {detailRows.map((item, index) => {
                    const absoluteIndex = detailOffset + index;
                    const maxCount = chartData[0]?.count ?? 1;
                    const widthPercent = (item.count / maxCount) * 100;
                    const rankColors = ["text-amber-700 dark:text-amber-400", "text-slate-600 dark:text-slate-300", "text-amber-800 dark:text-amber-500"];
                    const rankBg = ["bg-amber-100 dark:bg-amber-400/20", "bg-slate-200 dark:bg-slate-400/15", "bg-amber-100 dark:bg-amber-500/20"];
                    const rankStyle = absoluteIndex < 3 ? rankColors[absoluteIndex] : "text-slate-500";
                    const rankBgStyle = absoluteIndex < 3 ? rankBg[absoluteIndex] : "bg-slate-200/80 dark:bg-white/10";
                    return (
                      <div key={item.name} className="group">
                        <div className="mb-1 flex flex-col gap-0.5 sm:mb-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs ${rankStyle} ${rankBgStyle}`}>
                              {absoluteIndex + 1}
                            </span>
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3"
                              style={{ backgroundColor: COLORS[absoluteIndex % COLORS.length] }}
                              aria-hidden
                            />
                            <span className="min-w-0 truncate text-xs font-medium text-slate-900 sm:text-sm dark:text-white">
                              {item.name}
                            </span>
                          </div>
                          <div className="ml-8 flex shrink-0 items-center gap-2 sm:ml-0 sm:gap-4">
                            <span className="text-xs font-semibold tabular-nums text-slate-900 sm:text-sm dark:text-white">
                              {item.count.toLocaleString(locale)}
                            </span>
                            <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-slate-600 sm:w-12 sm:text-xs dark:text-slate-400">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="ml-8 h-1.5 overflow-hidden rounded-full bg-slate-200/90 sm:ml-10 dark:bg-white/10">
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
                <div className={DASHBOARD_SPOTLIGHT_FOOTER}>
                  <p className={DASHBOARD_SPOTLIGHT_FOOTER_TEXT}>
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
                      className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} min-h-[36px] px-3 py-1.5 text-sm font-medium`}
                    >
                      {t("paginationPrevious")}
                    </button>
                    <label className={`ml-2 ${DASHBOARD_SPOTLIGHT_LABEL}`}>
                      <span>{t("pageSizeLabel")}</span>
                      <select
                        value={detailPageSize}
                        onChange={(e) => updateDetailPaginationParams(1, Number(e.target.value))}
                        className={`${DASHBOARD_SPOTLIGHT_SELECT} rounded-lg px-2 py-1`}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                    <span className={`px-2 ${DASHBOARD_SPOTLIGHT_FOOTER_TEXT}`}>
                      {t("paginationPage", { page: detailPage, totalPages: detailTotalPages })}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDetailPaginationParams(detailPage + 1, detailPageSize)}
                      disabled={detailPage >= detailTotalPages}
                      className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} min-h-[36px] px-3 py-1.5 text-sm font-medium`}
                    >
                      {t("paginationNext")}
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
            </section>
        </div>
        )}
    </div>
  );
}

function GenresFallback() {
  const trendsHref = useGenresTrendsHref();
  const badgeLabel = useGenresHeroBadge();
  return (
    <div className="space-y-12">
      <GenresHeroFrame trendsHref={trendsHref} stats={<GenresHeroStatsSkeleton />} badgeLabel={badgeLabel} />
      <GenresSkeleton />
    </div>
  );
}

export default function GenresPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<GenresFallback />}>
        <GenresContent />
      </Suspense>
    </div>
  );
}