"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  clearGenreBackfillBannerBlockingPrefs,
  getGenreBackfillBannerCollapsed,
  getGenreBackfillBannerDismissedJobId,
  getGenreBackfillBannerOptOut,
  setGenreBackfillBannerCollapsed,
  setGenreBackfillBannerDismissedJobId,
} from "@/lib/utils/genre-backfill-banner-prefs";

type JobStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

type BackfillJob = {
  id: string;
  status: JobStatus;
  targetUnknownPct: number;
  initialUnknownPct: number | null;
  currentUnknownPct: number | null;
  artistsProcessed: number;
  maxArtists: number;
};

const POLL_MS_ACTIVE = 2500;
/** Job terminal (succès / échec / annulé) : rafraîchir rarement. */
const POLL_MS_TERMINAL = 60_000;
/** Aucun job en base : pas besoin de poller comme un job actif. */
const POLL_MS_NO_JOB = 90_000;

function isTerminal(status: JobStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function isCleanCompletedSuccess(job: BackfillJob): boolean {
  return (
    job.status === "completed" &&
    job.currentUnknownPct != null &&
    job.currentUnknownPct <= job.targetUnknownPct
  );
}

export function GenreBackfillGlobalBadge() {
  const t = useTranslations("dashboard.genreBackfill");
  const [job, setJob] = useState<BackfillJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [optOut, setOptOut] = useState(false);
  const [dismissedJobId, setDismissedJobId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setOptOut(getGenreBackfillBannerOptOut());
    setDismissedJobId(getGenreBackfillBannerDismissedJobId());
    setCollapsed(getGenreBackfillBannerCollapsed());
    setPrefsHydrated(true);
  }, []);

  const loadStatus = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status", {
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { job?: BackfillJob | null };
      setJob(data.job ?? null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const status = job?.status;
    const active =
      status === "pending" || status === "running" || status === "paused";
    const pollMs = active
      ? POLL_MS_ACTIVE
      : status == null
        ? POLL_MS_NO_JOB
        : POLL_MS_TERMINAL;
    const id = window.setInterval(() => {
      void loadStatus();
    }, pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") void loadStatus();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      abortRef.current?.abort();
    };
  }, [loadStatus, job?.status]);

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
      await loadStatus();
    } catch {
      toast.error(t("pauseError"));
    } finally {
      setIsPausing(false);
    }
  }, [loadStatus, t]);

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
      await loadStatus();
    } catch {
      toast.error(t("cancelError"));
    } finally {
      setIsCancelling(false);
    }
  }, [loadStatus, t]);

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
      await loadStatus();
    } catch {
      toast.error(t("resumeError"));
    } finally {
      setIsResuming(false);
    }
  }, [loadStatus, t]);

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
      await loadStatus();
    } catch {
      toast.error(t("startError"));
    } finally {
      setIsStarting(false);
    }
  }, [loadStatus, t]);

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
      return `${visibleJob.initialUnknownPct.toFixed(1)}% -> ${visibleJob.currentUnknownPct.toFixed(1)}%`;
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

  if (!visibleJob) {
    return null;
  }

  const headingId = "genre-backfill-global-badge-title";

  if (collapsed) {
    return (
      <div className="mb-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-violet-200/70 bg-violet-50/60 px-3 py-2 text-left text-xs font-medium text-violet-900 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-100"
          onClick={() => persistCollapsed(false)}
          aria-expanded={false}
        >
          <span className="truncate">{t("collapsedSummary")}</span>
          <span className="shrink-0 text-violet-600 dark:text-violet-300" aria-hidden>
            ▼
          </span>
        </button>
      </div>
    );
  }

  return (
    <section
      id="genre-backfill-global-badge-panel"
      className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/70 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/25"
      aria-labelledby={headingId}
      role="region"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p id={headingId} className="text-sm font-medium text-violet-900 dark:text-violet-100">
          {hasBackfillInProgress
            ? t("running")
            : isPaused
              ? t("pausedHeading")
              : visibleJob.status === "failed"
                ? t("failed")
                : visibleJob.status === "cancelled"
                  ? t("cancelledHeading")
                  : t("completed")}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="rounded-md p-1.5 text-violet-800 transition-colors hover:bg-violet-200/50 dark:text-violet-200 dark:hover:bg-violet-900/50"
            onClick={() => persistCollapsed(true)}
            aria-label={t("collapseAria")}
            title={t("collapseAria")}
          >
            <span aria-hidden className="text-xs font-bold">
              −
            </span>
          </button>
          {isTerminal(visibleJob.status) ? (
            <button
              type="button"
              className="rounded-md p-1.5 text-violet-800 transition-colors hover:bg-violet-200/50 dark:text-violet-200 dark:hover:bg-violet-900/50"
              onClick={dismissCurrentJob}
              aria-label={t("dismissAria")}
              title={t("dismissAria")}
            >
              <span aria-hidden className="text-xs">
                ×
              </span>
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-xs text-violet-800/90 dark:text-violet-200/90">
        {t("details", {
          processed: visibleJob.artistsProcessed,
          max: visibleJob.maxArtists,
          ratio: ratioText,
          target: visibleJob.targetUnknownPct.toFixed(1),
        })}
      </p>
      <div className="mt-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-violet-200/70 dark:bg-violet-900/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressValue}
          aria-label={t("progressAria")}
        >
          <div
            className="h-full rounded-full bg-accent-violet transition-[width] duration-300 ease-out"
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] font-medium tabular-nums text-violet-800 dark:text-violet-200">
          {progressValue}%
        </p>
      </div>
      {hasBackfillInProgress || isPaused ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {hasBackfillInProgress ? (
            <button
              type="button"
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-violet-300/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-900 transition-colors hover:bg-violet-100/80 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/80 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-900/50"
              disabled={isPausing || isCancelling}
              onClick={() => void pauseBackfill()}
            >
              {isPausing ? t("pausing") : t("pause")}
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-accent-violet px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isResuming || isCancelling}
              onClick={() => void resumeBackfill()}
            >
              {isResuming ? t("resuming") : t("resume")}
            </button>
          )}
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-red-300/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
            disabled={isPausing || isCancelling || isResuming}
            onClick={() => void cancelBackfill()}
          >
            {isCancelling ? t("cancelling") : t("cancel")}
          </button>
        </div>
      ) : null}
      {showNextSessionCta ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-violet-900/90 dark:text-violet-100/90">
            {visibleJob.status === "failed"
              ? t("nextSessionAfterError")
              : t("nextSessionPrompt", {
                  current: visibleJob.currentUnknownPct?.toFixed(1) ?? "0.0",
                  target: visibleJob.targetUnknownPct.toFixed(1),
                })}
          </p>
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-accent-violet px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isStarting}
            onClick={() => void startAnotherSession()}
          >
            {isStarting ? t("starting") : t("startNextSession")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
