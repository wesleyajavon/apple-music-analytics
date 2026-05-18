"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Minus,
  Pause,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  type GroqBackfillDashboardJob,
  useGenreBackfillJob,
} from "@/lib/context/genre-backfill-job-context";
import {
  clearGenreBackfillBannerBlockingPrefs,
  getGenreBackfillBannerCollapsed,
  getGenreBackfillBannerDismissedJobId,
  getGenreBackfillBannerOptOut,
  setGenreBackfillBannerCollapsed,
  setGenreBackfillBannerDismissedJobId,
} from "@/lib/utils/genre-backfill-banner-prefs";

type JobStatus = GroqBackfillDashboardJob["status"];

function isTerminal(status: JobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function isCleanCompletedSuccess(job: GroqBackfillDashboardJob): boolean {
  return (
    job.status === "completed" &&
    job.currentUnknownPct != null &&
    job.currentUnknownPct <= job.targetUnknownPct
  );
}

type PanelTone = "active" | "paused" | "success" | "warning" | "danger" | "muted";

function panelTone(job: GroqBackfillDashboardJob, showNextSessionCta: boolean): PanelTone {
  if (job.status === "failed") return "danger";
  if (job.status === "cancelled") return "muted";
  if (job.status === "paused") return "paused";
  if (
    job.status === "completed" &&
    (!isCleanCompletedSuccess(job) || showNextSessionCta)
  ) {
    return "warning";
  }
  if (job.status === "completed") return "success";
  return "active";
}

/** Carte « produit » en clair ; verre violet / cyan en dark (dashboard startup) */
const SHELL =
  "relative overflow-hidden rounded-[1.5rem] border border-slate-200/85 bg-gradient-to-br from-white via-slate-50/96 to-white text-slate-900 shadow-lg shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04] dark:border-accent-violet/22 dark:bg-gray-950 dark:text-white dark:shadow-2xl dark:shadow-accent-violet/12 dark:ring-white/10";

const SHELL_DECOR = (
  <>
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_42%),radial-gradient(circle_at_92%_8%,rgba(6,182,212,0.06),transparent_36%)] dark:hidden"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.42),transparent_38%),radial-gradient(circle_at_82%_18%,rgba(6,182,212,0.26),transparent_32%),linear-gradient(135deg,rgba(17,24,39,0.97),rgba(76,29,149,0.72))] dark:block"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -bottom-20 left-1/2 hidden h-48 w-[85%] -translate-x-1/2 rounded-full bg-accent-violet/22 blur-3xl dark:block"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -top-16 -right-12 hidden h-40 w-40 rounded-full bg-accent-cyan/12 blur-3xl dark:block"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent dark:via-violet-400/35"
      aria-hidden
    />
  </>
);

const RING_OFFSET = "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const TONE_STYLES: Record<
  PanelTone,
  { accentBar: string; iconWrap: string; glow: string }
