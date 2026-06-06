"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useCookieConsent } from "@/lib/providers/cookie-consent-provider";
import { LegalRelatedLinks } from "@/lib/components/legal-related-links";

type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export function CookiePolicyDocument() {
  const t = useTranslations("legal.cookies");
  const tConsent = useTranslations("cookieConsent");
  const { consent, acceptAll, acceptNecessaryOnly, savePreferences } = useCookieConsent();

  const sections = t.raw("sections") as LegalSection[];

  const [analytics, setAnalytics] = useState(consent.analytics);
  const [errorMonitoring, setErrorMonitoring] = useState(consent.errorMonitoring);
  const [sessionReplay, setSessionReplay] = useState(consent.sessionReplay);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setAnalytics(consent.analytics);
    setErrorMonitoring(consent.errorMonitoring);
    setSessionReplay(consent.sessionReplay);
  }, [consent]);

  const handleSave = () => {
    savePreferences({
      analytics,
      errorMonitoring,
      sessionReplay: errorMonitoring && sessionReplay,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 4000);
  };

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-card-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-muted">{t("lastUpdated")}</p>
        <p className="mt-4 text-base leading-relaxed text-muted">{t("intro")}</p>
      </header>

      <div className="space-y-10">
        {sections.map((section, index) => (
          <section key={index} aria-labelledby={`legal-section-${index}`}>
            <h2
              id={`legal-section-${index}`}
              className="text-xl font-semibold text-foreground"
            >
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} className="text-sm leading-relaxed text-muted sm:text-base">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted sm:text-base">
                {section.bullets.map((bullet, bIndex) => (
                  <li key={bIndex}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section
          aria-labelledby="cookie-preferences"
          className="rounded-2xl border border-card-border bg-card/40 p-5 sm:p-6"
        >
          <h2 id="cookie-preferences" className="text-xl font-semibold text-foreground">
            {t("preferences.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
            {t("preferences.description")}
          </p>

          <div className="mt-5 space-y-3 rounded-xl border border-card-border bg-card/60 p-4">
            <label className="flex items-start gap-3 opacity-70">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {tConsent("necessaryTitle")}
                </span>
                <span className="text-xs text-muted">{tConsent("necessaryDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {tConsent("analyticsTitle")}
                </span>
                <span className="text-xs text-muted">{tConsent("analyticsDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={errorMonitoring}
                onChange={(e) => setErrorMonitoring(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {tConsent("monitoringTitle")}
                </span>
                <span className="text-xs text-muted">{tConsent("monitoringDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={sessionReplay}
                onChange={(e) => setSessionReplay(e.target.checked)}
                disabled={!errorMonitoring}
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {tConsent("replayTitle")}
                </span>
                <span className="text-xs text-muted">{tConsent("replayDesc")}</span>
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {tConsent("savePreferences")}
            </button>
            <button
              type="button"
              onClick={acceptNecessaryOnly}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border px-4 text-sm font-medium text-foreground transition hover:bg-card"
            >
              {tConsent("rejectNonEssential")}
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border px-4 text-sm font-medium text-foreground transition hover:bg-card"
            >
              {tConsent("acceptAll")}
            </button>
          </div>

          {savedNotice ? (
            <p
              role="status"
              className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300"
            >
              {t("preferences.saved")}
            </p>
          ) : null}
        </section>

        <LegalRelatedLinks
          title={t("related.title")}
          description={t("related.description")}
          links={[
            { href: "/legal/privacy", label: t("related.privacyLink") },
            { href: "/legal/terms", label: t("related.termsLink") },
          ]}
        />
      </div>
    </article>
  );
}
