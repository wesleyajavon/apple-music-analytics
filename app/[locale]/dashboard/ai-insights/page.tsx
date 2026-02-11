"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useCallback, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";

function AiInsightsContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("ai-insights");
  const emptyStatePresets = useEmptyStatePresets();
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;

  // Default to last 30 days if no range
  const effectiveRange = useMemo(() => {
    if (startDate && endDate) return { startDate, endDate };
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [startDate, endDate]);

  const { data, isLoading, error, refetch } = useAiInsights(
    effectiveRange.startDate,
    effectiveRange.endDate
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("loading")}
          </p>
        </header>

        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-pulse flex flex-col gap-3 w-full max-w-md">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("generating")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-3xl">
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

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("checkApiKey")}
        </p>
      </div>
    );
  }

  if (!data || !data.insights.length) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("noInsights")}
          </p>
        </header>

        <EmptyState
          {...emptyStatePresets.importData}
          message={t("notEnoughData")}
          description={t("importDescription")}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("insightsFromData")}
          {data.cached && (
            <span className="ml-2 text-accent-violet dark:text-accent-violet">
              {t("cached")}
            </span>
          )}
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
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
            {t("yourInsights")}
          </h2>
        </div>
        <div className="p-6">
          <ul className="space-y-4">
            {data.insights.map((insight, index) => (
              <li
                key={index}
                className="flex gap-3 text-gray-700 dark:text-gray-300"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-violet/20 text-accent-violet text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AiInsightsFallback() {
  const t = useTranslations("ai-insights");
  return (
    <div className="px-4 py-6 sm:px-0 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("loadingShort")}
        </p>
      </header>
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
        <div className="p-12">
          <div className="animate-pulse flex flex-col gap-3 w-full max-w-md">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AI Insights page - One-shot insight generator from aggregated analytics.
 * Displays 3-5 concise, data-grounded bullet points.
 */
export default function AiInsightsPage() {
  return (
    <Suspense fallback={<AiInsightsFallback />}>
      <AiInsightsContent />
    </Suspense>
  );
}
