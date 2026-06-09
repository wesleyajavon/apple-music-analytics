"use client";

import { useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPathname, Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { TERMS_CONSENT_VERSION } from "@/lib/constants/legal-consent";
import {
  AUTH_CARD_CLASS,
  AUTH_MAIN_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "@/lib/constants/auth-form-styles";

function getSafeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function AcceptTermsPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const errorId = useId();
  const nextPath = getSafeNextPath(searchParams.get("next"));
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAccept() {
    if (!accepted) {
      setError(t("termsConsentRequired"));
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentType: "terms",
          consentVersion: TERMS_CONSENT_VERSION,
          granted: true,
        }),
      });
      if (res.status === 401) {
        window.location.assign(getPathname({ href: "/sign-in", locale }));
        return;
      }
      if (!res.ok) {
        setError(t("acceptTermsError"));
        return;
      }
      // Full navigation keeps Supabase session cookies in sync after OAuth callback.
      window.location.assign(getPathname({ href: nextPath, locale }));
    } catch {
      setError(t("acceptTermsError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main id="auth-main" tabIndex={-1} className={AUTH_MAIN_CLASS}>
      <section className={AUTH_CARD_CLASS} aria-labelledby="accept-terms-heading">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("acceptTermsEyebrow")}
        </p>
        <h1
          id="accept-terms-heading"
          className="mt-2 text-xl font-bold tracking-tight text-foreground lg:text-3xl"
        >
          {t("acceptTermsTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("acceptTermsSubtitle")}</p>

        <label className="mt-8 flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
            checked={accepted}
            onChange={(e) => {
              setAccepted(e.target.checked);
              if (error === t("termsConsentRequired")) setError(null);
            }}
          />
          <span>
            {t.rich("termsConsentLabel", {
              terms: () => (
                <Link href="/legal/terms" className="font-medium text-primary underline-offset-2 hover:underline">
                  {t("termsLink")}
                </Link>
              ),
              privacy: () => (
                <Link href="/legal/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
                  {t("privacyLink")}
                </Link>
              ),
            })}
          </span>
        </label>

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void onAccept()}
          className={`mt-6 ${AUTH_PRIMARY_BUTTON_CLASS}`}
        >
          {isLoading ? t("acceptTermsSaving") : t("acceptTermsButton")}
        </button>
      </section>
    </main>
  );
}
