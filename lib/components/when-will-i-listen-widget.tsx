"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useListeningHabitPrediction } from "@/lib/hooks/use-listening-habit-prediction";
import type { ListeningHabitApiResponse } from "@/lib/hooks/use-listening-habit-prediction";
import type { InsufficientDataResponse } from "@/lib/dto/predictions";

function isInsufficientData(
  data: ListeningHabitApiResponse
): data is InsufficientDataResponse {
  return "insufficientData" in data && data.insufficientData === true;
}

function PredictionContent({
  data,
}: {
  data: ListeningHabitApiResponse & { timeWindow: { label: string }; confidenceScore: number; predictedGenre: string };
}) {
  const t = useTranslations("when-will-i-listen");
  const hasExplanation = "aiExplanation" in data && data.aiExplanation;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-accent-violet/10 dark:bg-accent-violet/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-violet dark:text-accent-violet/90">
            {t("predictedSlot")}
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
            {data.timeWindow.label}
          </p>
        </div>
        <div className="rounded-lg bg-accent-rose/10 dark:bg-accent-rose/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-rose dark:text-accent-rose/90">
            {t("probableGenre")}
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white truncate">
            {data.predictedGenre}
          </p>
        </div>
        <div className="rounded-lg bg-accent-cyan/10 dark:bg-accent-cyan/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-accent-cyan dark:text-accent-cyan/90">
            {t("confidence")}
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
            {data.confidenceScore}%
          </p>
        </div>
      </div>

      {hasExplanation && (
        <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-accent-violet hover:text-accent-violet/80 dark:text-accent-violet transition-colors"
          >
            {expanded ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                {t("hideExplanation")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {t("showExplanation")}
              </>
            )}
          </button>
          {expanded && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {data.aiExplanation}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-500">
        {t("predictionDisclaimer")}
      </p>
    </div>
  );
}

export function WhenWillIListenWidget({
  includeExplanation = false,
}: {
  includeExplanation?: boolean;
}) {
  const t = useTranslations("when-will-i-listen");
  const { data, isLoading, error } = useListeningHabitPrediction({
    includeExplanation,
  });

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[200px]">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          <div className="mt-1 h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 shadow-card">
        <div className="border-b border-red-100 dark:border-red-900/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("title")}
              </h2>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {t("errorLoading")}
              </p>
            </div>
            <Link
              href="/dashboard/when-will-i-listen"
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
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (isInsufficientData(data)) {
    const insufficient = data;
    return (
      <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("title")}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {t("predictionSubtitle")}
              </p>
            </div>
            <Link
              href="/dashboard/when-will-i-listen"
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
        <div className="p-6">
          <div className="flex items-start gap-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4">
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
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {insufficient.message}
              </p>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                {t("listensAnalyzed", { actual: insufficient.actualListens, min: insufficient.minListensRecommended })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card">
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("title")}
              </h2>
              {"fromCache" in data && data.fromCache && (
                <span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {t("fromCache")}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {t("predictionSubtitleToday")}
            </p>
          </div>
          <Link
            href="/dashboard/when-will-i-listen"
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
      <div className="p-6">
        <PredictionContent data={data} />
      </div>
    </div>
  );
}
