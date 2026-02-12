"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";

/** Number of insights to show in the overview widget */
const PREVIEW_INSIGHTS_COUNT = 3;

/**
 * Small overview widget showing AI insights preview.
 * Displays first few insights with link to full page.
 */
export function AiInsightsSummaryWidget() {
  const t = useTranslations("ai-insights");
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const effectiveRange = useMemo(() => {
    if (startDateParam && endDateParam) {
      return { startDate: startDateParam, endDate: endDateParam };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [startDateParam, endDateParam]);

  const { data, isLoading } = useAiInsights(
    effectiveRange.startDate,
    effectiveRange.endDate
  );

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card animate-pulse">
        <div className="p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!data || !data.insights.length) {
    return null;
  }

  const previewInsights = data.insights.slice(0, PREVIEW_INSIGHTS_COUNT);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("subtitleShort")}
            </p>
          </div>
          <Link
            href="/dashboard/ai-insights"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
              text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
              transition-colors duration-200"
          >
            {t("seeMore")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="p-6">
        <ul className="space-y-3">
          {previewInsights.map((insight, index) => (
            <li
              key={index}
              className="flex gap-3 text-sm text-gray-600 dark:text-gray-400"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-violet/20 text-accent-violet text-xs font-semibold">
                {index + 1}
              </span>
              <span className="leading-relaxed">{insight}</span>
            </li>
          ))}
        </ul>
        {data.cached && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            {t("cached")}
          </p>
        )}
      </div>
    </div>
  );
}
