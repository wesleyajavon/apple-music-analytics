"use client";

import { useMemo } from "react";
import { useGenreBackfillJobSafe } from "@/lib/context/genre-backfill-job-context";

/**
 * True while a Groq genre classification job is queued or running for the dashboard user.
 * Paused jobs do not block — user explicitly freed capacity for interactive AI.
 */
export function useInteractiveAiBlockedByGenreBackfill(): boolean {
  const ctx = useGenreBackfillJobSafe();
  return useMemo(() => {
    const s = ctx?.job?.status;
    return s === "pending" || s === "running";
  }, [ctx?.job?.status]);
}
