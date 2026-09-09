"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pause, Play, X } from "lucide-react";
import { toast } from "sonner";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_GLASS_FLOATING_PANE,
  DASHBOARD_SECTION_EYEBROW,
} from "@/lib/components/dashboard-ui";
import {
  GENRE_BACKFILL_OPEN_PROGRESS_EVENT,
  GENRE_BACKFILL_PROGRESS_PANEL_ID,
} from "@/lib/constants/genre-backfill-result-notification";
import { useGenreBackfillJob } from "@/lib/context/genre-backfill-job-context";

export {
  GENRE_BACKFILL_OPEN_PROGRESS_EVENT,
  GENRE_BACKFILL_PROGRESS_PANEL_ID,
} from "@/lib/constants/genre-backfill-result-notification";

const PANEL_ACTION =
  `${DASHBOARD_BTN_GHOST} min-h-11 flex-1 px-3 text-[13px]`;

/**
 * Crystal header chip for an active/paused Groq genre backfill.
 * Replaces the former full-width marketing banner in the dashboard layout.
 */
export function GenreBackfillGlobalBadge() {
  const t = useTranslations("dashboard.genreBackfill");
  const { job, refreshStatus } = useGenreBackfillJob();
  const [open, setOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const isActive =
    job != null &&
    (job.status === "pending" || job.status === "running" || job.status === "paused");
  const isPaused = job?.status === "paused";
  const isRunning = job?.status === "pending" || job?.status === "running";

  const progressValue = useMemo(() => {
    if (!job || job.maxArtists <= 0) return null;
    return Math.min(100, Math.round((job.artistsProcessed / job.maxArtists) * 100));
  }, [job]);

  const ratioText = useMemo(() => {
    if (!job) return "";
    if (job.initialUnknownPct != null && job.currentUnknownPct != null) {
      return `${job.initialUnknownPct.toFixed(1)}% → ${job.currentUnknownPct.toFixed(1)}%`;
    }
    if (job.currentUnknownPct != null) {
      return `${job.currentUnknownPct.toFixed(1)}%`;
    }
    return t("ratioPending");
  }, [job, t]);

  const openFromHash = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === `#${GENRE_BACKFILL_PROGRESS_PANEL_ID}`) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    const onOpenEvent = () => setOpen(true);
    window.addEventListener(GENRE_BACKFILL_OPEN_PROGRESS_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      window.removeEventListener(GENRE_BACKFILL_OPEN_PROGRESS_EVENT, onOpenEvent);
    };
  }, [openFromHash]);

  useEffect(() => {
    if (!isActive) setOpen(false);
  }, [isActive]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const pauseBackfill = useCallback(async () => {
    setIsPausing(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/pause", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "NO_ACTIVE_JOB") toast.error(t("cancelNoJob"));
        else if (data.error === "NOTHING_TO_CANCEL") toast.error(t("cancelNothing"));
        else toast.error(t("cancelError"));
        return;
      }
      toast.success(t("cancelledToast"));
      setOpen(false);
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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
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

  if (!isActive || !job) return null;

  const heading = isPaused ? t("pausedHeading") : t("running");
  const chipLabel = isPaused ? t("chipPaused") : t("chipRunning");

  return (
    <div ref={wrapRef} id={GENRE_BACKFILL_PROGRESS_PANEL_ID} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("chipOpenAria")}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-11 min-h-11 max-w-[11rem] items-center gap-2 rounded-full border border-glass-hairline bg-surface-raised/80 px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {isRunning ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-muted motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <Pause className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        )}
        <span className="hidden truncate sm:inline">{chipLabel}</span>
        {progressValue != null ? (
          <span className="tabular-nums text-muted">{progressValue}%</span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={heading}
          className={`absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden ${DASHBOARD_GLASS_FLOATING_PANE}`}
        >
          <div className="border-b border-glass-hairline px-4 py-3">
            <p className={DASHBOARD_SECTION_EYEBROW}>{t("panelEyebrow")}</p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">{heading}</p>
            <p className="mt-1 text-[12px] tabular-nums text-muted">
              {t("detailsInline", {
                processed: job.artistsProcessed,
                max: job.maxArtists,
                ratio: ratioText,
                target: job.targetUnknownPct.toFixed(1),
              })}
            </p>
          </div>

          <div className="px-4 py-3">
            {job.maxArtists > 0 && progressValue != null ? (
              <div>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="text-[12px] text-muted">{t("progressLabel")}</span>
                  <span className="text-[12px] font-medium tabular-nums text-foreground">
                    {progressValue}%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressValue}
                  aria-label={t("progressAria")}
                >
                  <div
                    className="h-full rounded-full bg-foreground/80 motion-safe:transition-[width] motion-safe:duration-500"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>
            ) : isRunning ? (
              <p className="flex items-center gap-2 text-[12px] text-muted" role="status">
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
                {t("batchPreparing")}
              </p>
            ) : null}
          </div>

          <div className="flex items-stretch border-t border-glass-hairline">
            {isRunning ? (
              <button
                type="button"
                className={PANEL_ACTION}
                disabled={isPausing || isCancelling}
                onClick={() => void pauseBackfill()}
              >
                <Pause className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {isPausing ? t("pausing") : t("pause")}
              </button>
            ) : (
              <button
                type="button"
                className={PANEL_ACTION}
                disabled={isResuming || isCancelling}
                onClick={() => void resumeBackfill()}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                {isResuming ? t("resuming") : t("resume")}
              </button>
            )}
            <span className="w-px shrink-0 self-stretch bg-glass-hairline" aria-hidden />
            <button
              type="button"
              className={`${PANEL_ACTION} text-accent-rose hover:text-accent-rose`}
              disabled={isPausing || isCancelling || isResuming}
              onClick={() => void cancelBackfill()}
            >
              <X className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {isCancelling ? t("cancelling") : t("cancel")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
