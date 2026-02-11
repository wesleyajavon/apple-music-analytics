"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useTasteEvolution } from "@/lib/hooks/use-taste-evolution";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import type {
  WeekToWeekTrend,
  TrendClassification,
} from "@/lib/dto/taste-evolution";

const CLASSIFICATION_COLORS: Record<TrendClassification, string> = {
  expansion: "text-emerald-600 dark:text-emerald-400",
  consolidation: "text-amber-600 dark:text-amber-400",
  exploration: "text-violet-600 dark:text-violet-400",
  regression: "text-rose-600 dark:text-rose-400",
  stable: "text-gray-500 dark:text-gray-400",
};

function TrendCard({ trend, t }: { trend: WeekToWeekTrend; t: (k: string) => string }) {
  const classificationColor = CLASSIFICATION_COLORS[trend.classification];
  const classificationLabel = t(`classifications.${trend.classification}`);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {trend.timeRange.label} {t("vs")} {trend.previousWeekRange.label}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {trend.currentWeekListens} {t("listens")} ({t("vs")} {trend.previousWeekListens})
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${classificationColor}`}
        >
          {classificationLabel}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Volume & diversity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("volume")}
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                trend.volumeDelta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.volumeDelta >= 0 ? "+" : ""}
              {trend.volumeDelta} ({trend.volumeDeltaPct >= 0 ? "+" : ""}
              {trend.volumeDeltaPct.toFixed(1)}%)
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("diversity")}
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                trend.diversityDelta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.diversityDelta >= 0 ? "+" : ""}
              {trend.diversityDelta.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("genres")}
            </p>
            <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
              {trend.genreCountPrevious} → {trend.genreCountCurrent}
            </p>
          </div>
        </div>

        {/* Emerging / declining genres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trend.emergingGenres.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-emerald-500" aria-hidden>↑</span>
                {t("emergingGenres")}
              </h4>
              <ul className="space-y-1.5">
                {trend.emergingGenres.slice(0, 5).map((g) => (
                  <li
                    key={g.genre}
                    className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span>{g.genre}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{g.deltaPct.toFixed(1)} {t("pp")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trend.decliningGenres.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-rose-500" aria-hidden>↓</span>
                {t("decliningGenres")}
              </h4>
              <ul className="space-y-1.5">
                {trend.decliningGenres.slice(0, 5).map((g) => (
                  <li
                    key={g.genre}
                    className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span>{g.genre}</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                      {g.deltaPct.toFixed(1)} {t("pp")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Artist movements */}
        {trend.artistRankMovements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("artistMovements")}
            </h4>
            <ul className="space-y-1.5">
              {trend.artistRankMovements.slice(0, 5).map((a) => (
                <li
                  key={a.artistName}
                  className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>{a.artistName}</span>
                  <span
                    className={`font-medium tabular-nums ${
                      a.rankChange > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : a.rankChange < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-gray-500"
                    }`}
                  >
                    {a.previousRank
                      ? `#${a.previousRank} → #${a.currentRank}`
                      : `${t("newRank")} #${a.currentRank}`}
                    {a.rankChange !== 0 && (
                      <span className="ml-1">
                        ({a.rankChange > 0 ? "+" : ""}
                        {a.rankChange})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function TasteEvolutionContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("taste-evolution");
  const emptyStatePresets = useEmptyStatePresets();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const effectiveRange = useMemo(() => {
    if (startDateParam && endDateParam) {
      return { startDate: startDateParam, endDate: endDateParam };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 56);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [startDateParam, endDateParam]);

  const { data, isLoading, error, refetch } = useTasteEvolution(
    effectiveRange.startDate,
    effectiveRange.endDate
  );

  const handleRetry = () => refetch();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("loading")}
          </p>
        </header>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("errorLoading")}
          </p>
        </header>
        <ErrorState
          error={error}
          message={t("errorMessage")}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!data || data.trends.length === 0) {
    return (
      <div className="space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("emptySubtitle")}
          </p>
        </header>
        <EmptyState
          {...emptyStatePresets.importData}
          message={t("insufficientData")}
          description={t("importDescription")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      {/* AI Commentary */}
      {data.commentary && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                  />
                </svg>
              </span>
              {t("aiExplanation")}
              {data.commentaryCached && (
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {t("cached")}
                </span>
              )}
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {data.commentary}
            </p>
          </div>
        </div>
      )}

      {/* Skipped weeks notice */}
      {data.skippedWeeks.length > 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{t("skippedWeeks")} :</strong>{" "}
            {data.skippedWeeks.map((s) => `${s.weekStart} (${s.reason})`).join(" ; ")}
          </p>
        </div>
      )}

      {/* Trend cards */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("weeklyTrends")}
        </h2>
        <div className="space-y-6">
          {[...data.trends].reverse().map((trend) => (
            <TrendCard key={trend.timeRange.weekStart} trend={trend} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TasteEvolutionFallback() {
  const t = useTranslations("taste-evolution");
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("loadingShort")}
        </p>
      </header>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function TasteEvolutionPage() {
  return (
    <Suspense fallback={<TasteEvolutionFallback />}>
      <TasteEvolutionContent />
    </Suspense>
  );
}
