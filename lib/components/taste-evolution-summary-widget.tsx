"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTasteEvolution } from "@/lib/hooks/use-taste-evolution";
import type { WeekToWeekTrend, TrendClassification } from "@/lib/dto/taste-evolution";

const CLASSIFICATION_LABELS: Record<TrendClassification, string> = {
  expansion: "Expansion",
  consolidation: "Consolidation",
  exploration: "Exploration",
  regression: "Régression",
  stable: "Stable",
};

function truncateCommentary(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(" ");
  const end = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
  return truncated.slice(0, end) + "…";
}

/**
 * Small overview widget showing the most recent week-to-week taste evolution.
 * Displays classification, key metrics, and truncated AI commentary.
 */
export function TasteEvolutionSummaryWidget() {
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 21);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, []);

  const { data, isLoading } = useTasteEvolution(
    range.startDate,
    range.endDate
  );

  const latestTrend = useMemo(
    () => (data?.trends?.length ? data.trends[data.trends.length - 1] : null),
    [data?.trends]
  );

  const commentary = data?.commentary ?? null;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card animate-pulse">
        <div className="p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (!latestTrend) {
    return null;
  }

  const classificationLabel = CLASSIFICATION_LABELS[latestTrend.classification];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Évolution des goûts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {latestTrend.timeRange.label} vs {latestTrend.previousWeekRange.label}
            </p>
          </div>
          <Link
            href="/dashboard/taste-evolution"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
              text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
              transition-colors duration-200"
          >
            Voir plus
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-accent-violet/10 text-accent-violet">
            {classificationLabel}
          </span>
          <span
            className={`inline-flex items-center text-sm tabular-nums ${
              latestTrend.volumeDelta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Volume {latestTrend.volumeDelta >= 0 ? "+" : ""}
            {latestTrend.volumeDelta} ({latestTrend.volumeDeltaPct >= 0 ? "+" : ""}
            {latestTrend.volumeDeltaPct.toFixed(1)}%)
          </span>
          <span
            className={`inline-flex items-center text-sm tabular-nums ${
              latestTrend.diversityDelta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Diversité {latestTrend.diversityDelta >= 0 ? "+" : ""}
            {latestTrend.diversityDelta.toFixed(2)}
          </span>
        </div>
        {commentary && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {truncateCommentary(
              commentary.split("\n\n").filter(Boolean).pop() ?? commentary,
              220
            )}
          </p>
        )}
      </div>
    </div>
  );
}
