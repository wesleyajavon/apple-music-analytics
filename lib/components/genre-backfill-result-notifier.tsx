"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GENRE_AI_NUDGE_NOTIFICATION_SOURCE } from "@/lib/constants/genre-ai-nudge-notification";
import {
  GENRE_BACKFILL_RESULT_HREF,
  genreBackfillResultSource,
} from "@/lib/constants/genre-backfill-result-notification";
import { useGenreBackfillJob } from "@/lib/context/genre-backfill-job-context";
import { useNotifications } from "@/lib/context/notification-center-context";
import { useHideNotificationCenterForPublicDemo } from "@/lib/hooks/use-public-demo-viewer";
import { shouldNotifyGenreBackfillTransition } from "@/lib/utils/genre-backfill-result-notification";

/**
 * Inbox item when a Groq backfill the session already saw as active
 * reaches completed or failed. Does not fire on first hydrate of a terminal job.
 */
export function GenreBackfillResultNotifier() {
  const searchParams = useSearchParams();
  const hideForDemo = useHideNotificationCenterForPublicDemo(searchParams.get("userId"));
  const { addNotification, markReadBySource, hydrated } = useNotifications();
  const { job } = useGenreBackfillJob();
  const t = useTranslations("components.notificationCenter");
  const prevStatusRef = useRef<string | null | undefined>(undefined);
  const hasSnapshotRef = useRef(false);

  const jobId = job?.id;
  const jobStatus = job?.status ?? null;

  useEffect(() => {
    if (!hydrated || hideForDemo) return;

    if (!hasSnapshotRef.current) {
      hasSnapshotRef.current = true;
      prevStatusRef.current = jobStatus;
      return;
    }

    const previousStatus = prevStatusRef.current;
    prevStatusRef.current = jobStatus;

    if (!jobId || !shouldNotifyGenreBackfillTransition(previousStatus, jobStatus)) {
      return;
    }

    addNotification({
      title:
        jobStatus === "failed"
          ? t("genreBackfillResult.failed.title")
          : t("genreBackfillResult.completed.title"),
      body:
        jobStatus === "failed"
          ? t("genreBackfillResult.failed.body")
          : t("genreBackfillResult.completed.body"),
      severity: jobStatus === "failed" ? "error" : "success",
      href: GENRE_BACKFILL_RESULT_HREF,
      source: genreBackfillResultSource(jobId),
      genreBackfillResult: { jobId, status: jobStatus },
    });

    if (jobStatus === "completed") {
      markReadBySource(GENRE_AI_NUDGE_NOTIFICATION_SOURCE);
    }
  }, [
    addNotification,
    hideForDemo,
    hydrated,
    jobId,
    jobStatus,
    markReadBySource,
    t,
  ]);

  return null;
}
