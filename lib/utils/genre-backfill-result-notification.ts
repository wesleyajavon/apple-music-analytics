const ACTIVE_STATUSES = new Set(["pending", "running", "paused"]);

export type GenreBackfillNotifyStatus = "completed" | "failed";

/**
 * Fire an inbox item only when a job the session already observed as active
 * reaches a terminal result. First snapshot (including a job already completed
 * on hydrate) must not notify.
 */
export function shouldNotifyGenreBackfillTransition(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined
): nextStatus is GenreBackfillNotifyStatus {
  if (previousStatus == null) return false;
  if (!ACTIVE_STATUSES.has(previousStatus)) return false;
  return nextStatus === "completed" || nextStatus === "failed";
}
