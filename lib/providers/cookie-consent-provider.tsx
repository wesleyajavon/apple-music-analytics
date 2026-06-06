"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ALL_COOKIE_CONSENT,
  buildStoredConsent,
  COOKIE_CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_CONSENT,
  parseStoredConsent,
  type CookieConsentCategories,
  type StoredCookieConsent,
} from "@/lib/constants/cookie-consent";

type CookieConsentContextValue = {
  consent: CookieConsentCategories;
  hasDecided: boolean;
  acceptAll: () => void;
  acceptNecessaryOnly: () => void;
  savePreferences: (categories: Omit<CookieConsentCategories, "necessary">) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function persistConsent(categories: CookieConsentCategories): StoredCookieConsent {
  const stored = buildStoredConsent(categories);
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(stored));
  window.dispatchEvent(new CustomEvent("ama-cookie-consent-changed", { detail: stored }));
  return stored;
}

async function syncConsentToServer(categories: CookieConsentCategories) {
  try {
    await fetch("/api/user/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consentType: "cookie",
        consentVersion: buildStoredConsent(categories).version,
        granted: categories.analytics || categories.errorMonitoring || categories.sessionReplay,
        categories: {
          analytics: categories.analytics,
          errorMonitoring: categories.errorMonitoring,
          sessionReplay: categories.sessionReplay,
        },
      }),
    });
  } catch {
    // Best-effort: anonymous visitors or offline — localStorage is source of truth.
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredCookieConsent | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    setStored(parseStoredConsent(raw));
    setHydrated(true);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<StoredCookieConsent>).detail;
      if (detail) setStored(detail);
    };
    window.addEventListener("ama-cookie-consent-changed", onChange);
    return () => window.removeEventListener("ama-cookie-consent-changed", onChange);
  }, []);

  const applyConsent = useCallback((categories: CookieConsentCategories) => {
    const next = persistConsent(categories);
    setStored(next);
    void syncConsentToServer(categories);
  }, []);

  const acceptAll = useCallback(() => applyConsent(ALL_COOKIE_CONSENT), [applyConsent]);

  const acceptNecessaryOnly = useCallback(
    () => applyConsent(DEFAULT_COOKIE_CONSENT),
    [applyConsent]
  );

  const savePreferences = useCallback(
    (prefs: Omit<CookieConsentCategories, "necessary">) => {
      applyConsent({ necessary: true, ...prefs });
    },
    [applyConsent]
  );

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent: stored?.categories ?? DEFAULT_COOKIE_CONSENT,
      hasDecided: hydrated && stored !== null,
      acceptAll,
      acceptNecessaryOnly,
      savePreferences,
    }),
    [stored, hydrated, acceptAll, acceptNecessaryOnly, savePreferences]
  );

  return (
    <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}

/** Read consent from localStorage without React context (for Sentry init). */
export function readCookieConsentFromStorage(): CookieConsentCategories {
  if (typeof window === "undefined") return DEFAULT_COOKIE_CONSENT;
  const stored = parseStoredConsent(
    window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
  );
  return stored?.categories ?? DEFAULT_COOKIE_CONSENT;
}