> = {
  active: {
    accentBar:
      "bg-gradient-to-b from-violet-400 via-accent-violet to-cyan-400 shadow-[0_0_10px_rgba(139,92,246,0.22)] dark:shadow-[0_0_20px_rgba(139,92,246,0.45)]",
    iconWrap:
      "border border-violet-200/90 bg-violet-50/95 shadow-sm ring-1 ring-violet-500/[0.06] dark:border-white/15 dark:bg-white/10 dark:shadow-inner dark:shadow-white/5 dark:backdrop-blur-md dark:ring-white/10",
    glow: "[--gb-glow:rgba(139,92,246,0.1)] dark:[--gb-glow:rgba(139,92,246,0.35)]",
  },
  paused: {
    accentBar:
      "bg-gradient-to-b from-indigo-300 via-accent-indigo to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.2)] dark:shadow-[0_0_18px_rgba(99,102,241,0.4)]",
    iconWrap:
      "border border-indigo-200/90 bg-indigo-50/92 shadow-sm ring-1 ring-indigo-500/[0.07] dark:border-white/15 dark:bg-indigo-500/18 dark:shadow-inner dark:shadow-cyan-500/10 dark:backdrop-blur-md dark:ring-indigo-400/25",
    glow: "[--gb-glow:rgba(99,102,241,0.08)] dark:[--gb-glow:rgba(99,102,241,0.26)]",
  },
  success: {
    accentBar:
      "bg-gradient-to-b from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.2)] dark:shadow-[0_0_16px_rgba(16,185,129,0.35)]",
    iconWrap:
      "border border-emerald-200/90 bg-emerald-50/92 shadow-sm ring-1 ring-emerald-500/[0.08] dark:border-white/15 dark:bg-emerald-500/15 dark:shadow-inner dark:shadow-emerald-500/10 dark:backdrop-blur-md dark:ring-emerald-400/25",
    glow: "[--gb-glow:rgba(16,185,129,0.08)] dark:[--gb-glow:rgba(16,185,129,0.22)]",
  },
  warning: {
    accentBar:
      "bg-gradient-to-b from-fuchsia-400 via-accent-violet to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.2)] dark:shadow-[0_0_20px_rgba(168,85,247,0.32)]",
    iconWrap:
      "border border-fuchsia-200/85 bg-fuchsia-50/88 shadow-sm ring-1 ring-fuchsia-500/[0.08] dark:border-white/15 dark:bg-fuchsia-500/14 dark:shadow-inner dark:shadow-violet-500/15 dark:backdrop-blur-md dark:ring-fuchsia-400/22",
    glow: "[--gb-glow:rgba(167,139,250,0.1)] dark:[--gb-glow:rgba(167,139,250,0.22)]",
  },
  danger: {
    accentBar:
      "bg-gradient-to-b from-rose-400 to-red-500 shadow-[0_0_10px_rgba(244,63,94,0.2)] dark:shadow-[0_0_18px_rgba(244,63,94,0.38)]",
    iconWrap:
      "border border-rose-200/90 bg-rose-50/92 shadow-sm ring-1 ring-rose-400/18 dark:border-white/15 dark:bg-rose-500/18 dark:shadow-inner dark:shadow-rose-500/15 dark:backdrop-blur-md dark:ring-rose-400/30",
    glow: "[--gb-glow:rgba(244,63,94,0.09)] dark:[--gb-glow:rgba(244,63,94,0.22)]",
  },
  muted: {
    accentBar:
      "bg-gradient-to-b from-slate-300 to-slate-400/85 shadow-sm dark:from-white/35 dark:to-white/15 dark:shadow-none",
    iconWrap:
      "border border-slate-200/90 bg-slate-100/92 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-white/12 dark:bg-white/8 dark:backdrop-blur-md dark:ring-white/10",
    glow: "[--gb-glow:rgba(100,116,139,0.1)] dark:[--gb-glow:rgba(148,163,184,0.14)]",
  },
};

