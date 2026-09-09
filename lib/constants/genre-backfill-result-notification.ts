/** Prefix for terminal Groq backfill results (`completed` / `failed`). */
export const GENRE_BACKFILL_RESULT_SOURCE_PREFIX = "genre-backfill:";

export function genreBackfillResultSource(jobId: string): string {
  return `${GENRE_BACKFILL_RESULT_SOURCE_PREFIX}${jobId}`;
}

/** Activity / overview — terminal results live in NotificationCenter, not a layout banner. */
export const GENRE_BACKFILL_RESULT_HREF = "/dashboard/overview";

/** DOM id for the header progress chip (kept for existing #anchors). */
export const GENRE_BACKFILL_PROGRESS_PANEL_ID = "genre-backfill-global-badge-panel";

/** Window event to expand the header progress chip. */
export const GENRE_BACKFILL_OPEN_PROGRESS_EVENT = "soundprint:genre-backfill-open-progress";
