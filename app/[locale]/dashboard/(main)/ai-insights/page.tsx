"use client";

import { useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";

/** Accent color variants for insight cards - creates visual variety */
const INSIGHT_ACCENTS = [
  { bg: "bg-accent-violet/12", border: "border-l-accent-violet", icon: "text-accent-violet", iconBg: "bg-accent-violet/15" },
  { bg: "bg-accent-indigo/12", border: "border-l-accent-indigo", icon: "text-accent-indigo", iconBg: "bg-accent-indigo/15" },
  { bg: "bg-accent-cyan/12", border: "border-l-accent-cyan", icon: "text-accent-cyan", iconBg: "bg-accent-cyan/15" },
  { bg: "bg-accent-emerald/12", border: "border-l-accent-emerald", icon: "text-accent-emerald", iconBg: "bg-accent-emerald/15" },
  { bg: "bg-accent-rose/12", border: "border-l-accent-rose", icon: "text-accent-rose", iconBg: "bg-accent-rose/15" },
] as const;

/** Spark/lightning icon for AI insights */
function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

/** Format date range for display */
function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function AiInsightsContent() {
  const t = useTranslations("ai-insights");
  const emptyStatePresets = useEmptyStatePresets();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error, refetch } = useAiInsights(startDate, endDate, {
    userId,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoadingOrFetching) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20 mb-6">
            <SparkIcon className="w-5 h-5 text-accent-violet" />
            <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
              {t("loading")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("generating")}
          </p>
        </header>

        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6"
            >
              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700 animate-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer w-full" />
                  <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer w-5/6" />
                  <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("errorLoading")}
          </p>
        </header>

        <ErrorState error={error} message={t("errorMessage")} onRetry={handleRetry} />

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t("checkApiKey")}</p>
      </div>
    );
  }

  if (!data || !data.insights.length) {
    return (
      <div className="max-w-4xl mx-auto">
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

  const dateRangeLabel = formatDateRange(startDate, endDate);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero section */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20">
            <SparkIcon className="w-5 h-5 text-accent-violet" />
            <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
              {t("insightsFromData")}
            </span>
            {data.cached && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-accent-violet/20 text-accent-violet text-xs font-medium">
                {t("cached")}
              </span>
            )}
          </div>
          {typeof data.rateLimit?.remaining === "number" && (
            <span className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
              {t("quotaRemaining", { count: data.rateLimit.remaining })}
            </span>
          )}
          {dateRangeLabel && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {dateRangeLabel}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("yourInsights")}
        </p>
      </header>

      {/* Spotlight: AI insights — carte principale avec gradient et effet de lumière */}
      <section
        className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40"
        aria-labelledby="ai-insights-spotlight-title"
      >
        {/* Gradient spotlight — lumière centrée sur la zone des insights */}
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
                <SparkIcon className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <h2 id="ai-insights-spotlight-title" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {t("spotlightTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("spotlightHint")}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8 md:p-10 space-y-4">
            {data.insights.map((insight, index) => {
              const accent = INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length];
              return (
                <div
                  key={index}
                  className={`
                    overflow-hidden rounded-xl border-l-4 border-gray-100 dark:border-gray-700/50
                    bg-white dark:bg-gray-800/90 shadow-card
                    transition-all duration-300 hover:shadow-card-hover
                    ${accent.border} ${accent.bg}
                    opacity-0 animate-fade-in-up
                  `}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="p-6 flex gap-4">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconBg} ${accent.icon}`}
                      aria-hidden
                    >
                      <SparkIcon className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {insight}
                      </p>
                    </div>
                    <span
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 text-sm font-semibold"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function AiInsightsFallback() {
  const t = useTranslations("ai-insights");
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("loadingShort")}
        </p>
      </header>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6"
          >
            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700 animate-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer w-full" />
                <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer w-5/6" />
                <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer w-4/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * AI Insights page - One-shot insight generator from aggregated analytics.
 * Displays 3-5 concise, data-grounded bullet points in styled cards.
 */
export default function AiInsightsPage() {
  return (
    <Suspense fallback={<AiInsightsFallback />}>
      <AiInsightsContent />
    </Suspense>
  );
}
