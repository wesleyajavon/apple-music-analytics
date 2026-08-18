"use client";

import { useTranslations } from "next-intl";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { AiFeatureDisabledPlaceholder } from "@/lib/components/ai-feature-disabled-placeholder";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { usePublicDemoSoundprintSnapshot } from "@/lib/hooks/use-public-demo-soundprint-snapshot";
import { useTasteProfileDemoCopy } from "@/lib/hooks/use-public-demo-ai-copy";
import { PublicDemoAiSignupCta } from "@/lib/components/public-demo-ai-signup-cta";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import {
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OVERVIEW_STARTUP_SURFACE_BASE,
  OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS,
  OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS,
  OVERVIEW_STARTUP_WIDGET_TITLE_CLASS,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { AiSummaryUnsortedGenresNotice } from "@/lib/components/ai-summary-unsorted-genres-notice";

function TasteProfileFrame({ children }: { children: React.ReactNode }) {
  const t = useTranslations("taste-profile");

  return (
    <section
      className={`${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] w-full flex-col animate-fade-in-up`}
    >
      <OverviewStartupSurfaceBg />
      <div className={`relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`}>
        <div className="min-w-0">
          <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
            <LiveStatusDot />
            {t("overviewWidget.eyebrow")}
          </div>
          <h2 className={OVERVIEW_STARTUP_WIDGET_TITLE_CLASS}>{t("overviewWidget.title")}</h2>
          <p className={OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS}>{t("overviewWidget.description")}</p>
        </div>
      </div>
      <div className="relative flex-1 space-y-4 p-6 sm:p-8">{children}</div>
    </section>
  );
}

function TasteProfileReading({
  headline,
  influences,
  uniqueAspect,
}: {
  headline: string;
  influences?: string;
  uniqueAspect?: string;
}) {
  const t = useTranslations("taste-profile");
  const trimmedInfluences = influences?.trim() ?? "";
  const trimmedUniqueAspect = uniqueAspect?.trim() ?? "";
  const hasSignals = Boolean(trimmedInfluences || trimmedUniqueAspect);

  return (
    <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {t("pullQuoteLabel")}
      </p>
      <blockquote className="mt-3 text-lg font-medium leading-8 tracking-[-0.02em] text-foreground sm:text-xl sm:leading-9">
        {headline}
      </blockquote>

      {hasSignals ? (
        <dl className="mt-6 grid gap-5 border-t border-card-border pt-5 sm:grid-cols-2 sm:gap-8 dark:border-white/[0.06]">
          {trimmedInfluences ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {t("influences")}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-foreground/80">{trimmedInfluences}</dd>
            </div>
          ) : null}
          {trimmedUniqueAspect ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {t("whatMakesYouUnique")}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-foreground/80">{trimmedUniqueAspect}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

function TasteProfileLoadingState() {
  const t = useTranslations("taste-profile");

  return (
    <TasteProfileFrame>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t("loading")}
      </p>
      <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
        <div className="space-y-3">
          <div className="h-3 w-36 animate-shimmer rounded bg-slate-200/80 dark:bg-[#252836]" />
          <div className="h-6 w-full animate-shimmer rounded-lg bg-slate-200/80 dark:bg-[#252836]" />
          <div className="h-6 w-[88%] animate-shimmer rounded-lg bg-slate-200/80 dark:bg-[#252836]" />
        </div>
        <div className="mt-6 grid gap-5 border-t border-card-border pt-5 sm:grid-cols-2 dark:border-white/[0.06]">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-shimmer rounded bg-slate-200/80 dark:bg-[#252836]" />
              <div className="h-4 w-full animate-shimmer rounded bg-slate-200/80 dark:bg-[#252836]" />
              <div className="h-4 w-4/5 animate-shimmer rounded bg-slate-200/80 dark:bg-[#252836]" />
            </div>
          ))}
        </div>
      </div>
    </TasteProfileFrame>
  );
}

function TasteProfilePublicDemoTeaser() {
  const t = useTranslations("taste-profile");
  const viewerUserId = useDashboardViewerUserId();
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const { snapshot, isLoading: isSnapshotLoading } = usePublicDemoSoundprintSnapshot(
    startDate,
    endDate,
    viewerUserId,
    true
  );
  const demoCopy = useTasteProfileDemoCopy(snapshot);

  if (isRangeLoading || isSnapshotLoading) {
    return (
      <div role="status" aria-label={t("loading")}>
        <TasteProfileLoadingState />
      </div>
    );
  }

  if (!demoCopy) {
    return null;
  }

  return (
    <TasteProfileFrame>
      <TasteProfileReading
        headline={demoCopy.headline}
        influences={demoCopy.influences}
        uniqueAspect={demoCopy.uniqueAspect}
      />
      <PublicDemoAiSignupCta variant="light" />
    </TasteProfileFrame>
  );
}

export function TasteProfileSummaryWidget() {
  const t = useTranslations("taste-profile");
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error } = useTasteProfile(startDate, endDate, "casual", {
    userId: viewerUserId,
    enabled: !isPublicDemoViewer,
  });

  const isLoadingOrFetching = isRangeLoading || isLoading;
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  if (isPublicDemoViewer) {
    return <TasteProfilePublicDemoTeaser />;
  }

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return (
      <TasteProfileFrame>
        <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
          <InteractiveAiGenreBackfillNotice />
        </div>
      </TasteProfileFrame>
    );
  }

  if (isLoadingOrFetching) {
    return (
      <div role="status" aria-label={t("loading")}>
        <TasteProfileLoadingState />
      </div>
    );
  }

  if (error) {
    if (isGroqGenreClassificationBlockingError(error)) {
      return (
        <TasteProfileFrame>
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <InteractiveAiGenreBackfillNotice force />
          </div>
        </TasteProfileFrame>
      );
    }
    return (
      <AiWidgetQuotaOrError
        title={t("overviewWidget.title")}
        subtitle={t("overviewWidget.description")}
        error={error}
        surface="startup"
        eyebrow={t("overviewWidget.eyebrow")}
      />
    );
  }

  if (data?.aiUnavailable) {
    return (
      <AiFeatureDisabledPlaceholder
        title={t("overviewWidget.title")}
        subtitle={t("overviewWidget.description")}
        reason={data.aiUnavailableReason ?? "client"}
        surface="startup"
        eyebrow={t("overviewWidget.eyebrow")}
      />
    );
  }

  if (!data) {
    return null;
  }

  return (
    <TasteProfileFrame>
      <AiSummaryUnsortedGenresNotice
        enabled={!viewerUserId}
        startDate={startDate}
        endDate={endDate}
      />
      <TasteProfileReading
        headline={data.description}
        influences={data.influences}
        uniqueAspect={data.uniqueAspect}
      />
      {data.cached ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500/80 dark:bg-cyan-300/70" aria-hidden />
          {t("cached")}
        </p>
      ) : null}
    </TasteProfileFrame>
  );
}
