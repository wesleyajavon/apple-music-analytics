"use client";

import { RECENT_AUTH_REQUIRED_CODE } from "@/lib/auth/recent-auth-constants";

type ApiErrorPayload = {
  code?: string;
};

export function isRecentAuthRequiredError(payload: ApiErrorPayload | null | undefined) {
  return payload?.code === RECENT_AUTH_REQUIRED_CODE;
}

export function redirectToRecentSignIn(returnTo?: string) {
  const fallback = "/dashboard";
  const target =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : fallback;

  window.location.href = `/sign-in?reason=recent-auth&next=${encodeURIComponent(target)}`;
}
