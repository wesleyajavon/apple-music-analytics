"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

type JobStatus = "pending" | "running" | "completed" | "failed";

type BackfillJob = {
  id: string;
  status: JobStatus;
  targetUnknownPct: number;
  initialUnknownPct: number | null;
  currentUnknownPct: number | null;
  artistsProcessed: number;
  maxArtists: number;
};

export function GenreBackfillGlobalBadge() {
  const t = useTranslations("dashboard");
  const [job, setJob] = useState<BackfillJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status");
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { job?: BackfillJob | null };
      setJob(data.job ?? null);
    } catch {
      // Non-blocking dashboard enhancement.
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const id = window.setInterval(() => {
      void loadStatus();
    }, 5000);
    return () => window.clearInterval(id);
  }, [loadStatus]);

  const startAnotherSession = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? t("genreBackfill.startError"));
        return;
      }
      toast.success(t("genreBackfill.started"));
      await loadStatus();
    } catch {
      toast.error(t("genreBackfill.startError"));
    } finally {
      setIsStarting(false);
    }
  }, [loadStatus, t]);

  if (!job) {
    return null;
  }

  const hasBackfillInProgress = job.status === "pending" || job.status === "running";
  const canSuggestNextSession =
    (job.status === "completed" || job.status === "failed") &&
    job.currentUnknownPct != null &&
    job.currentUnknownPct > job.targetUnknownPct;

  const ratioText =
    job.initialUnknownPct != null && job.currentUnknownPct != null
      ? `${job.initialUnknownPct.toFixed(1)}% -> ${job.currentUnknownPct.toFixed(1)}%`
      : t("genreBackfill.ratioPending");
  const progress =
    job.maxArtists > 0
      ? Math.min(100, Math.round((job.artistsProcessed / job.maxArtists) * 100))
      : hasBackfillInProgress
        ? 0
        : 100;

  return (
    <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/70 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/25">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
          {hasBackfillInProgress
            ? t("genreBackfill.running")
            : job.status === "failed"
              ? t("genreBackfill.failed")
              : t("genreBackfill.completed")}
        </p>
        <span className="rounded-full bg-violet-200/70 px-2 py-0.5 text-xs font-semibold text-violet-900 dark:bg-violet-900/60 dark:text-violet-100">
          {progress}%
        </span>
      </div>
      <p className="mt-1 text-xs text-violet-800/90 dark:text-violet-200/90">
        {t("genreBackfill.details", {
          processed: job.artistsProcessed,
          max: job.maxArtists,
          ratio: ratioText,
          target: job.targetUnknownPct.toFixed(1),
        })}
      </p>
      {canSuggestNextSession ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-violet-900/90 dark:text-violet-100/90">
            {job.status === "failed"
              ? t("genreBackfill.nextSessionAfterError")
              : t("genreBackfill.nextSessionPrompt", {
                  current: job.currentUnknownPct?.toFixed(1) ?? "0.0",
                  target: job.targetUnknownPct.toFixed(1),
                })}
          </p>
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-accent-violet px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isStarting}
            onClick={() => void startAnotherSession()}
          >
            {isStarting ? t("genreBackfill.starting") : t("genreBackfill.startNextSession")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
