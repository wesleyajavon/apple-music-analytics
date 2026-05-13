"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useTasteEvolution } from "@/lib/hooks/use-taste-evolution";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import type { WeekToWeekTrend } from "@/lib/dto/taste-evolution";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";

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
  const t = useTranslations("taste-evolution");
  const viewerUserId = useDashboardViewerUserId();
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 21);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, []);

  const { data, isLoading, error } = useTasteEvolution(
    range.startDate,
    range.endDate,
    viewerUserId
  );
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  const seeMoreHref = useMemo(() => {
    const p = new URLSearchParams();
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `/dashboard/taste-evolution?${qs}` : "/dashboard/taste-evolution";
  }, [viewerUserId]);

  const latestTrend = useMemo(
    () => (data?.trends?.length ? data.trends[data.trends.length - 1] : null),
    [data?.trends]
  );

  const commentary = data?.commentaryLight ?? data?.commentary ?? null;

  if (isLoading) {
    return (
      <div
        className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[220px] flex flex-col"
        role="status"
        aria-label={t("loading")}
      >
        {/* Header skeleton — matches real layout */}
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-4 w-52 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer shrink-0" />
          </div>
        </div>
        {/* Content skeleton — badges + paragraph with staggered shimmer */}
        <div className="p-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t("loading")}</p>
          <div className="flex flex-wrap gap-3 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                style={{
                  width: i === 3 ? "70%" : "100%",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AiWidgetQuotaOrError
        title={t("title")}
        subtitle={t("spotlightHint")}
        seeMoreHref={seeMoreHref}
        seeMoreLabel={t("seeMore")}
        error={error}
      />
    );
  }

  if (!data || !latestTrend) {
    return null;
  }

  const classificationLabel = t(
    `classifications.${latestTrend.classification}` as "classifications.expansion"
  );

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card transition-shadow duration-300 hover:shadow-card-hover min-h-[220px] flex flex-col">
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {latestTrend.timeRange.label} vs {latestTrend.previousWeekRange.label}
            </p>
          </div>
          <Link
            href={seeMoreHref}
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
            {t("volume")} {latestTrend.volumeDelta >= 0 ? "+" : ""}
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
            {t("diversity")} {latestTrend.diversityDelta >= 0 ? "+" : ""}
            {latestTrend.diversityDelta.toFixed(2)}
          </span>
        </div>
        {commentary && !data.interactiveAiPausedForGenreClassification ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {truncateCommentary(
              commentary.split("\n\n").filter(Boolean).pop() ?? commentary,
              220
            )}
          </p>
        ) : null}
        {(data.interactiveAiPausedForGenreClassification ||
          (interactiveAiBlockedByGenreBackfill && !commentary)) &&
        !data.aiUnavailable ? (
          <div className="mt-2">
            <InteractiveAiGenreBackfillNotice
              force={Boolean(data.interactiveAiPausedForGenreClassification && !interactiveAiBlockedByGenreBackfill)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
