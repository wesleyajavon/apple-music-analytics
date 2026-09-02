/** @vitest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { CookieConsentBanner } from "@/lib/components/cookie-consent-banner";
import {
  CookieConsentProvider,
  useCookieConsent,
} from "@/lib/providers/cookie-consent-provider";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  DEFAULT_COOKIE_CONSENT,
  buildStoredConsent,
} from "@/lib/constants/cookie-consent";

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function ConsentProbe({
  paints,
}: {
  paints: Array<{ hydrated: boolean; hasDecided: boolean }>;
}) {
  const { hydrated, hasDecided } = useCookieConsent();
  paints.push({ hydrated, hasDecided });
  return null;
}

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("does not show the banner on the first render, before storage is read", () => {
    const paints: Array<{ hydrated: boolean; hasDecided: boolean }> = [];
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(buildStoredConsent(DEFAULT_COOKIE_CONSENT))
    );

    render(
      <CookieConsentProvider>
        <ConsentProbe paints={paints} />
        <CookieConsentBanner />
      </CookieConsentProvider>
    );

    expect(paints[0]).toEqual({ hydrated: false, hasDecided: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show the banner after hydration when a current choice is stored", () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(buildStoredConsent(DEFAULT_COOKIE_CONSENT))
    );

    render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the banner after hydration when no choice is stored", async () => {
    render(
      <CookieConsentProvider>
        <CookieConsentBanner />
      </CookieConsentProvider>
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "cookieConsent.title" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("text-white");
    expect(screen.getByRole("button", { name: "cookieConsent.acceptAll" })).toHaveClass(
      "bg-brand-gradient"
    );
  });
});
