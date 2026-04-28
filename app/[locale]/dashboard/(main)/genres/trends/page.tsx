"use client";

import {
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
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
import { useGenreTrends, useGenreTrendsCommentary } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { PeriodSelector, PeriodType } from "@/lib/components/period-selector";
import type { GenreTrendsDataPoint } from "@/lib/dto/genres";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { toast } from "sonner";
import { clearGenreBackfillBannerBlockingPrefs } from "@/lib/utils/genre-backfill-banner-prefs";
import { TrendingUp } from "lucide-react";

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

const MAX_SERIES_GENRES = 30;
const GENRE_FILTER_PAGE_SIZE = 30;

const GENRE_RAIL_CLASS = "bg-gradient-to-r from-indigo-400 via-rose-400 to-amber-300";
const GENRES_TRENDS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-indigo-400/25 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.34),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_48%,_#312e81_100%)] px-6 py-8 shadow-2xl shadow-indigo-950/35 sm:px-8 sm:py-10";
const GENRE_TRENDS_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-indigo-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card transition-shadow duration-300 hover:shadow-card-hover dark:border-indigo-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.12),_transparent_30%),rgb(var(--card-rgb)/0.9)]";
const GROUP_BY_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 bg-surface-glass border-b border-indigo-200/30 dark:border-indigo-400/15 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 shadow-[0_1px_0_0_rgb(129_140_248_/_0.22)] backdrop-blur-md";
const TRENDS_CTA_CLASS =
  "inline-flex min-h-[44px] w-fit shrink-0 items-center justify-center rounded-full border border-indigo-100/30 bg-white/95 px-5 py-2.5 text-sm font-semibold text-indigo-950 shadow-lg shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

function useGenresListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/genres?${qs}` : "/dashboard/genres";
  }, [searchParams]);
}

function GenreTrendsHero({
  genresHref,
  subtitleKey,
}: {
  genresHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
}) {
  const t = useTranslations("genreTrends");
  return (
    <div className={GENRES_TRENDS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(129,140,248,0.11)_1px,_transparent_1px),linear-gradient(90deg,_rgba(251,191,36,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-rose-400/20 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-indigo-400/18 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${GENRE_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <TrendingUp className="h-9 w-9 shrink-0 text-indigo-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${GENRE_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(129,140,248,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-indigo-100/90 sm:text-lg">{t(subtitleKey)}</p>
        </div>
        <Link href={genresHref} className={TRENDS_CTA_CLASS}>
          {t("backToGenres")}
        </Link>
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

type GroqEligibility = {
  unknownTrackCount: number;
  unknownRatio: number;
  totalTrackCount: number;
  groqConfigured: boolean;
};

type GroqJobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

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
  const t = useTranslations("genreTrends");
  const tConsent = useTranslations("onboarding.genreLlmConsent");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = (searchParams.get("period") || "month") as PeriodType;

  // Quand "All" est sélectionné (pas de dates dans l'URL), passer undefined
  // pour que l'API utilise la plage réelle min/max de la DB
  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const genresHref = useGenresListHref();

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
  const [groqMeta, setGroqMeta] = useState<{
    loaded: boolean;
    eligibility: GroqEligibility | null;
    jobStatus: GroqJobStatus | null;
  }>({ loaded: false, eligibility: null, jobStatus: null });
  const [groqStarting, setGroqStarting] = useState(false);

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

  useEffect(() => {
    if (userId) {
      setGroqMeta({ loaded: true, eligibility: null, jobStatus: null });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/user/onboarding/import/genre-backfill/status");
        const data = (await res.json().catch(() => ({}))) as {
          eligibility?: GroqEligibility;
          job?: { status: GroqJobStatus } | null;
        };
        if (cancelled) return;
        if (!res.ok) {
          setGroqMeta({ loaded: true, eligibility: null, jobStatus: null });
          return;
        }
        setGroqMeta({
          loaded: true,
          eligibility: data.eligibility ?? null,
          jobStatus: data.job?.status ?? null,
        });
      } catch {
        if (!cancelled) {
          setGroqMeta({ loaded: true, eligibility: null, jobStatus: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshGroqMeta = useCallback(async () => {
    if (userId) return;
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status");
      const data = (await res.json().catch(() => ({}))) as {
        eligibility?: GroqEligibility;
        job?: { status: GroqJobStatus } | null;
      };
      if (!res.ok) return;
      setGroqMeta({
        loaded: true,
        eligibility: data.eligibility ?? null,
        jobStatus: data.job?.status ?? null,
      });
    } catch {
      /* ignore */
    }
  }, [userId]);

  const startGroqBackfill = useCallback(async () => {
    setGroqStarting(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data?.error ?? tConsent("startError"));
        return;
      }
      clearGenreBackfillBannerBlockingPrefs();
      toast.success(tConsent("startedToast"));
      await refreshGroqMeta();
      window.setTimeout(() => {
        document.getElementById("genre-backfill-global-badge-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch {
      toast.error(tConsent("startError"));
    } finally {
      setGroqStarting(false);
    }
  }, [refreshGroqMeta, tConsent]);

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

  if (isLoading) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
        </div>
        <div className="mt-6 space-y-6">
          <GenreTrendsHero genresHref={genresHref} subtitleKey="subtitleExtended" />
          <GenreTrendsSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" />
        </div>
        <div className="mt-6 space-y-6">
          <GenreTrendsHero genresHref={genresHref} subtitleKey="subtitleExtended" />
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!data || (chartData.length === 0 && availableGenres.length === 0)) {
    return (
      <>
        <div className={GROUP_BY_BAR_CLASS}>
          <PeriodSelector defaultPeriod="month" />
        </div>
        <div className="mt-6 space-y-6">
          <GenreTrendsHero genresHref={genresHref} subtitleKey="subtitleExtended" />
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
        <PeriodSelector defaultPeriod="month" />
      </div>

      <div className="mt-6 space-y-6">
        <GenreTrendsHero genresHref={genresHref} subtitleKey="subtitleExtended" />
        <div className="max-w-3xl rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
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
            <div className="mt-2 space-y-2 border-t border-amber-200/70 pt-2.5 dark:border-amber-800/50">
              <p>
                {t.rich("chartGenreAccuracyGroq", {
                  aiLabel: (chunks) => <span className="font-semibold">{chunks}</span>,
                })}
              </p>
              {userId == null && groqMeta.loaded && groqMeta.eligibility ? (
                <>
                  {!groqMeta.eligibility.groqConfigured ? (
                    <p className="text-xs font-medium">{tConsent("missingKey")}</p>
                  ) : groqMeta.eligibility.unknownTrackCount === 0 ? (
                    <p className="text-xs">{t("groqStartNoUnknown")}</p>
                  ) : groqMeta.jobStatus === "pending" ||
                    groqMeta.jobStatus === "running" ||
                    groqMeta.jobStatus === "paused" ? (
                    <p className="text-xs">
                      <span>{t("groqSessionRunningHint")} </span>
                      <a
                        href="#genre-backfill-global-badge-panel"
                        className="font-semibold underline underline-offset-2 hover:opacity-90"
                      >
                        {t("groqProgressAnchor")}
                      </a>
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs">{tConsent("privacy")}</p>
                      <button
                        type="button"
                        disabled={groqStarting}
                        onClick={() => void startGroqBackfill()}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-accent-violet px-3 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {groqStarting ? tConsent("starting") : tConsent("accept")}
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>

        <div className="space-y-6">
          {/* Sélection des genres */}
          <div className={GENRE_TRENDS_PANEL_CLASS}>
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${GENRE_RAIL_CLASS} opacity-80`} />
            <div className="relative z-10 border-b border-indigo-200/25 px-4 py-4 dark:border-indigo-400/15 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className={`h-2 w-2 rounded-full ${GENRE_RAIL_CLASS} shadow-[0_0_14px_rgb(129_140_248_/_0.4)]`} aria-hidden />
                {t("genresToDisplay")}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-indigo-200/35 bg-indigo-50/80 px-2.5 py-1 text-xs text-indigo-950 tabular-nums dark:border-indigo-400/25 dark:bg-surface-glass dark:text-indigo-100/90">
                  {t("selectionCount", {
                    selected: selectedGenres.length,
                    max: MAX_SERIES_GENRES,
                  })}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded-lg border border-indigo-200/40 bg-white/70 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-indigo-50/90 dark:border-indigo-400/25 dark:bg-surface-glass dark:hover:bg-indigo-950/30"
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
            </div>
            <div className="relative z-10 space-y-3 p-4 pt-3 sm:p-6 sm:pt-3">
            {availableGenres.length > GENRE_FILTER_PAGE_SIZE && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-card-border bg-surface/60 px-3 py-2">
                <div className="text-xs text-muted">
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
                    className="rounded-lg border border-card-border bg-surface-glass px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="rounded-lg border border-card-border bg-surface-glass px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("paginationNext")}
                  </button>
                </div>
              </div>
            )}
            <div className="flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-card-border bg-surface/60 p-2">
              {visibleGenres.map((genre) => {
                const selected = selectedGenres.includes(genre);
                const disabled = !selected && selectedGenres.length >= MAX_SERIES_GENRES;
                const idx = availableGenres.indexOf(genre);
                return (
                  <label
                    key={genre}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                      selected
                        ? "border-accent-violet/30 bg-accent-violet/10 text-foreground shadow-sm"
                        : "border-card-border bg-card-surface text-foreground hover:bg-surface-glass"
                    } ${
                      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleGenre(genre)}
                      className="rounded border-card-border text-primary focus:ring-ring disabled:opacity-40"
                    />
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: selected ? getColor(idx) : "transparent",
                        border: selected ? "none" : "1px solid #9ca3af",
                      }}
                    />
                    <span className="text-sm text-foreground">
                      {genre}
                    </span>
                  </label>
                );
              })}
            </div>
            </div>
          </div>

          {/* Résumé IA — mêmes filtres que le graphique */}
          {selectedGenres.length > 0 && chartData.length > 0 && (
            <section
              className="relative overflow-hidden rounded-2xl border border-card-border bg-card-surface shadow-card backdrop-blur-sm animate-fade-in-up transition-all duration-300"
              aria-labelledby="genre-trends-ai-spotlight-title"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand-gradient opacity-70" />
              <div className="relative">
                <div className="border-b border-card-border px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-card-border bg-surface-glass text-accent-violet">
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
                          className="text-xl font-bold tracking-tight text-foreground"
                        >
                          {t("aiSpotlightTitle")}
                        </h2>
                        <p className="text-sm text-muted mt-0.5">
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
                        className="flex rounded-lg border border-card-border bg-surface-glass p-1"
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
                              ? "bg-card-surface text-accent-violet shadow-sm"
                              : "text-muted hover:text-foreground"
                          }`}
                        >
                          {t("summaryVersionLight")}
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={summaryVersion === "technical"}
                          onClick={() => setSummaryVersion("technical")}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            summaryVersion === "technical"
                              ? "bg-card-surface text-accent-violet shadow-sm"
                              : "text-muted hover:text-foreground"
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
                      <div className="h-4 bg-surface rounded w-full max-w-3xl" />
                      <div className="h-4 bg-surface rounded w-full max-w-2xl" />
                      <div className="h-4 bg-surface rounded w-4/5 max-w-xl" />
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
                    <p className="text-sm text-muted">
                      {t("aiUnavailable")}
                    </p>
                  ) : hasDisplayableAiParagraph ? (
                    <p className="text-foreground/85 leading-relaxed whitespace-pre-line">
                      {displayAiCommentary}
                    </p>
                  ) : (
                    <p className="text-sm text-muted">
                      {t("aiEmpty")}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Spotlight: Graphique multi-lignes — élément principal mis en avant */}
          <section
            className={`${GENRE_TRENDS_PANEL_CLASS} animate-fade-in-up transition-all duration-300`}
            aria-labelledby="genre-trends-spotlight-title"
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${GENRE_RAIL_CLASS} opacity-80`} />
            <div className="relative">
              <div className="border-b border-indigo-200/25 px-6 py-5 dark:border-indigo-400/15">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 id="genre-trends-spotlight-title" className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                      {t("evolution")}
                    </h2>
                    <p className="mt-0.5 text-sm text-indigo-800/85 dark:text-indigo-100/75">
                      {t("chartHint")}
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-indigo-200/35 bg-indigo-50/85 px-2.5 py-1 text-xs font-medium text-indigo-950 dark:border-indigo-400/25 dark:bg-surface-glass dark:text-indigo-100/90">
                    {t("selectionCount", { selected: selectedGenres.length, max: MAX_SERIES_GENRES })}
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-6 md:p-8">
                {selectedGenres.length === 0 ? (
                  <div className="rounded-xl border border-card-border bg-surface/60 px-6 py-10 text-center">
                    <p className="text-sm text-muted">
                      {t("selectAtLeastOne")}
                    </p>
                  </div>
                ) : (
                  <div className="relative min-h-[500px] rounded-xl border border-card-border bg-surface/60 p-3 shadow-inner">
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
                        {selectedGenres.map((genre) => (
                          <Line
                            key={genre}
                            type="monotone"
                            dataKey={genre}
                            name={genre}
                            stroke={getColor(availableGenres.indexOf(genre))}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            animationDuration={500}
                            animationEasing="ease-in-out"
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Genres en hausse / baisse */}
          {selectedGenres.length > 0 && (rising.length > 0 || declining.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-emerald via-accent-violet to-transparent opacity-70" />
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-accent-emerald/25 bg-accent-emerald/10 text-accent-emerald">↑</span>
                  {t("rising")}
                </h2>
                <ul className="space-y-2">
                  {rising.map((r) => (
                    <li
                      key={r.genre}
                      className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-surface/60 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-foreground">
                        {r.genre}
                      </span>
                      <span className="shrink-0 rounded-full bg-accent-emerald/10 px-2.5 py-1 font-medium tabular-nums text-accent-emerald">
                        +{r.deltaPercent}% ({r.delta > 0 ? "+" : ""}
                        {r.delta.toLocaleString(locale)} {t("listensDelta")})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-rose via-accent-violet to-transparent opacity-70" />
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-accent-rose/25 bg-accent-rose/10 text-accent-rose">↓</span>
                  {t("declining")}
                </h2>
                <ul className="space-y-2">
                  {declining.map((r) => (
                    <li
                      key={r.genre}
                      className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-surface/60 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-foreground">
                        {r.genre}
                      </span>
                      <span className="shrink-0 rounded-full bg-accent-rose/10 px-2.5 py-1 font-medium tabular-nums text-accent-rose">
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
  const genresHref = useGenresListHref();
  return (
    <>
      <div className={GROUP_BY_BAR_CLASS}>
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
      </div>
      <div className="mt-6 space-y-6">
        <GenreTrendsHero genresHref={genresHref} subtitleKey="subtitle" />
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function GenreTrendsPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<GenreTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
