/** Prefix for terminal Groq backfill results (`completed` / `failed`). */
export const GENRE_BACKFILL_RESULT_SOURCE_PREFIX = "genre-backfill:";

export function genreBackfillResultSource(jobId: string): string {
  return `${GENRE_BACKFILL_RESULT_SOURCE_PREFIX}${jobId}`;
}

/** Dashboard (main) layout hosts the live job banner. */
export const GENRE_BACKFILL_RESULT_HREF = "/dashboard/overview#genre-backfill-global-badge-panel";
