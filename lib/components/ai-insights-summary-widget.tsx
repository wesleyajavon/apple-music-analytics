"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";

/** Number of insights to show in the overview widget */
const PREVIEW_INSIGHTS_COUNT = 3;

/**
 * Small overview widget showing AI insights preview.
 * Displays first few insights with link to full page.
 * Uses full listen range when "all" (tout) filter is selected.
 */
export function AiInsightsSummaryWidget() {
  const t = useTranslations("ai-insights");
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error } = useAiInsights(startDate, endDate);
  const isLoadingOrFetching = isRangeLoading || isLoading;

  if (isLoadingOrFetching) {
    return (
      <div
        className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[220px] flex flex-col"
        role="status"
        aria-label={t("loading")}
      >
        {/* Header skeleton — matches real layout */}
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer shrink-0" />
          </div>
        </div>
        {/* Content skeleton — 3 insight cards with staggered shimmer */}
        <div className="p-6 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t("loading")}</p>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex gap-3 p-3 -mx-1 rounded-lg border-l-4 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-800/50"
            >
              <div
                className="h-6 w-6 shrink-0 rounded-md bg-gray-200 dark:bg-gray-700 animate-shimmer"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div
                  className="h-3.5 w-full bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
                <div
                  className="h-3.5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AiWidgetQuotaOrError
        title={t("title")}
        subtitle={t("subtitleShort")}
        seeMoreHref="/dashboard/ai-insights"
        seeMoreLabel={t("seeMore")}
        error={error}
      />
    );
  }

  if (!data || !data.insights.length) {
    return null;
  }

  const previewInsights = data.insights.slice(0, PREVIEW_INSIGHTS_COUNT);
  const INSIGHT_ACCENTS = [
    "border-l-accent-violet bg-accent-violet/8",
    "border-l-accent-indigo bg-accent-indigo/8",
    "border-l-accent-cyan bg-accent-cyan/8",
  ] as const;

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card transition-shadow duration-300 hover:shadow-card-hover min-h-[220px] flex flex-col">
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("title")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t("subtitleShort")}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/ai-insights"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
              text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
              transition-colors duration-200 shrink-0"
          >
            {t("seeMore")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="p-6 space-y-3">
        {previewInsights.map((insight, index) => (
          <div
            key={index}
            className={`flex gap-3 p-3 -mx-1 rounded-lg border-l-4 transition-colors ${INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length]}`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 text-xs font-semibold">
              {index + 1}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1 min-w-0">
              {insight}
            </span>
          </div>
        ))}
        {data.cached && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-violet/60" aria-hidden />
            {t("cached")}
          </p>
        )}
      </div>
    </div>
  );
}
