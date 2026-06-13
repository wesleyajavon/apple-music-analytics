"use client";

import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { AiWidgetQuotaOrError } from "@/lib/components/error-state";
import { AiFeatureDisabledPlaceholder } from "@/lib/components/ai-feature-disabled-placeholder";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import { CinematicQuote } from "@/lib/components/musical-profile-cinematic";

const SNAPSHOT_SHELL_CLASS =
  "relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#08060a] via-[#100c12] to-[#0a080e] text-white shadow-2xl shadow-black/50 ring-1 ring-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/60";

function SnapshotSurfaceBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(240,64,104,0.14),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(152,80,208,0.12),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(79,144,224,0.08),transparent_36%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-rose/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-accent-violet/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden
      />
    </>
  );
}

function TasteProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <section className={SNAPSHOT_SHELL_CLASS}>
      <SnapshotSurfaceBg />
      <div className="relative">{children}</div>
    </section>
  );
}

function SnapshotFaviconMark() {
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
      <motion.div
        className="absolute inset-[6%] rounded-full bg-accent-violet/20 blur-2xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="absolute inset-[18%] rounded-full border border-white/10 bg-white/[0.04]"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        aria-hidden
      />
      <motion.div
        className="relative"
        animate={{ y: [0, -7, 0], rotate: [0, 1.5, -1.5, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <SoundprintLogo
          src="/brand/favicon.png"
          showText={false}
          priority
          imageClassName="h-24 w-24 object-contain drop-shadow-[0_8px_32px_rgba(152,80,208,0.45)] sm:h-28 sm:w-28"
        />
      </motion.div>
    </div>
  );
}

function SnapshotSignalStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-xs font-medium leading-[1.65] text-slate-300 sm:text-[0.8125rem]">{value}</p>
    </div>
  );
}

function SnapshotHeaderScrollDivider({ label }: { label: string }) {
  return (
    <div className="relative mt-6 sm:mt-7" aria-hidden>
      <div className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent sm:inset-x-8" />
      <div className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-accent-rose/0 via-accent-violet/70 to-accent-cyan/0 sm:inset-x-14" />
      <div className="pointer-events-none absolute inset-x-16 top-[calc(50%+0.75rem)] h-8 bg-gradient-to-b from-accent-violet/15 to-transparent blur-md" />
      <div className="relative flex flex-col items-center gap-2 pt-1">
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-slate-300">
          {label}
        </span>
        <motion.div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] shadow-[0_0_24px_rgba(152,80,208,0.35)] ring-1 ring-accent-violet/25"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            className="h-4 w-4 text-accent-violet"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.25} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </div>
    </div>
  );
}

function SnapshotHeader({
  title,
  description,
  scrollCue,
}: {
  title: string;
  description: string;
  scrollCue: string;
}) {
  return (
    <div className="border-b border-white/20 bg-gradient-to-b from-transparent to-black/20 px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-7">
      <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">{description}</p>
      <SnapshotHeaderScrollDivider label={scrollCue} />
    </div>
  );
}

function TasteProfileLoadingState() {
  const t = useTranslations("taste-profile");

  return (
    <TasteProfileShell>
      <SnapshotHeader
        title={t("overviewWidget.title")}
        description={t("overviewWidget.description")}
        scrollCue={t("overviewWidget.scrollCue")}
      />
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-10">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5 sm:p-7">
            <div className="space-y-3">
              <div className="h-7 w-full animate-shimmer rounded-lg bg-white/10" />
              <div className="h-7 w-[90%] animate-shimmer rounded-lg bg-white/10" />
              <div className="h-7 w-[72%] animate-shimmer rounded-lg bg-white/10" />
            </div>
          </div>
          <div className="grid gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-shimmer rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="h-36 w-36 animate-pulse rounded-full bg-white/10 sm:h-44 sm:w-44" />
        </div>
      </div>
      <p className="px-5 pb-6 text-xs text-slate-500 sm:px-8">{t("loading")}</p>
    </TasteProfileShell>
  );
}

function TasteProfileBlockedShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("taste-profile");

  return (
    <TasteProfileShell>
      <SnapshotHeader
        title={t("overviewWidget.title")}
        description={t("overviewWidget.description")}
        scrollCue={t("overviewWidget.scrollCue")}
      />
      <div className="p-5 sm:p-8">{children}</div>
    </TasteProfileShell>
  );
}

/**
 * Overview teaser for the AI taste profile — dark editorial surface with animated favicon.
 */
export function TasteProfileSummaryWidget() {
  const t = useTranslations("taste-profile");
  const viewerUserId = useDashboardViewerUserId();
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error } = useTasteProfile(startDate, endDate, "casual", {
    userId: viewerUserId,
  });

  const isLoadingOrFetching = isRangeLoading || isLoading;
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return (
      <TasteProfileBlockedShell>
        <InteractiveAiGenreBackfillNotice />
      </TasteProfileBlockedShell>
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
        <TasteProfileBlockedShell>
          <InteractiveAiGenreBackfillNotice force />
        </TasteProfileBlockedShell>
      );
    }
    return (
      <AiWidgetQuotaOrError
        title={t("overviewWidget.title")}
        subtitle={t("pullQuoteLabel")}
        error={error}
      />
    );
  }

  if (data?.aiUnavailable) {
    return (
      <AiFeatureDisabledPlaceholder
        title={t("overviewWidget.title")}
        subtitle={t("pullQuoteLabel")}
        reason={data.aiUnavailableReason ?? "client"}
      />
    );
  }

  if (!data) {
    return null;
  }

  const influences = data.influences.trim();
  const uniqueAspect = data.uniqueAspect.trim();

  return (
    <TasteProfileShell>
      <SnapshotHeader
        title={t("overviewWidget.title")}
        description={t("overviewWidget.description")}
        scrollCue={t("overviewWidget.scrollCue")}
      />

      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-5">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/35 p-5 sm:p-7">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-rose/80 via-accent-violet/70 to-accent-cyan/60"
              aria-hidden
            />
            <CinematicQuote
              quoteKey={data.description}
              className="text-balance text-xl font-semibold leading-8 tracking-[-0.03em] text-white sm:text-2xl sm:leading-9"
            >
              &ldquo;{data.description}&rdquo;
            </CinematicQuote>
          </div>

          {(influences || uniqueAspect) ? (
            <div className="grid gap-3">
              {influences ? (
                <SnapshotSignalStrip label={t("influences")} value={influences} />
              ) : null}
              {uniqueAspect ? (
                <SnapshotSignalStrip label={t("whatMakesYouUnique")} value={uniqueAspect} />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-center lg:sticky lg:top-8 lg:self-start">
          <SnapshotFaviconMark />
        </div>
      </div>
    </TasteProfileShell>
  );
}
