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
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedGenres([...availableGenres]);
  }, [availableGenres]);

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

  const headerBlock = (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {t("subtitle")}
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
        </div>
        <div className="mt-6">
          {headerBlock}
          <GenreTrendsSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
          <div className="h-10" />
        </div>
        <div className="mt-6">
          {headerBlock}
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
        <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
          <PeriodSelector defaultPeriod="month" />
        </div>
        <div className="mt-6">
          {headerBlock}
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
      <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
        <PeriodSelector defaultPeriod="month" />
      </div>

      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("subtitleExtended")}
          </p>
          <div className="mt-4 max-w-3xl rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
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
        </div>

        <div className="space-y-6">
          {/* Sélection des genres */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("genresToDisplay")}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t("all")}
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t("none")}
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableGenres.map((genre, idx) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <label
                    key={genre}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGenre(genre)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: selected ? getColor(idx) : "transparent",
                        border: selected ? "none" : "1px solid #9ca3af",
                      }}
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {genre}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Résumé IA — mêmes filtres que le graphique */}
          {selectedGenres.length > 0 && chartData.length > 0 && (
            <section
              className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300"
              aria-labelledby="genre-trends-ai-spotlight-title"
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
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
                        className="flex rounded-lg bg-gray-100 dark:bg-gray-700/50 p-1"
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
                              ? "bg-white dark:bg-gray-800 text-accent-violet shadow-sm"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                              ? "bg-white dark:bg-gray-800 text-accent-violet shadow-sm"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-3xl" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-2xl" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 max-w-xl" />
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
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
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

          {/* Spotlight: Graphique multi-lignes — élément principal mis en avant */}
          <section
            className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40"
            aria-labelledby="genre-trends-spotlight-title"
          >
            {/* Gradient spotlight — effet de lumière centré */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
              style={{
                background: "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-80 dark:opacity-60"
              style={{
                background: "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 60%)",
              }}
            />
            {/* Glow subtil en bas */}
            <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-24 bg-accent-violet/10 dark:bg-accent-violet/15 blur-3xl rounded-full" />

            <div className="relative">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div>
                    <h2 id="genre-trends-spotlight-title" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {t("evolution")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("chartHint")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 sm:p-8 md:p-10">
                {selectedGenres.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                    {t("selectAtLeastOne")}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        className="dark:stroke-gray-700"
                      />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        stroke="#6b7280"
                        className="dark:stroke-gray-400"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        stroke="#6b7280"
                        className="dark:stroke-gray-400"
                      />
                      <Tooltip content={<TrendsTooltip />} />
                      <Legend />
                      {selectedGenres.map((genre, idx) => (
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
                )}
              </div>
            </div>
          </section>

          {/* Genres en hausse / baisse */}
          {selectedGenres.length > 0 && (rising.length > 0 || declining.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-green-500">↑</span> {t("rising")}
                </h2>
                <ul className="space-y-2">
                  {rising.map((r) => (
                    <li
                      key={r.genre}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-800 dark:text-gray-200">
                        {r.genre}
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-medium tabular-nums">
                        +{r.deltaPercent}% ({r.delta > 0 ? "+" : ""}
                        {r.delta.toLocaleString(locale)} {t("listensDelta")})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-red-500">↓</span> {t("declining")}
                </h2>
                <ul className="space-y-2">
                  {declining.map((r) => (
                    <li
                      key={r.genre}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-800 dark:text-gray-200">
                        {r.genre}
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-medium tabular-nums">
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
  const t = useTranslations("genreTrends");
  return (
    <>
      <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse w-64" />
      </div>
      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </div>
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function GenreTrendsPage() {
  return (
    <Suspense fallback={<GenreTrendsFallback />}>
      <TrendsContent />
    </Suspense>
  );
}
