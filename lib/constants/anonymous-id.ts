import { ANONYMOUS_ID_COOKIE } from "@/lib/auth/anonymous-id-cookie";

export const ANONYMOUS_ID_STORAGE_KEY = "ama_anonymous_id";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function persistAnonymousIdCookie(id: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ANONYMOUS_ID_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
  if (existing) {
    persistAnonymousIdCookie(existing);
    return existing;
  }
  const id = crypto.randomUUID();
  window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, id);
  persistAnonymousIdCookie(id);
  return id;
}
