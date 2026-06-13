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
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { usePublicDemoSoundprintSnapshot } from "@/lib/hooks/use-public-demo-soundprint-snapshot";
import { useAiInsightsDemoCopy } from "@/lib/hooks/use-public-demo-ai-copy";
import { PublicDemoAiSignupCta } from "@/lib/components/public-demo-ai-signup-cta";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import {
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_HEADER_LINK_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OVERVIEW_STARTUP_SURFACE_BASE,
  OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS,
  OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS,
  OVERVIEW_STARTUP_WIDGET_TITLE_CLASS,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";
import { LiveStatusDot } from "@/lib/components/live-status-dot";

/** Number of insights to show in the overview widget */
const PREVIEW_INSIGHTS_COUNT = 3;

const INSIGHT_ACCENTS = [
  "border-l-cyan-600/85 dark:border-l-cyan-300/80",
  "border-l-violet-600/85 dark:border-l-violet-300/80",
  "border-l-emerald-600/85 dark:border-l-emerald-300/80",
] as const;

function AiInsightsPublicDemoTeaser() {
  const t = useTranslations("ai-insights");
  const viewerUserId = useDashboardViewerUserId();
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const { snapshot, isLoading: isSnapshotLoading } = usePublicDemoSoundprintSnapshot(
    startDate,
    endDate,
    viewerUserId,
    true
  );
  const demoInsights = useAiInsightsDemoCopy(snapshot);

  if (isRangeLoading || isSnapshotLoading) {
    return (
      <div
        className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}
        role="status"
        aria-label={t("loading")}
      >
        <OverviewStartupSurfaceBg />
        <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
          <div className="h-8 w-3/4 max-w-sm rounded-lg bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a]" />
        </div>
        <div className="relative flex-1 space-y-3 p-6 sm:p-8">
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-shimmer rounded-xl bg-slate-200/80 dark:bg-[#252836]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (demoInsights.length === 0) {
    return null;
  }

  return (
    <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}>
      <OverviewStartupSurfaceBg />
      <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
        <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
          <LiveStatusDot />
          {t("heroEyebrow")}
        </div>
        <h2 className={OVERVIEW_STARTUP_WIDGET_TITLE_CLASS}>{t("title")}</h2>
        <p className={OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS}>{t("subtitleShort")}</p>
      </div>
      <div className="relative flex-1 space-y-3 p-6 sm:p-8">
        <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
          <div className="space-y-3">
            {demoInsights.map((insight, index) => (
              <div
                key={index}
                className={`flex gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm backdrop-blur dark:border-white/[0.06] dark:bg-[#0f111a] dark:shadow-none ${INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length]}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-800 dark:border-white/[0.08] dark:bg-[#1a1d2a] dark:text-cyan-100">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {insight}
                </span>
              </div>
            ))}
          </div>
        </div>
        <PublicDemoAiSignupCta variant="light" />
      </div>
    </div>
  );
}

/**
 * Small overview widget showing AI insights preview.
 * Displays first few insights with link to full page.
 * Uses full listen range when "all" (tout) filter is selected.
 */
export function AiInsightsSummaryWidget() {
  const t = useTranslations("ai-insights");
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error } = useAiInsights(startDate, endDate, {
    insightStyle: "human",
    userId: viewerUserId,
    enabled: !isPublicDemoViewer,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  const seeMoreHref = useMemo(() => {
    const p = new URLSearchParams();
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `/dashboard/ai-insights?${qs}` : "/dashboard/ai-insights";
  }, [viewerUserId]);

  if (isPublicDemoViewer) {
    return <AiInsightsPublicDemoTeaser />;
  }

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return (
      <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}>
        <OverviewStartupSurfaceBg />
        <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
          <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
            <LiveStatusDot />
            {t("heroEyebrow")}
          </div>
          <h2 className={OVERVIEW_STARTUP_WIDGET_TITLE_CLASS}>{t("title")}</h2>
          <p className={OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS}>{t("subtitleShort")}</p>
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
        <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-6 w-40 rounded-full bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a]" />
              <div className="h-8 w-3/4 max-w-sm rounded-lg bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a]" />
              <div className="h-4 w-2/3 max-w-md rounded-lg bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a]" />
            </div>
            <div className="h-11 w-28 shrink-0 rounded-2xl bg-slate-200/80 animate-shimmer dark:bg-[#1a1d2a] sm:self-start" />
          </div>
        </div>
        <div className="relative flex-1 space-y-3 p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("loading")}
          </p>
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-slate-200/80 border-l-4 border-l-slate-300/80 bg-slate-100/50 p-3 dark:border-white/[0.06] dark:border-l-white/20 dark:bg-[#0f111a]"
                >
                  <div
                    className="h-6 w-6 shrink-0 rounded-md bg-slate-200/80 animate-shimmer dark:bg-[#252836]"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      className="h-3.5 w-full rounded bg-slate-200/80 animate-shimmer dark:bg-[#252836]"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                    <div
                      className="h-3.5 w-4/5 rounded bg-slate-200/80 animate-shimmer dark:bg-[#252836]"
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
          <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
            <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
              <LiveStatusDot />
              {t("heroEyebrow")}
            </div>
            <h2 className={OVERVIEW_STARTUP_WIDGET_TITLE_CLASS}>{t("title")}</h2>
            <p className={OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS}>{t("subtitleShort")}</p>
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

  return (
    <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col animate-fade-in-up`}>
      <OverviewStartupSurfaceBg />
      <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
              <LiveStatusDot />
              {t("heroEyebrow")}
            </div>
            <h2 className={OVERVIEW_STARTUP_WIDGET_TITLE_CLASS}>{t("title")}</h2>
            <p className={OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS}>{t("subtitleShort")}</p>
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
                className={`flex gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm backdrop-blur dark:border-white/[0.06] dark:bg-[#0f111a] dark:shadow-none ${INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length]}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-800 dark:border-white/[0.08] dark:bg-[#1a1d2a] dark:text-cyan-100">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {insight}
                </span>
              </div>
            ))}
          </div>
        </div>
        {data.cached ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500/80 dark:bg-cyan-300/70" aria-hidden />
            {t("cached")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
