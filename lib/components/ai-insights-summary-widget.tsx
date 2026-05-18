"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { AiFeatureDisabledPlaceholder } from "@/lib/components/ai-feature-disabled-placeholder";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import {
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_HEADER_LINK_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OVERVIEW_STARTUP_SURFACE_BASE,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";

/** Number of insights to show in the overview widget */
const PREVIEW_INSIGHTS_COUNT = 3;

/**
 * Small overview widget showing AI insights preview.
 * Displays first few insights with link to full page.
 * Uses full listen range when "all" (tout) filter is selected.
 */
export function AiInsightsSummaryWidget() {
  const t = useTranslations("ai-insights");
  const viewerUserId = useDashboardViewerUserId();
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error } = useAiInsights(startDate, endDate, {
    insightStyle: "human",
    userId: viewerUserId,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  const seeMoreHref = useMemo(() => {
    const p = new URLSearchParams();
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `/dashboard/ai-insights?${qs}` : "/dashboard/ai-insights";
  }, [viewerUserId]);

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return (
      <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}>
        <OverviewStartupSurfaceBg />
        <div className="relative border-b border-white/10 px-6 py-5 sm:px-8">
          <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{t("title")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t("subtitleShort")}</p>
        </div>
        <div className="relative flex-1 p-6 sm:p-8">
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <InteractiveAiGenreBackfillNotice />
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingOrFetching) {
    return (
      <div
        className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}
        role="status"
        aria-label={t("loading")}
      >
        <OverviewStartupSurfaceBg />
        <div className="relative border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-6 w-40 rounded-full bg-white/10 animate-shimmer" />
              <div className="h-8 w-3/4 max-w-sm rounded-lg bg-white/10 animate-shimmer" />
              <div className="h-4 w-2/3 max-w-md rounded-lg bg-white/10 animate-shimmer" />
            </div>
            <div className="h-11 w-28 shrink-0 rounded-2xl bg-white/10 animate-shimmer sm:self-start" />
          </div>
        </div>
        <div className="relative flex-1 space-y-3 p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{t("loading")}</p>
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-white/10 border-l-4 border-l-white/25 bg-white/[0.06] p-3"
                >
                  <div
                    className="h-6 w-6 shrink-0 rounded-md bg-white/10 animate-shimmer"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      className="h-3.5 w-full rounded bg-white/10 animate-shimmer"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                    <div
                      className="h-3.5 w-4/5 rounded bg-white/10 animate-shimmer"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    if (isGroqGenreClassificationBlockingError(error)) {
      return (
        <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}>
          <OverviewStartupSurfaceBg />
          <div className="relative border-b border-white/10 px-6 py-5 sm:px-8">
            <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
              {t("heroEyebrow")}
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{t("title")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t("subtitleShort")}</p>
          </div>
          <div className="relative flex-1 p-6 sm:p-8">
            <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
              <InteractiveAiGenreBackfillNotice force />
            </div>
          </div>
        </div>
      );
    }
    return (
      <AiWidgetQuotaOrError
        title={t("title")}
        subtitle={t("subtitleShort")}
        seeMoreHref={seeMoreHref}
        seeMoreLabel={t("seeMore")}
        error={error}
        surface="startup"
        eyebrow={t("heroEyebrow")}
      />
    );
  }

  if (data?.aiUnavailable) {
    return (
      <AiFeatureDisabledPlaceholder
        title={t("title")}
        subtitle={t("subtitleShort")}
        seeMoreHref={seeMoreHref}
        seeMoreLabel={t("seeMore")}
        reason={data.aiUnavailableReason ?? "client"}
        surface="startup"
        eyebrow={t("heroEyebrow")}
      />
    );
  }

  if (!data || !data.insights.length) {
    return null;
  }

  const previewInsights = data.insights.slice(0, PREVIEW_INSIGHTS_COUNT);
  const INSIGHT_ACCENTS = [
    "border-l-cyan-300/80",
    "border-l-violet-300/80",
    "border-l-emerald-300/80",
  ] as const;

  return (
    <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}>
      <OverviewStartupSurfaceBg />
      <div className="relative border-b border-white/10 px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
              {t("heroEyebrow")}
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{t("title")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t("subtitleShort")}</p>
          </div>
          <Link href={seeMoreHref} className={OVERVIEW_STARTUP_HEADER_LINK_CLASS}>
            {t("seeMore")}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="relative flex-1 space-y-3 p-6 sm:p-8">
        <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
          <div className="space-y-3">
            {previewInsights.map((insight, index) => (
              <div
                key={index}
                className={`flex gap-3 rounded-xl border border-white/10 border-l-4 bg-white/[0.06] p-3 backdrop-blur ${INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length]}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-xs font-semibold text-cyan-100">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-200">{insight}</span>
              </div>
            ))}
          </div>
        </div>
        {data.cached ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-300/70" aria-hidden />
            {t("cached")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
