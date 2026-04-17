"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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

  if (!job || (job.status !== "pending" && job.status !== "running")) {
    return null;
  }

  const ratioText =
    job.initialUnknownPct != null && job.currentUnknownPct != null
      ? `${job.initialUnknownPct.toFixed(1)}% -> ${job.currentUnknownPct.toFixed(1)}%`
      : t("genreBackfill.ratioPending");
  const progress =
    job.maxArtists > 0 ? Math.min(100, Math.round((job.artistsProcessed / job.maxArtists) * 100)) : 0;

  return (
    <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/70 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/25">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
          {t("genreBackfill.running")}
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
    </div>
  );
}