export function GenreBackfillGlobalBadge() {
  const t = useTranslations("dashboard.genreBackfill");
  const { job, refreshStatus, hasActiveGroqJob } = useGenreBackfillJob();
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [optOut, setOptOut] = useState(false);
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setOptOut(getGenreBackfillBannerOptOut());
    setDismissedJobId(getGenreBackfillBannerDismissedJobId());
    setCollapsed(getGenreBackfillBannerCollapsed());
    setPrefsHydrated(true);
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    setGenreBackfillBannerCollapsed(next);
  }, []);

  const dismissCurrentJob = useCallback(() => {
    if (!job) return;
    setGenreBackfillBannerDismissedJobId(job.id);
    setDismissedJobId(job.id);
  }, [job]);

  const pauseBackfill = useCallback(async () => {
    setIsPausing(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/pause", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (data.error === "NO_RUNNING_JOB") toast.error(t("pauseNoRunning"));
        else toast.error(t("pauseError"));
        return;
      }
      toast.success(t("pausedToast"));
      await refreshStatus();
    } catch {
      toast.error(t("pauseError"));
    } finally {
      setIsPausing(false);
    }
  }, [refreshStatus, t]);

  const cancelBackfill = useCallback(async () => {
    setIsCancelling(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/cancel", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (data.error === "NO_ACTIVE_JOB") toast.error(t("cancelNoJob"));
        else if (data.error === "NOTHING_TO_CANCEL") toast.error(t("cancelNothing"));
        else toast.error(t("cancelError"));
        return;
      }
      toast.success(t("cancelledToast"));
      await refreshStatus();
    } catch {
      toast.error(t("cancelError"));
    } finally {
      setIsCancelling(false);
    }
  }, [refreshStatus, t]);

  const resumeBackfill = useCallback(async () => {
    setIsResuming(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/resume", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        if (data.error === "NO_PAUSED_JOB") toast.error(t("resumeNoPaused"));
        else toast.error(t("resumeError"));
        return;
      }
      toast.success(t("resumedToast"));
      await refreshStatus();
    } catch {
      toast.error(t("resumeError"));
    } finally {
      setIsResuming(false);
    }
  }, [refreshStatus, t]);

  const startAnotherSession = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? t("startError"));
        return;
      }
      clearGenreBackfillBannerBlockingPrefs();
      setOptOut(false);
      setDismissedJobId(null);
      toast.success(t("started"));
      await refreshStatus();
      window.setTimeout(() => void refreshStatus(), 400);
    } catch {
      toast.error(t("startError"));
    } finally {
      setIsStarting(false);
    }
  }, [refreshStatus, t]);

  const visibleJob = useMemo(() => {
    if (!job || !prefsHydrated) return null;

    if (job.status === "pending" || job.status === "running" || job.status === "paused") {
      return job;
    }

    if (!isTerminal(job.status)) return null;

    if (optOut) return null;
    if (dismissedJobId && dismissedJobId === job.id) return null;
    if (isCleanCompletedSuccess(job)) return null;

    return job;
  }, [job, prefsHydrated, optOut, dismissedJobId]);

  const hasBackfillInProgress =
    visibleJob?.status === "pending" || visibleJob?.status === "running";
  const isPaused = visibleJob?.status === "paused";
  const canSuggestNextSession =
    visibleJob != null &&
    isTerminal(visibleJob.status) &&
    visibleJob.currentUnknownPct != null &&
    visibleJob.currentUnknownPct > visibleJob.targetUnknownPct;
  const showNextSessionCta =
    canSuggestNextSession || (visibleJob != null && visibleJob.status === "failed");

  const ratioText = useMemo(() => {
    if (!visibleJob) return "";
    if (visibleJob.initialUnknownPct != null && visibleJob.currentUnknownPct != null) {
      return `${visibleJob.initialUnknownPct.toFixed(1)}% → ${visibleJob.currentUnknownPct.toFixed(1)}%`;
    }
    if (visibleJob.currentUnknownPct != null) {
      return `${visibleJob.currentUnknownPct.toFixed(1)}%`;
    }
    return t("ratioPending");
  }, [visibleJob, t]);

  const progressValue = useMemo(() => {
    if (!visibleJob) return 0;
    if (visibleJob.maxArtists > 0) {
      return Math.min(100, Math.round((visibleJob.artistsProcessed / visibleJob.maxArtists) * 100));
    }
    return hasBackfillInProgress ? 0 : 100;
  }, [visibleJob, hasBackfillInProgress]);

  const headingCopy = visibleJob
    ? hasBackfillInProgress
      ? t("running")
      : isPaused
        ? t("pausedHeading")
        : visibleJob.status === "failed"
          ? t("failed")
          : visibleJob.status === "cancelled"
            ? t("cancelledHeading")
            : t("completed")
    : "";

  const tones = visibleJob ? TONE_STYLES[panelTone(visibleJob, showNextSessionCta)] : TONE_STYLES.active;

  const headlineIcon =
    visibleJob && hasBackfillInProgress ? (
      <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-violet-600 dark:text-violet-200" aria-hidden />
    ) : visibleJob && isPaused ? (
      <Pause className="h-5 w-5 text-indigo-600 dark:text-indigo-200" aria-hidden />
    ) : visibleJob?.status === "failed" ? (
      <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-300" aria-hidden />
    ) : visibleJob?.status === "cancelled" ? (
      <Ban className="h-5 w-5 text-slate-400 dark:text-white/45" aria-hidden />
    ) : visibleJob?.status === "completed" ? (
      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden />
    ) : (
      <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-200" aria-hidden />
    );

  const collapsedPulse =
    prefsHydrated && visibleJob != null &&
    (visibleJob.status === "pending" || visibleJob.status === "running");

  if (!visibleJob) {
    return null;
  }

  const headingId = "genre-backfill-global-badge-title";
  const srSummaryId = "genre-backfill-global-badge-summary";

  if (collapsed) {
    return (
      <div className="mb-6">
        <button
          type="button"
          className={`group ${SHELL} flex w-full items-center gap-3 px-4 py-3.5 text-left transition-[transform,box-shadow] hover:shadow-md motion-safe:active:scale-[0.998] dark:hover:shadow-accent-violet/22 ${RING_OFFSET} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 ${tones.glow}`}
          onClick={() => persistCollapsed(false)}
          aria-expanded={false}
          aria-controls="genre-backfill-global-badge-panel"
        >
          {SHELL_DECOR}
          <div
            className={`pointer-events-none absolute left-3 top-1/2 z-[1] h-[70%] max-h-14 w-1 -translate-y-1/2 rounded-full ${tones.accentBar}`}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_100%_0%,var(--gb-glow),transparent_55%)]"
            aria-hidden
          />
          <span className={`relative z-[2] flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones.iconWrap}`}>
            {collapsedPulse ? (
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-violet-600 dark:text-violet-200" aria-hidden />
            ) : (
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-200" aria-hidden />
            )}
          </span>
          <span className="relative z-[2] min-w-0 flex-1 ps-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-accent-cyan">
              {t("panelEyebrow")}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-slate-900 dark:text-white">
              {headingCopy || t("collapsedSummary")}
            </span>
          </span>
          <ChevronDown
            className="relative z-[2] -rotate-90 h-5 w-5 shrink-0 text-slate-400 transition-[color,transform] group-hover:text-slate-600 dark:text-white/45 dark:group-hover:text-white/85"
            aria-hidden
          />
        </button>
      </div>
    );
  }

  return (
    <section
      id="genre-backfill-global-badge-panel"
      className={`${SHELL} mb-6 transition-shadow hover:shadow-md dark:hover:shadow-accent-violet/22 ${tones.glow}`}
      aria-labelledby={headingId}
      aria-describedby={srSummaryId}
      role="region"
    >
      {SHELL_DECOR}
      <div
        className="pointer-events-none absolute left-4 top-6 bottom-6 z-[1] w-1 rounded-full sm:left-5 sm:top-7 sm:bottom-7"
        aria-hidden
      >
        <div className={`h-full w-full rounded-full ${tones.accentBar}`} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,var(--gb-glow),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-[2] p-5 pl-8 sm:p-6 sm:pl-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones.iconWrap}`}
              aria-hidden
            >
              {headlineIcon}
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-accent-cyan">
                {t("panelEyebrow")}
              </p>
              <h2 id={headingId} className="mt-1 text-base font-semibold leading-snug text-slate-900 sm:text-lg dark:text-white">
                {headingCopy}
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200/85 bg-white/80 p-0.5 backdrop-blur-md dark:border-white/12 dark:bg-white/8">
            <button
              type="button"
              className={`rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white ${RING_OFFSET} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40`}
              onClick={() => persistCollapsed(true)}
              aria-label={t("collapseAria")}
              title={t("collapseAria")}
            >
              <Minus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
            {isTerminal(visibleJob.status) ? (
              <button
                type="button"
                className={`rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white ${RING_OFFSET} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40`}
                onClick={dismissCurrentJob}
                aria-label={t("dismissAria")}
                title={t("dismissAria")}
              >
                <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <p id={srSummaryId} className="sr-only">
          {t("details", {
            processed: visibleJob.artistsProcessed,
            max: visibleJob.maxArtists,
            ratio: ratioText,
            target: visibleJob.targetUnknownPct.toFixed(1),
          })}
        </p>

        <ul className="mt-4 flex flex-wrap gap-2">
          <li className="inline-flex">
            <span className="inline-flex items-center rounded-lg border border-slate-200/85 bg-white/90 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-800 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white/90">
              {t("statTracksShort", {
                processed: visibleJob.artistsProcessed,
                max: visibleJob.maxArtists,
              })}
            </span>
          </li>
          <li className="inline-flex">
            <span className="inline-flex items-center rounded-lg border border-slate-200/85 bg-white/90 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-800 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white/90">
              {t("statUnknownShort", { ratio: ratioText })}
            </span>
          </li>
          <li className="inline-flex">
            <span className="inline-flex items-center rounded-lg border border-slate-200/85 bg-white/90 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-800 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-white/10 dark:text-white/90">
              {t("statTargetShort", { target: visibleJob.targetUnknownPct.toFixed(1) })}
            </span>
          </li>
        </ul>

        {(hasBackfillInProgress || isPaused) &&
          (visibleJob.maxArtists > 0 ? (
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-white/55">{t("progressLabel")}</span>
                <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                  {progressValue}%
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-inset ring-slate-300/45 dark:bg-white/10 dark:ring-white/15"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressValue}
                aria-label={t("progressAria")}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-violet to-cyan-500/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            </div>
          ) : hasBackfillInProgress ? (
            <div className="mt-5 flex items-center gap-2 text-xs text-slate-600 dark:text-white/60" role="status">
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none text-violet-600 dark:text-violet-300"
                aria-hidden
              />
              <span>{t("batchPreparing")}</span>
            </div>
          ) : null)}

        {isTerminal(visibleJob.status) && !showNextSessionCta ? (
          <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-white/65">
            {t("detailsInline", {
              processed: visibleJob.artistsProcessed,
              max: visibleJob.maxArtists,
              ratio: ratioText,
              target: visibleJob.targetUnknownPct.toFixed(1),
            })}
          </p>
        ) : null}

        {hasBackfillInProgress || isPaused ? (
          <div className="mt-5 flex flex-wrap gap-2 sm:gap-2.5">
            {hasBackfillInProgress ? (
              <button
                type="button"
                className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:shadow-inner dark:shadow-white/5 dark:backdrop-blur-md dark:hover:bg-white/[0.16]"
                disabled={isPausing || isCancelling}
                onClick={() => void pauseBackfill()}
              >
                <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {isPausing ? t("pausing") : t("pause")}
              </button>
            ) : (
              <button
                type="button"
                className={`group relative inline-flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/25 bg-brand-gradient px-5 py-2 text-xs font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 ${RING_OFFSET} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-55 motion-safe:active:scale-[0.99]`}
                disabled={isResuming || isCancelling}
                onClick={() => void resumeBackfill()}
              >
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/20 opacity-50 transition-opacity group-hover:opacity-65"
                  aria-hidden
                />
                <Play className="relative z-[1] h-3.5 w-3.5 shrink-0 drop-shadow-sm" aria-hidden strokeWidth={2.25} />
                <span className="relative z-[1]">{isResuming ? t("resuming") : t("resume")}</span>
              </button>
            )}
            <button
              type="button"
              className={`group relative inline-flex min-h-[40px] items-center justify-center gap-2 overflow-hidden rounded-xl border border-rose-300/70 bg-rose-50/90 px-5 py-2 text-xs font-semibold text-rose-800 shadow-sm transition-all hover:border-rose-400/80 hover:bg-rose-100/90 active:translate-y-0 ${RING_OFFSET} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/45 disabled:pointer-events-none disabled:opacity-50 motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99] dark:border-rose-400/40 dark:bg-rose-500/[0.09] dark:text-rose-50 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] dark:backdrop-blur-md dark:hover:border-rose-400/60 dark:hover:bg-rose-500/[0.16] dark:hover:shadow-[0_0_28px_-10px_rgba(244,63,94,0.45)]`}
              disabled={isPausing || isCancelling || isResuming}
              onClick={() => void cancelBackfill()}
            >
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-400/10 via-transparent to-transparent opacity-80 group-hover:opacity-100"
                aria-hidden
              />
              <X className="relative z-[1] h-3.5 w-3.5 shrink-0 opacity-95 group-hover:opacity-100" strokeWidth={2.25} aria-hidden />
              <span className="relative z-[1]">{isCancelling ? t("cancelling") : t("cancel")}</span>
            </button>
          </div>
        ) : null}

        {showNextSessionCta ? (
          <div className="mt-5 rounded-xl border border-slate-200/85 bg-slate-50/85 px-4 py-3.5 shadow-inner shadow-slate-900/[0.04] backdrop-blur-md dark:border-white/15 dark:bg-white/[0.08] dark:shadow-black/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-white/85">
                {visibleJob.status === "failed"
                  ? t("nextSessionAfterError")
                  : t("nextSessionPrompt", {
                      current: visibleJob.currentUnknownPct?.toFixed(1) ?? "0.0",
                      target: visibleJob.targetUnknownPct.toFixed(1),
                    })}
              </p>
              <button
                type="button"
                className={`inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-violet px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-all hover:opacity-[0.94] ${RING_OFFSET} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:pointer-events-none disabled:opacity-50`}
                disabled={isStarting || hasActiveGroqJob}
                onClick={() => void startAnotherSession()}
              >
                <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {isStarting ? t("starting") : t("startNextSession")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
