"use client";

import { SentryInit } from "@/lib/components/sentry-init";
import { useCookieConsent } from "@/lib/providers/cookie-consent-provider";

export function ConditionalSentry() {
  const { consent, hasDecided } = useCookieConsent();
  if (!hasDecided || !consent.errorMonitoring) return null;
  return <SentryInit enableReplay={consent.sessionReplay} />;
}
