"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCookieConsent } from "@/lib/providers/cookie-consent-provider";

export function CookieConsentBanner() {
  const t = useTranslations("cookieConsent");
  const { hasDecided, acceptAll, acceptNecessaryOnly, savePreferences } =
    useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [errorMonitoring, setErrorMonitoring] = useState(false);
  const [sessionReplay, setSessionReplay] = useState(false);

  if (hasDecided) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-card-border bg-surface-glass p-4 shadow-2xl backdrop-blur-md sm:p-6"
    >
      <div className="mx-auto max-w-3xl">
        <h2 id="cookie-consent-title" className="text-base font-semibold text-foreground">
          {t("title")}
        </h2>
        <p id="cookie-consent-desc" className="mt-2 text-sm leading-relaxed text-muted">
          {t("description")}{" "}
          <Link href="/legal/cookies" className="font-medium text-primary underline-offset-2 hover:underline">
            {t("learnMore")}
          </Link>
        </p>

        {showDetails ? (
          <div className="mt-4 space-y-3 rounded-xl border border-card-border bg-card/60 p-4">
            <label className="flex items-start gap-3 opacity-70">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <span className="block text-sm font-medium text-foreground">{t("necessaryTitle")}</span>
                <span className="text-xs text-muted">{t("necessaryDesc")}</span>
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
                <span className="block text-sm font-medium text-foreground">{t("analyticsTitle")}</span>
                <span className="text-xs text-muted">{t("analyticsDesc")}</span>
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
                <span className="block text-sm font-medium text-foreground">{t("monitoringTitle")}</span>
                <span className="text-xs text-muted">{t("monitoringDesc")}</span>
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
                <span className="block text-sm font-medium text-foreground">{t("replayTitle")}</span>
                <span className="text-xs text-muted">{t("replayDesc")}</span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border px-4 text-sm font-medium text-foreground transition hover:bg-card"
            >
              {t("customize")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                savePreferences({
                  analytics,
                  errorMonitoring,
                  sessionReplay: errorMonitoring && sessionReplay,
                })
              }
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border px-4 text-sm font-medium text-foreground transition hover:bg-card"
            >
              {t("savePreferences")}
            </button>
          )}
          <button
            type="button"
            onClick={acceptNecessaryOnly}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border px-4 text-sm font-medium text-foreground transition hover:bg-card"
          >
            {t("rejectNonEssential")}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
