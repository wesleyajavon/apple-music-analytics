const OPT_OUT_KEY = "ama-genre-backfill-banner-opt-out";
const DISMISSED_JOB_ID_KEY = "ama-genre-backfill-banner-dismissed-job-id";
const COLLAPSED_KEY = "ama-genre-backfill-banner-collapsed";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / private mode
  }
}

/** After “Not now” on post-import Groq consent: hide terminal backfill summaries on the dashboard. */
export function setGenreBackfillBannerOptOut(optOut: boolean): void {
  writeStorage(OPT_OUT_KEY, optOut ? "1" : null);
}

export function getGenreBackfillBannerOptOut(): boolean {
  return readStorage(OPT_OUT_KEY) === "1";
}

/** Hide a specific job summary until the server returns a different job id. */
export function setGenreBackfillBannerDismissedJobId(jobId: string | null): void {
  writeStorage(DISMISSED_JOB_ID_KEY, jobId);
}

export function getGenreBackfillBannerDismissedJobId(): string | null {
  return readStorage(DISMISSED_JOB_ID_KEY);
}

export function setGenreBackfillBannerCollapsed(collapsed: boolean): void {
  writeStorage(COLLAPSED_KEY, collapsed ? "1" : null);
}

export function getGenreBackfillBannerCollapsed(): boolean {
  return readStorage(COLLAPSED_KEY) === "1";
}

/** Call after the user explicitly starts a Groq backfill session. */
export function clearGenreBackfillBannerBlockingPrefs(): void {
  writeStorage(OPT_OUT_KEY, null);
  writeStorage(DISMISSED_JOB_ID_KEY, null);
}
