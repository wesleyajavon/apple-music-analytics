"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCookieConsent } from "@/lib/providers/cookie-consent-provider";

const GHOST_BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand-glow transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]";

export function CookieConsentBanner() {
  const t = useTranslations("cookieConsent");
  const { hasDecided, hydrated, acceptAll, acceptNecessaryOnly, savePreferences } =
    useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [errorMonitoring, setErrorMonitoring] = useState(false);
  const [sessionReplay, setSessionReplay] = useState(false);

  if (!hydrated || hasDecided) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-[#080913]/90 p-4 text-white shadow-[0_-18px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-6"
    >
      <div className="mx-auto max-w-3xl">
        <h2 id="cookie-consent-title" className="text-base font-semibold text-white">
          {t("title")}
        </h2>
        <p id="cookie-consent-desc" className="mt-2 text-sm leading-relaxed text-white/68">
          {t("description")}{" "}
          <Link
            href="/legal/cookies"
            className="font-medium text-white underline-offset-2 hover:underline"
          >
            {t("learnMore")}
          </Link>
        </p>

        {showDetails ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="flex items-start gap-3 opacity-70">
              <input type="checkbox" checked disabled className="mt-1 accent-white" />
              <span>
                <span className="block text-sm font-medium text-white">{t("necessaryTitle")}</span>
                <span className="text-xs text-white/55">{t("necessaryDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 accent-white"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-white">{t("analyticsTitle")}</span>
                <span className="text-xs text-white/55">{t("analyticsDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 accent-white"
                checked={errorMonitoring}
                onChange={(e) => setErrorMonitoring(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-white">{t("monitoringTitle")}</span>
                <span className="text-xs text-white/55">{t("monitoringDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 accent-white"
                checked={sessionReplay}
                onChange={(e) => setSessionReplay(e.target.checked)}
                disabled={!errorMonitoring}
              />
              <span>
                <span className="block text-sm font-medium text-white">{t("replayTitle")}</span>
                <span className="text-xs text-white/55">{t("replayDesc")}</span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {!showDetails ? (
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className={GHOST_BUTTON_CLASS}
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
              className={GHOST_BUTTON_CLASS}
            >
              {t("savePreferences")}
            </button>
          )}
          <button
            type="button"
            onClick={acceptNecessaryOnly}
            className={GHOST_BUTTON_CLASS}
          >
            {t("rejectNonEssential")}
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className={PRIMARY_BUTTON_CLASS}
          >
            {t("acceptAll")}
          </button>
        </div>
      </div>
    </div>
  );
}
