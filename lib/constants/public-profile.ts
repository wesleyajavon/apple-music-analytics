/**
 * Single app user whose analytics may be viewed without authentication
 * when `?userId=<this id>` is present on dashboard and API requests.
 *
 * Override with NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID (set to empty string to disable public access).
 */
export const DEFAULT_PUBLIC_PROFILE_USER_ID =
  "1bbbb9f2-3f82-469b-a50d-fc3b4f48bb21";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Server, edge, and client (NEXT_PUBLIC_* is inlined at build time). */
export function getPublicProfileUserId(): string | null {
  const raw = process.env.NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID;
  if (raw === "") return null;
  const trimmed = raw?.trim();
  if (trimmed) {
    return isUuidString(trimmed) ? trimmed : null;
  }
  return DEFAULT_PUBLIC_PROFILE_USER_ID;
}
