import type { NextRequest, NextResponse } from "next/server";
import { TERMS_CONSENT_VERSION } from "@/lib/constants/legal-consent";

export const OAUTH_TERMS_COOKIE = "ama_oauth_terms";
const COOKIE_MAX_AGE_SECONDS = 600;

function readCookieValue(request: NextRequest, name: string): string | null {
  if ("cookies" in request && typeof request.cookies?.get === "function") {
    const fromCookies = request.cookies.get(name)?.value;
    if (fromCookies) return fromCookies;
  }
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.slice(name.length + 1);
    }
  }
  return null;
}

/** Set before redirecting to an OAuth provider (sign-up / sign-in with terms accepted). */
export function setOAuthTermsCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${OAUTH_TERMS_COOKIE}=${encodeURIComponent(TERMS_CONSENT_VERSION)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function readOAuthTermsCookie(request: NextRequest): string | null {
  const raw = readCookieValue(request, OAUTH_TERMS_COOKIE);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function clearOAuthTermsCookie(response: NextResponse): void {
  response.cookies.set(OAUTH_TERMS_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}

export function oauthTermsCookieMatchesVersion(value: string | null): boolean {
  return value === TERMS_CONSENT_VERSION;
}
