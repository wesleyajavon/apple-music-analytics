"use client";

import {
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
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
import { useGenreTrends, useGenreTrendsCommentary } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { GroqGenreBackfillCta } from "@/lib/components/palette/groq-genre-backfill-cta";
import { PeriodSelector, getPeriodFromSearchParams, type PeriodType } from "@/lib/components/period-selector";
import type { GenreTrendsDataPoint } from "@/lib/dto/genres";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { ArrowLeft } from "lucide-react";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_PILL_MUTED,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { useTheme } from "@/lib/providers/theme-provider";

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

const MAX_SERIES_GENRES = 30;
const GENRE_FILTER_PAGE_SIZE = 30;

const TRENDS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 -mt-4 border-b border-white/10 bg-surface-glass/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-8";

function useGenresListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/genres?${qs}` : "/dashboard/genres";
  }, [searchParams]);
}

function periodToLabelKey(period: PeriodType): "daily" | "weekly" | "monthly" {
  if (period === "day") return "daily";
  if (period === "week") return "weekly";
  return "monthly";
}

function useGenreTrendsBadgeLabel() {
  const locale = useLocale();
  const tOverview = useTranslations("overview");
  const { startDate, endDate } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(startDate, endDate, locale);
  return dateRangeLabel || tOverview("allData");
}

function GenreTrendsSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
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

function GenreTrendsHeroPanelSkeleton() {
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

function GenreTrendsHeroPanel({ period, selectedCount }: { period: PeriodType; selectedCount: number }) {
  const t = useTranslations("genreTrends");
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
          {selectedCount} / {MAX_SERIES_GENRES}
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroPanelSeries")}</p>
      </div>
    </div>
  );
}

function GenreTrendsHeroFrame({
  genresHref,
  subtitleKey,
  badgeLabel,
  panel,
}: {
  genresHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
  badgeLabel: string;
  panel: ReactNode;
}) {
  const t = useTranslations("genreTrends");
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
              href={genresHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToGenres")}
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

function GenreFilterSkeleton() {
  return (
    <div className="flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-card-border bg-surface/60 p-2" aria-busy="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={index}
          className="h-9 rounded-lg bg-gray-100 animate-shimmer dark:bg-gray-800"
          style={{ width: `${84 + ((index * 17) % 82)}px` }}
        />
      ))}
    </div>
  );
}

function GenreTrendsChartSkeleton() {
  return (
    <div className="relative min-h-[500px] rounded-[1.35rem] border border-slate-200/80 bg-slate-100/50 p-6 dark:border-white/10 dark:bg-black/30" aria-busy="true">
      <div className="flex h-[452px] flex-col justify-between">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-slate-200/90 dark:bg-white/10" />
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
          <div key={index} className="h-3 w-28 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

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
  TrendsTooltipInner.displayName = "TrendsTooltip";
  return TrendsTooltipInner;
}

export type TrendDelta = {
  genre: string;
  firstHalf: number;
  secondHalf: number;
  delta: number;
  deltaPercent: number;
  direction: "up" | "down" | "stable";
};

function computeRiseDecline(
  data: GenreTrendsDataPoint[],
  genres: string[]
): TrendDelta[] {
  if (data.length === 0) return [];
  const mid = Math.ceil(data.length / 2);
  const first = data.slice(0, mid);
  const second = data.slice(mid);

  return genres.map((genre) => {
    const firstHalf = first.reduce(
      (sum, row) => sum + (Number(row[genre]) || 0),
      0
    );
    const secondHalf = second.reduce(
      (sum, row) => sum + (Number(row[genre]) || 0),
      0
    );
    const delta = secondHalf - firstHalf;
    const base = firstHalf || 1;
    const deltaPercent = Math.round((delta / base) * 100);
    let direction: "up" | "down" | "stable" = "stable";
    if (delta > 0) direction = "up";
    else if (delta < 0) direction = "down";

    return {
      genre,
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
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const t = useTranslations("genreTrends");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = getPeriodFromSearchParams(searchParams, "month");

  // Quand "All" est sélectionné (pas de dates dans l'URL), passer undefined
  // pour que l'API utilise la plage réelle min/max de la DB
  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const isPublicDemoViewer = usePublicDemoViewer(userId);
  const genresHref = useGenresListHref();
  const badgeLabel = useGenreTrendsBadgeLabel();

  const { data, isLoading, error, refetch } = useGenreTrends(
    startDate,
    endDate,
    period,
    undefined,
    userId
  );

  const availableGenres = useMemo(
    () => data?.availableGenres ?? [],
    [data?.availableGenres]
  );
  const chartData = useMemo(
    () => data?.data ?? [],
    [data?.data]
  );

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [summaryVersion, setSummaryVersion] = useState<"light" | "technical">(
    "light"
  );
  const [genreFilterPage, setGenreFilterPage] = useState(0);
  useEffect(() => {
    if (availableGenres.length === 0) return;
    if (selectedGenres.length > 0) return;
    const defaultSelected =
      availableGenres.length <= 5
        ? [...availableGenres]
        : availableGenres.slice(0, 5);
    setSelectedGenres(defaultSelected);
  }, [availableGenres, selectedGenres.length]);

  const genreFilterPageCount = Math.max(
    1,
    Math.ceil(availableGenres.length / GENRE_FILTER_PAGE_SIZE)
  );
  const visibleGenreStart = genreFilterPage * GENRE_FILTER_PAGE_SIZE;
  const visibleGenres = useMemo(
    () =>
      availableGenres.slice(
        visibleGenreStart,
        visibleGenreStart + GENRE_FILTER_PAGE_SIZE
      ),
    [availableGenres, visibleGenreStart]
  );
  const visibleGenreEnd = Math.min(
    visibleGenreStart + visibleGenres.length,
    availableGenres.length
  );

  useEffect(() => {
    setGenreFilterPage(0);
  }, [availableGenres]);

  useEffect(() => {
    if (genreFilterPage >= genreFilterPageCount) {
      setGenreFilterPage(genreFilterPageCount - 1);
    }
  }, [genreFilterPage, genreFilterPageCount]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) return prev.filter((g) => g !== genre);
      if (prev.length >= MAX_SERIES_GENRES) return prev;
      return [...prev, genre];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedGenres(visibleGenres.slice(0, MAX_SERIES_GENRES));
  }, [visibleGenres]);

  const selectNone = useCallback(() => {
    setSelectedGenres([]);
  }, []);

  const riseDecline = useMemo(
    () => computeRiseDecline(chartData, selectedGenres),
    [chartData, selectedGenres]
  );

  const rising = useMemo(
    () => riseDecline.filter((r) => r.direction === "up").sort((a, b) => b.deltaPercent - a.deltaPercent),
    [riseDecline]
  );
  const declining = useMemo(
    () => riseDecline.filter((r) => r.direction === "down").sort((a, b) => a.deltaPercent - b.deltaPercent),
    [riseDecline]
  );

  const commentaryQueryEnabled =
    selectedGenres.length > 0 &&
    chartData.length > 0 &&
    !isLoading &&
    !error;

  /** Résumé naturel par défaut : `mode=light` (un Groq par requête HTTP). */
  const {
    data: lightAi,
    isLoading: lightAiLoading,
    isFetching: lightAiFetching,
    error: lightAiError,
  } = useGenreTrendsCommentary(
    startDate,
    endDate,
    period,
    selectedGenres,
    userId,
    {
      mode: "light",
      enabled: commentaryQueryEnabled,
    }
  );

  /** Variante détaillée : chargée seulement si l’utilisateur choisit l’onglet technique. */
  const {
    data: techAi,
    isLoading: techAiLoading,
    isFetching: techAiFetching,
    error: techAiError,
  } = useGenreTrendsCommentary(
    startDate,
    endDate,
    period,
    selectedGenres,
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

  const activeAiError =
    summaryVersion === "technical" ? techAiError : lightAiError;

  const heroPanel =
    isLoading && !data ? (
      <GenreTrendsHeroPanelSkeleton />
    ) : (
      <GenreTrendsHeroPanel period={period} selectedCount={selectedGenres.length} />
    );

  if (!isLoading && error && !data) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-12">
          <GenreTrendsHeroFrame
            genresHref={genresHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<GenreTrendsHeroPanel period={period} selectedCount={selectedGenres.length} />}
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

  if (!isLoading && (!data || (chartData.length === 0 && availableGenres.length === 0))) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" value={period} />
        </div>
        <div className="mt-6 space-y-12">
          <GenreTrendsHeroFrame
            genresHref={genresHref}
            subtitleKey="subtitleExtended"
            badgeLabel={badgeLabel}
            panel={<GenreTrendsHeroPanel period={period} selectedCount={selectedGenres.length} />}
          />
          <EmptyState
            {...emptyStatePresets.changeDates(pathname)}
            message={t("noGenreData")}
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
        <GenreTrendsHeroFrame
          genresHref={genresHref}
          subtitleKey="subtitleExtended"
          badgeLabel={badgeLabel}
          panel={heroPanel}
        />
        {!isPublicDemoViewer ? (
          <div className="max-w-3xl rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">{t("apiMappingNoticeTitle")}</p>
            <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-100/85">
              {t("chartGenreAccuracyIntro")}
            </p>
            <div className="mt-3 space-y-2 border-t border-amber-200/70 pt-2.5 dark:border-amber-800/50">
              <p>
                {t.rich("chartGenreAccuracyPalette", {
                  manualLabel: (chunks) => <span className="font-semibold">{chunks}</span>,
                  palette: (chunks) => (
                    <Link
                      href="/dashboard/genres/palette"
                      className="font-semibold underline underline-offset-2 hover:opacity-90"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </p>
              <div className="space-y-2 rounded-lg border border-amber-200/70 bg-white/45 p-3 dark:border-amber-800/50 dark:bg-black/10">
                <p>
                  {t.rich("chartGenreAccuracyGroq", {
                    aiLabel: (chunks) => <span className="font-semibold">{chunks}</span>,
                  })}
                </p>
                <GroqGenreBackfillCta viewerUserId={userId} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-12">
          <section className="relative animate-fade-in-up">
            <GenreTrendsSectionHeader
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-200/80 bg-violet-50/90 px-2.5 py-1 text-xs font-semibold text-violet-950 tabular-nums dark:border-violet-300/40 dark:bg-violet-100/80">
                      {t("selectionCount", {
                        selected: selectedGenres.length,
                        max: MAX_SERIES_GENRES,
                      })}
                    </span>
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
              <div className="relative space-y-3 p-4 sm:p-6 lg:p-8">
                <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/95 p-4 shadow-inner shadow-slate-900/[0.04] sm:p-6 dark:border-slate-200/90 dark:bg-white">
            {availableGenres.length > GENRE_FILTER_PAGE_SIZE && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 dark:border-slate-200/90 dark:bg-slate-50/80">
                <div className="text-xs text-slate-600 dark:text-slate-700">
                  <span>
                    {t("paginationSummary", {
                      start: visibleGenreStart + 1,
                      end: visibleGenreEnd,
                      total: availableGenres.length,
                    })}
                  </span>
                  <span className="ml-2">
                    {t("paginationPage", {
                      page: genreFilterPage + 1,
                      totalPages: genreFilterPageCount,
                    })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGenreFilterPage((page) => Math.max(0, page - 1))}
                    disabled={genreFilterPage === 0}
                    className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-300/70 dark:bg-white dark:text-slate-800"
                  >
                    {t("paginationPrevious")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGenreFilterPage((page) =>
                        Math.min(genreFilterPageCount - 1, page + 1)
                      )
                    }
                    disabled={genreFilterPage >= genreFilterPageCount - 1}
                    className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-300/70 dark:bg-white dark:text-slate-800"
                  >
                    {t("paginationNext")}
                  </button>
                </div>
              </div>
            )}
            {isLoading ? (
              <GenreFilterSkeleton />
            ) : (
              <div className="flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 dark:border-slate-200/90 dark:bg-slate-50/90">
                {visibleGenres.map((genre) => {
                  const selected = selectedGenres.includes(genre);
                  const disabled = !selected && selectedGenres.length >= MAX_SERIES_GENRES;
                  const idx = availableGenres.indexOf(genre);
                  return (
                    <label
                      key={genre}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                        selected
                          ? "border-violet-300/60 bg-violet-50 text-violet-950 shadow-sm dark:border-violet-400/50 dark:bg-violet-100/90"
                          : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-200/90 dark:bg-white dark:text-slate-900"
                      } ${
                        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => toggleGenre(genre)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                      />
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: selected ? getColor(idx) : "transparent",
                          border: selected ? "none" : "1px solid #9ca3af",
                        }}
                      />
                      <span className="text-sm">{genre}</span>
                    </label>
                  );
                })}
              </div>
            )}
                </div>
              </div>
            </div>
          </section>


          <section
            className="relative animate-fade-in-up transition-all duration-300"
            style={{ animationDelay: "60ms" }}
            aria-labelledby="genre-trends-spotlight-title"
          >
            <GenreTrendsSectionHeader
              eyebrow={t("sections.chart.eyebrow")}
              title={t("sections.chart.title")}
              description={t("sections.chart.description")}
            />
            <div className={DASHBOARD_SPOTLIGHT_SHELL}>
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
              <div className={`relative ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-5 sm:px-8`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className={`mb-2 ${DASHBOARD_SPOTLIGHT_BADGE_VIOLET}`}>
                      <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET} />
                      {t("sections.chart.badge")}
                    </div>
                    <h2 id="genre-trends-spotlight-title" className={`${DASHBOARD_SPOTLIGHT_TITLE} tracking-tight sm:text-xl`}>
                      {t("evolution")}
                    </h2>
                    <p className={`mt-1 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("chartHint")}</p>
                  </div>
                  <span className={DASHBOARD_SPOTLIGHT_PILL_MUTED}>
                    {t("selectionCount", { selected: selectedGenres.length, max: MAX_SERIES_GENRES })}
                  </span>
                </div>
              </div>
              <div className="relative p-4 sm:p-6 lg:p-8">
                {isLoading ? (
                  <GenreTrendsChartSkeleton />
                ) : selectedGenres.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 px-6 py-12 text-center dark:border-white/10 dark:bg-black/30">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{t("selectAtLeastOne")}</p>
                  </div>
                ) : (
                  <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} relative min-h-[500px]`}>
                    <ResponsiveContainer width="100%" height={500}>
                      <RechartsLineChart data={chartData} margin={{ top: 8, right: 20, left: 4, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                        <XAxis
                          dataKey="formattedDate"
                          tick={{ fill: chartTheme.tick, fontSize: 11 }}
                          stroke={chartTheme.axisStroke}
                          angle={-45}
                          textAnchor="end"
                          height={78}
                        />
                        <YAxis tick={{ fill: chartTheme.tick, fontSize: 11 }} stroke={chartTheme.axisStroke} width={40} />
                        <Tooltip content={<TrendsTooltip />} />
                        <Legend wrapperStyle={{ color: chartTheme.legend, paddingTop: 14, fontSize: "12px" }} />
                        {selectedGenres.map((genre) => (
                          <Line
                            key={genre}
                            type="monotone"
                            dataKey={genre}
                            name={genre}
                            stroke={getColor(availableGenres.indexOf(genre))}
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            animationDuration={500}
                            animationEasing="ease-in-out"
                          />
                        ))}
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </section>

          {selectedGenres.length > 0 && chartData.length > 0 && (
            <section
              className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg backdrop-blur-sm animate-fade-in-up transition-all duration-300 dark:border-gray-600/50 dark:bg-gray-800/90"
              aria-labelledby="genre-trends-ai-spotlight-title"
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
                          id="genre-trends-ai-spotlight-title"
                          className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
                        >
                          {t("aiSpotlightTitle")}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          {t("aiSpotlightHint")}
                          {displayAiCommentary &&
                            ((summaryVersion === "technical" &&
                              aiCommentary?.commentaryCached) ||
                              (summaryVersion === "light" &&
                                aiCommentary?.commentaryLightCached)) && (
                              <span className="ml-1">{t("aiCached")}</span>
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
                      <div className="h-4 rounded bg-gray-100 w-full max-w-3xl dark:bg-gray-700" />
                      <div className="h-4 rounded bg-gray-100 w-full max-w-2xl dark:bg-gray-700" />
                      <div className="h-4 rounded bg-gray-100 w-4/5 max-w-xl dark:bg-gray-700" />
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
                    <p className="text-gray-800/90 leading-relaxed whitespace-pre-line dark:text-gray-100/90">
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

          {/* Genres en hausse / baisse */}
          {selectedGenres.length > 0 && (rising.length > 0 || declining.length > 0) && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-lg backdrop-blur-sm dark:border-gray-600/50 dark:bg-gray-800/90">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-emerald via-accent-violet to-transparent opacity-70" />
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">↑</span>
                  {t("rising")}
                </h2>
                <ul className="space-y-2">
                  {rising.map((r) => (
                    <li
                      key={r.genre}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-700/30"
                    >
                      <span className="min-w-0 truncate text-gray-900 dark:text-white">
                        {r.genre}
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
                      key={r.genre}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-700/30"
                    >
                      <span className="min-w-0 truncate text-gray-900 dark:text-white">
                        {r.genre}
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

function GenreTrendsFallback() {
  const searchParams = useSearchParams();
  const period = getPeriodFromSearchParams(searchParams, "month");
  const badgeLabel = useGenreTrendsBadgeLabel();
  const genresHref = useGenresListHref();
  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 w-64 animate-pulse rounded-xl border border-white/10 bg-white/10" />
      </div>
      <div className="mt-6 space-y-12">
        <GenreTrendsHeroFrame
          genresHref={genresHref}
          subtitleKey="subtitle"
          badgeLabel={badgeLabel}
          panel={<GenreTrendsHeroPanel period={period} selectedCount={0} />}
        />
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function GenreTrendsPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<GenreTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
