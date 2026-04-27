export const RECENT_AUTH_REQUIRED_CODE = "RECENT_AUTH_REQUIRED";

export const DEFAULT_RECENT_AUTH_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function getRecentAuthMaxAgeMinutes(maxAgeMs = DEFAULT_RECENT_AUTH_MAX_AGE_MS) {
  return Math.round(maxAgeMs / 60_000);
}
