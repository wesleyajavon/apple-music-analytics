"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useCookieConsent } from "@/lib/providers/cookie-consent-provider";

export function ConditionalAnalytics() {
  const { consent, hasDecided } = useCookieConsent();
  if (!hasDecided || !consent.analytics) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
