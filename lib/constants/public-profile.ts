/**
 * Legacy demo UUID — only used when explicitly referenced in env or tests.
 * Public demo is disabled by default; set NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID to enable.
 */
export const LEGACY_DEMO_PUBLIC_PROFILE_USER_ID =
  "1bbbb9f2-3f82-469b-a50d-fc3b4f48bb21";

/** @deprecated Use getPublicProfileUserId() — no hardcoded public profile in production. */
export const DEFAULT_PUBLIC_PROFILE_USER_ID = LEGACY_DEMO_PUBLIC_PROFILE_USER_ID;

declare global {
  interface Window {
    __AMA_PUBLIC_PROFILE_USER_ID__?: string | null;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function readEnvPublicProfileUserId(): string | null {
  const raw = process.env.NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID;
  if (raw === "") return null;
  const trimmed = raw?.trim();
  if (trimmed && isUuidString(trimmed)) return trimmed;
  return null;
}

/** Env candidate for public demo — does not imply the user has opted in. */
export function getConfiguredPublicProfileUserId(): string | null {
  return readEnvPublicProfileUserId();
}

/**
 * Active public demo user: configured in env AND explicit opt-in (server-side).
 */
/**
 * Resolved public demo id for client UI (injected by root layout after opt-in check).
 * On the server, use {@link resolveActivePublicProfileUserId} instead.
 */
export function getPublicProfileUserId(): string | null {
  if (typeof window === "undefined") return null;

  const injected = window.__AMA_PUBLIC_PROFILE_USER_ID__;
  if (injected === null || injected === "") return null;
  if (typeof injected === "string" && isUuidString(injected)) return injected;
  return null;
}

/** Append `userId` for anonymous public-demo navigation (dashboard routes only). */
export function withPublicDemoUserId(
  href: string,
  publicUserId: string | null = getPublicProfileUserId()
): string {
  if (!publicUserId || !href.startsWith("/dashboard")) return href;
  if (href.includes("userId=")) return href;

  const qIndex = href.indexOf("?");
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  const query = qIndex === -1 ? "" : href.slice(qIndex + 1);
  const params = new URLSearchParams(query);
  params.set("userId", publicUserId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Dashboard overview path for the optional public demo, or null when disabled. */
export function getPublicDemoOverviewPath(): string | null {
  const id = getPublicProfileUserId();
  if (!id) return null;
  return withPublicDemoUserId("/dashboard/overview", id);
}
