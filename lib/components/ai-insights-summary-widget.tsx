"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { ErrorState } from "@/lib/components/error-state";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { usePublicDemoSoundprintSnapshot } from "@/lib/hooks/use-public-demo-soundprint-snapshot";
import { useAiInsightsDemoCopy } from "@/lib/hooks/use-public-demo-ai-copy";
import { PublicDemoAiSignupCta } from "@/lib/components/public-demo-ai-signup-cta";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import { AiSummaryUnsortedGenresNotice } from "@/lib/components/ai-summary-unsorted-genres-notice";
import { OverviewCanvasFrame } from "@/lib/components/overview-section";
import { DASHBOARD_LIST_ROW, DASHBOARD_LIST_SEPARATOR } from "@/lib/components/dashboard-ui";
import { AiUnavailableConsentActions, useAiUnavailableCopy } from "@/lib/components/ai-unavailable-cta";

const PREVIEW_INSIGHTS_COUNT = 3;

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
      <OverviewCanvasFrame
        eyebrow={t("overviewWidget.eyebrow")}
        title={t("overviewWidget.title")}
        description={t("overviewWidget.description")}
        titleId="overview-ai-insights-title"
      >
        <div role="status" aria-label={t("loading")} className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
              <div className="h-4 w-full rounded bg-black/10 animate-shimmer dark:bg-white/10" />
            </div>
          ))}
        </div>
      </OverviewCanvasFrame>
    );
  }

  if (demoInsights.length === 0) {
    return null;
  }

  return (
    <OverviewCanvasFrame
      eyebrow={t("overviewWidget.eyebrow")}
      title={t("overviewWidget.title")}
      description={t("overviewWidget.description")}
      titleId="overview-ai-insights-title"
    >
      {demoInsights.map((insight, index) => (
        <div key={index} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} items-start`}>
          <span className="w-6 shrink-0 text-[13px] tabular-nums text-muted">{index + 1}</span>
          <span className="min-w-0 flex-1 text-[13px] leading-6 text-foreground">{insight}</span>
        </div>
      ))}
      <div className="mt-4">
        <PublicDemoAiSignupCta variant="light" />
      </div>
    </OverviewCanvasFrame>
  );
}

export function AiInsightsSummaryWidget() {
  const t = useTranslations("ai-insights");
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error } = useAiInsights(startDate, endDate, {
    userId: viewerUserId,
    enabled: !isPublicDemoViewer,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();
  const unavailableCopy = useAiUnavailableCopy(data?.aiUnavailableReason ?? "client");

  const seeMoreHref = useMemo(() => {
    const p = new URLSearchParams();
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `/dashboard/ai-insights?${qs}` : "/dashboard/ai-insights";
  }, [viewerUserId]);

  const chrome = {
    eyebrow: t("overviewWidget.eyebrow"),
    title: t("overviewWidget.title"),
    description: t("overviewWidget.description"),
    titleId: "overview-ai-insights-title",
    seeMoreHref,
    seeMoreLabel: t("seeMore"),
  };

  if (isPublicDemoViewer) {
    return <AiInsightsPublicDemoTeaser />;
  }

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return (
      <OverviewCanvasFrame {...chrome}>
        <InteractiveAiGenreBackfillNotice />
      </OverviewCanvasFrame>
    );
  }

  if (isLoadingOrFetching) {
    return (
      <OverviewCanvasFrame {...chrome}>
        <div role="status" aria-label={t("loading")} className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
              <div className="h-4 w-full rounded bg-black/10 animate-shimmer dark:bg-white/10" />
            </div>
          ))}
        </div>
      </OverviewCanvasFrame>
    );
  }

  if (error) {
    if (isGroqGenreClassificationBlockingError(error)) {
      return (
        <OverviewCanvasFrame {...chrome}>
          <InteractiveAiGenreBackfillNotice force />
        </OverviewCanvasFrame>
      );
    }
    return (
      <OverviewCanvasFrame {...chrome}>
        <ErrorState error={error} message={t("overviewWidget.description")} />
      </OverviewCanvasFrame>
    );
  }

  if (data?.aiUnavailable) {
    return (
      <OverviewCanvasFrame {...chrome}>
        <p className="text-[13px] leading-6 text-muted">{unavailableCopy.hint}</p>
        {data.aiUnavailableReason === "consent" ? (
          <div className="mt-3">
            <AiUnavailableConsentActions />
          </div>
        ) : null}
      </OverviewCanvasFrame>
    );
  }

  if (!data || !data.insights.length) {
    return null;
  }

  const previewMoments = data.moments?.slice(0, PREVIEW_INSIGHTS_COUNT) ?? [];
  const previewInsights = previewMoments.length > 0 ? [] : data.insights.slice(0, PREVIEW_INSIGHTS_COUNT);

  return (
    <OverviewCanvasFrame {...chrome}>
      <AiSummaryUnsortedGenresNotice
        enabled={!viewerUserId}
        startDate={startDate}
        endDate={endDate}
      />
      {previewMoments.length > 0
        ? previewMoments.map((moment, index) => (
            <div key={moment.id} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} items-start`}>
              <span className="w-8 shrink-0 text-[13px] tabular-nums text-muted">
                {moment.metric || index + 1}
              </span>
              <span className="min-w-0 flex-1 text-[13px] leading-6 text-foreground">
                {moment.title ? `${moment.title} — ` : ""}
                {moment.body}
              </span>
            </div>
          ))
        : previewInsights.map((insight, index) => (
            <div key={index} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} items-start`}>
              <span className="w-6 shrink-0 text-[13px] tabular-nums text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1 text-[13px] leading-6 text-foreground">{insight}</span>
            </div>
          ))}
      {data.cached ? <p className="mt-3 text-[13px] text-muted">{t("cached")}</p> : null}
    </OverviewCanvasFrame>
  );
}
