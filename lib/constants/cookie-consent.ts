export const COOKIE_CONSENT_STORAGE_KEY = "ama-cookie-consent-v1";
export const COOKIE_CONSENT_VERSION = "2026-06-01";

export type CookieConsentCategories = {
  necessary: true;
  analytics: boolean;
  errorMonitoring: boolean;
  sessionReplay: boolean;
};

export type StoredCookieConsent = {
  version: string;
  decidedAt: string;
  categories: CookieConsentCategories;
};

export const DEFAULT_COOKIE_CONSENT: CookieConsentCategories = {
  necessary: true,
  analytics: false,
  errorMonitoring: false,
  sessionReplay: false,
};

export const ALL_COOKIE_CONSENT: CookieConsentCategories = {
  necessary: true,
  analytics: true,
  errorMonitoring: true,
  sessionReplay: true,
};

export function parseStoredConsent(raw: string | null): StoredCookieConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredCookieConsent;
    if (
      parsed?.version &&
      parsed?.decidedAt &&
      parsed?.categories?.necessary === true &&
      typeof parsed.categories.analytics === "boolean" &&
      typeof parsed.categories.errorMonitoring === "boolean" &&
      typeof parsed.categories.sessionReplay === "boolean"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function buildStoredConsent(
  categories: CookieConsentCategories
): StoredCookieConsent {
  return {
    version: COOKIE_CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    categories,
  };
}
