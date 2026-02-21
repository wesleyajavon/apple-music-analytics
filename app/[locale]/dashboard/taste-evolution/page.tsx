"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

function TrendCardHeader({
  trend,
  t,
  classificationColor,
  classificationLabel,
  isCollapsible,
  isExpanded,
  onToggle,
}: {
  trend: WeekToWeekTrend;
  t: (k: string) => string;
  classificationColor: string;
  classificationLabel: string;
  isCollapsible: boolean;
  isExpanded: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {trend.timeRange.label} {t("vs")} {trend.previousWeekRange.label}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {trend.currentWeekListens} {t("listens")} ({t("vs")} {trend.previousWeekListens})
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${classificationColor}`}
        >
          {classificationLabel}
        </span>
        {isCollapsible && (
          <span
            className={`inline-flex items-center text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>
    </>
  );

  const borderClass = !isCollapsible || isExpanded
    ? "border-b border-gray-100 dark:border-gray-700/50"
    : "";

  if (isCollapsible && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${borderClass}`}
        aria-expanded={isExpanded}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${borderClass}`}>
      {content}
    </div>
  );
}

function TrendCard({
  trend,
  t,
  isLastWeek,
}: {
  trend: WeekToWeekTrend;
  t: (k: string) => string;
  isLastWeek: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isLastWeek);
  const classificationColor = CLASSIFICATION_COLORS[trend.classification];
  const classificationLabel = t(`classifications.${trend.classification}`);
  const isCollapsible = !isLastWeek;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card overflow-hidden">
      <TrendCardHeader
        trend={trend}
        t={t}
        classificationColor={classificationColor}
        classificationLabel={classificationLabel}
        isCollapsible={isCollapsible}
        isExpanded={isExpanded}
        onToggle={isCollapsible ? () => setIsExpanded((prev) => !prev) : undefined}
      />

      {(isLastWeek || isExpanded) && (
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
      )}
    </div>
  );
}

function TasteEvolutionContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("taste-evolution");
  const emptyStatePresets = useEmptyStatePresets();
  const [summaryVersion, setSummaryVersion] = useState<"light" | "technical">("light");
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
      <div className="max-w-4xl mx-auto space-y-6">
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
      <div className="max-w-4xl mx-auto space-y-6">
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
      <div className="max-w-4xl mx-auto space-y-6">
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

  const hasCommentary = data.commentary || data.commentaryLight;
  const displayCommentary =
    summaryVersion === "light" && data.commentaryLight
      ? data.commentaryLight
      : (data.commentary ?? data.commentaryLight);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      {/* Spotlight: AI Summary — main info in the spotlight */}
      {hasCommentary && displayCommentary && (
        <section
          className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40"
          aria-labelledby="taste-evolution-spotlight-title"
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-80 dark:opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 60%)",
            }}
          />
          <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-24 bg-accent-violet/10 dark:bg-accent-violet/15 blur-3xl rounded-full" />

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
                      id="taste-evolution-spotlight-title"
                      className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
                    >
                      {t("spotlightTitle")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("spotlightHint")}
                      {data.commentaryCached && (
                        <span className="ml-1">{t("cached")}</span>
                      )}
                    </p>
                  </div>
                </div>
                {data.commentary && data.commentaryLight && (
                  <div
                    className="flex rounded-lg bg-gray-100 dark:bg-gray-700/50 p-1"
                    role="tablist"
                    aria-label={t("aiExplanation")}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={summaryVersion === "light"}
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
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {displayCommentary}
              </p>
            </div>
          </div>
        </section>
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
          {[...data.trends].reverse().map((trend, index) => (
            <TrendCard
              key={trend.timeRange.weekStart}
              trend={trend}
              t={t}
              isLastWeek={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TasteEvolutionFallback() {
  const t = useTranslations("taste-evolution");
  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
