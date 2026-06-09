"use client";

import { useEffect, useRef } from "react";
import { ANONYMOUS_ID_STORAGE_KEY } from "@/lib/constants/anonymous-id";

/**
 * Best-effort: links pre-login cookie consent rows to the authenticated user.
 */
export function LinkAnonymousConsent() {
  const linkedRef = useRef(false);

  useEffect(() => {
    if (linkedRef.current) return;
    const anonymousId = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
    if (!anonymousId) return;

    linkedRef.current = true;
    void fetch("/api/user/consent/link-anonymous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ anonymousId }),
    });
  }, []);

  return null;
}
