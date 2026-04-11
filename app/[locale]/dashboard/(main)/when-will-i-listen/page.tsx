"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useListeningHabitPrediction } from "@/lib/hooks/use-listening-habit-prediction";
import type { ListeningHabitApiResponse } from "@/lib/hooks/use-listening-habit-prediction";
import type { InsufficientDataResponse } from "@/lib/dto/predictions";
import { ErrorState } from "@/lib/components/error-state";

function isInsufficientData(
  data: ListeningHabitApiResponse
): data is InsufficientDataResponse {
  return "insufficientData" in data && data.insufficientData === true;
}

/** Clock icon for prediction spotlight */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WhenWillIListenContent() {
  const t = useTranslations("when-will-i-listen");
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const { data, isLoading, error, refetch } = useListeningHabitPrediction({
    includeExplanation: true,
    userId,
  });

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const hasExplanation =
    data && !isInsufficientData(data) && "aiExplanation" in data && data.aiExplanation;
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-cyan/10 dark:from-accent-violet/20 dark:to-accent-cyan/20 border border-accent-violet/20 mb-6">
            <ClockIcon className="w-5 h-5 text-accent-violet" />
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("subtitle")}
          </p>
        </header>

        <div className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl min-h-[320px]">
          <div className="p-8 sm:p-12 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-shimmer" />
              <div className="space-y-2 flex-1">
                <div className="h-10 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
                <div className="h-5 w-64 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700 animate-shimmer"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
            <ClockIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t("spotlightBadge")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("subtitle")}
          </p>
        </header>
        <ErrorState
          error={error}
          message={t("errorLoading")}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!data || isInsufficientData(data)) {
    const insufficient = data as InsufficientDataResponse | undefined;
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-cyan/10 dark:from-accent-violet/20 dark:to-accent-cyan/20 border border-accent-violet/20 mb-6">
            <ClockIcon className="w-5 h-5 text-accent-violet" />
            <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
              {t("spotlightBadge")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("subtitle")}
          </p>
        </header>
        <div className="overflow-hidden rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 bg-white dark:bg-gray-800/95 shadow-card">
          <div className="p-6">
            <div className="flex items-start gap-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-5">
              <svg
                className="w-6 h-6 shrink-0 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t("insufficientData")}
                </p>
                {insufficient?.message && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    {insufficient.message}
                  </p>
                )}
                {insufficient && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    {t("listensAnalyzed", {
                      actual: insufficient.actualListens,
                      min: insufficient.minListensRecommended,
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const prediction = data;
  const { timeWindow, predictedGenre, confidenceScore } = prediction;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero section */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-cyan/10 dark:from-accent-violet/20 dark:to-accent-cyan/20 border border-accent-violet/20">
            <ClockIcon className="w-5 h-5 text-accent-violet" />
            <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
              {t("spotlightBadge")}
            </span>
          </div>
          {"fromCache" in prediction && prediction.fromCache && (
            <span className="px-2 py-0.5 rounded-full bg-accent-violet/20 text-accent-violet text-xs font-medium">
              {t("fromCache")}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      {/* Spotlight: main prediction — creative focal point */}
      <section
        className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40"
        aria-labelledby="when-will-i-listen-spotlight-title"
      >
        {/* Gradient spotlight — radial glow centered on the time display */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 35%, rgba(139, 92, 246, 0.12) 0%, rgba(34, 211, 238, 0.06) 40%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-80 dark:opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 100% 80% at 50% 45%, rgba(139, 92, 246, 0.08) 0%, transparent 60%)",
          }}
        />
        <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-24 bg-accent-violet/10 dark:bg-accent-violet/15 blur-3xl rounded-full" />

        <div className="relative">
          {/* Spotlight header with icon + title */}
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-cyan/20 text-accent-violet">
                <ClockIcon className="w-6 h-6" aria-hidden />
              </div>
              <div>
                <h2
                  id="when-will-i-listen-spotlight-title"
                  className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
                >
                  {t("spotlightTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("spotlightHint")}
                </p>
              </div>
            </div>
          </div>

          {/* Main focal point: predicted time slot — large, prominent */}
          <div className="px-6 sm:px-8 md:px-10 py-10 sm:py-12">
            <div className="text-center mb-10">
              <p className="text-xs font-medium uppercase tracking-widest text-accent-violet dark:text-accent-violet/90 mb-3">
                {t("predictedSlot")}
              </p>
              <p
                className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(139 92 246) 0%, rgb(34 211 238) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {timeWindow.label}
              </p>
            </div>

            {/* Supporting cards: genre + confidence — side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="overflow-hidden rounded-xl border-l-4 border-accent-rose bg-accent-rose/10 dark:bg-accent-rose/20 p-5 transition-all duration-300 hover:shadow-card-hover opacity-0 animate-fade-in-up"
                style={{ animationDelay: "100ms" }}
              >
                <p className="text-xs font-medium uppercase tracking-wider text-accent-rose dark:text-accent-rose/90">
                  {t("probableGenre")}
                </p>
                <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white truncate">
                  {predictedGenre}
                </p>
              </div>
              <div
                className="overflow-hidden rounded-xl border-l-4 border-accent-cyan bg-accent-cyan/10 dark:bg-accent-cyan/20 p-5 transition-all duration-300 hover:shadow-card-hover opacity-0 animate-fade-in-up"
                style={{ animationDelay: "180ms" }}
              >
                <p className="text-xs font-medium uppercase tracking-wider text-accent-cyan dark:text-accent-cyan/90">
                  {t("confidence")}
                </p>
                <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {confidenceScore}%
                </p>
              </div>
            </div>

            {/* AI explanation expand/collapse */}
            {hasExplanation && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/50">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-2 text-sm font-medium text-accent-violet hover:text-accent-violet/80 dark:text-accent-violet transition-colors"
                >
                  {expanded ? (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                      {t("hideExplanation")}
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      {t("showExplanation")}
                    </>
                  )}
                </button>
                {expanded && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {prediction.aiExplanation}
                  </p>
                )}
              </div>
            )}

            <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
              {t("predictionDisclaimer")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function WhenWillIListenFallback() {
  const t = useTranslations("when-will-i-listen");
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>
      <div className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl min-h-[320px]">
        <div className="p-8 sm:p-12 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-shimmer" />
            <div className="space-y-2 flex-1">
              <div className="h-10 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
              <div className="h-5 w-64 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700 animate-shimmer"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * When Will I Listen page — prediction of most likely listening slot for today.
 * Spotlight design puts the predicted time in the center of attention.
 */
export default function WhenWillIListenPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<WhenWillIListenFallback />}>
        <WhenWillIListenContent />
      </Suspense>
    </div>
  );
}
