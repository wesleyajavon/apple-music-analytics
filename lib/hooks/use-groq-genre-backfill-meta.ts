"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { clearGenreBackfillBannerBlockingPrefs } from "@/lib/utils/genre-backfill-banner-prefs";

export type GroqEligibility = {
  unknownTrackCount: number;
  unknownRatio: number;
  totalTrackCount: number;
  groqConfigured: boolean;
};

export type GroqJobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type GroqGenreBackfillMeta = {
  loaded: boolean;
  eligibility: GroqEligibility | null;
  jobStatus: GroqJobStatus | null;
  errorStatus: number | null;
};

export function useGroqGenreBackfillMeta(viewerUserId?: string | null) {
  const [meta, setMeta] = useState<GroqGenreBackfillMeta>({
    loaded: false,
    eligibility: null,
    jobStatus: null,
    errorStatus: null,
  });
  const [isStarting, setIsStarting] = useState(false);

  const refreshMeta = useCallback(async () => {
    if (viewerUserId) {
      setMeta({ loaded: true, eligibility: null, jobStatus: null, errorStatus: null });
      return;
    }

    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status?includeEligibility=1", {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        eligibility?: GroqEligibility;
        job?: { status: GroqJobStatus } | null;
      };

      if (!res.ok) {
        setMeta({
          loaded: true,
          eligibility: null,
          jobStatus: null,
          errorStatus: res.status,
        });
        return;
      }

      setMeta({
        loaded: true,
        eligibility: data.eligibility ?? null,
        jobStatus: data.job?.status ?? null,
        errorStatus: null,
      });
    } catch {
      setMeta({ loaded: true, eligibility: null, jobStatus: null, errorStatus: null });
    }
  }, [viewerUserId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshMeta();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMeta]);

  const startBackfill = useCallback(
    async (startErrorMessage: string, startedToastMessage: string) => {
      setIsStarting(true);
      try {
        const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          toast.error(data?.error ?? startErrorMessage);
          return false;
        }

        clearGenreBackfillBannerBlockingPrefs();
        toast.success(startedToastMessage);
        await refreshMeta();
        window.setTimeout(() => {
          document.getElementById("genre-backfill-global-badge-panel")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 200);
        return true;
      } catch {
        toast.error(startErrorMessage);
        return false;
      } finally {
        setIsStarting(false);
      }
    },
    [refreshMeta]
  );

  const isJobActive =
    meta.jobStatus === "pending" ||
    meta.jobStatus === "running" ||
    meta.jobStatus === "paused";

  return {
    meta,
    isStarting,
    isJobActive,
    refreshMeta,
    startBackfill,
  };
}
