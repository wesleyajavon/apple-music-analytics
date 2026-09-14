"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_BTN_GRADIENT,
  DASHBOARD_BTN_OUTLINE,
} from "@/lib/components/dashboard-ui";

const GENRE_AI_SURFACE =
  "relative space-y-0 border-y border-glass-hairline py-5 sm:py-6";

export const ONBOARDING_GENRE_AI_ACCEPT_BTN = `${DASHBOARD_BTN_GRADIENT} min-h-12 w-full shrink-0 sm:w-auto sm:min-w-[min(100%,260px)]`;

export const ONBOARDING_GENRE_AI_DECLINE_BTN = `${DASHBOARD_BTN_OUTLINE} min-h-12 w-full shrink-0 sm:w-auto sm:min-w-[min(100%,200px)]`;

export function GenreAiPanelChrome({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${GENRE_AI_SURFACE} ${className}`}>{children}</div>;
}

export function OnboardingGenreLlmConsentCard({
  unknownTrackCount,
  unknownRatio,
  groqConfigured,
  isStarting,
  hasActiveGroqJob,
  onAccept,
  onDecline,
}: {
  unknownTrackCount: number;
  unknownRatio: number;
  groqConfigured: boolean;
  isStarting: boolean;
  hasActiveGroqJob: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const t = useTranslations("onboarding");

  return (
    <section aria-labelledby="onboarding-genre-llm-consent-heading">
      <GenreAiPanelChrome>
        <div className="space-y-5">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14"
              aria-hidden
            >
              <Sparkles className="h-5 w-5 text-accent-cyan" />
            </div>
            <div className="min-w-0 space-y-2">
              <h3
                id="onboarding-genre-llm-consent-heading"
                className="text-base font-semibold leading-snug text-foreground sm:text-[1.05rem]"
              >
                {t("genreLlmConsent.title")}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                {t("genreLlmConsent.body", {
                  unknown: unknownTrackCount,
                  pct: unknownRatio.toFixed(1),
                })}
              </p>
            </div>
          </div>
          {!groqConfigured ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.1] px-4 py-3 text-sm font-medium leading-snug text-amber-950 dark:text-amber-50">
              {t("genreLlmConsent.missingKey")}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              {t("genreLlmConsent.privacy")}
            </p>
          )}
          <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:flex-wrap lg:items-stretch">
            <button
              type="button"
              className={`${ONBOARDING_GENRE_AI_ACCEPT_BTN} sm:flex-1`}
              disabled={!groqConfigured || isStarting || hasActiveGroqJob}
              onClick={onAccept}
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  <span>{t("genreLlmConsent.starting")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span>{t("genreLlmConsent.accept")}</span>
                </>
              )}
            </button>
            <button
              type="button"
              className={`${ONBOARDING_GENRE_AI_DECLINE_BTN} sm:flex-1`}
              disabled={isStarting}
              onClick={onDecline}
            >
              {t("genreLlmConsent.decline")}
            </button>
          </div>
        </div>
      </GenreAiPanelChrome>
    </section>
  );
}

export function OnboardingGroqEnableCard({
  isEnabling,
  onAccept,
  onDecline,
}: {
  isEnabling: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const t = useTranslations("onboarding");
  const tConsent = useTranslations("groqAiConsentPrompt");

  return (
    <section aria-labelledby="onboarding-groq-enable-heading">
      <GenreAiPanelChrome>
        <div className="space-y-5">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14"
              aria-hidden
            >
              <Sparkles className="h-5 w-5 text-accent-cyan" />
            </div>
            <div className="min-w-0 space-y-2">
              <h3
                id="onboarding-groq-enable-heading"
                className="text-base font-semibold leading-snug text-foreground sm:text-[1.05rem]"
              >
                {t("groqEnableInvite.title")}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{t("groqEnableInvite.body")}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs leading-relaxed text-muted">
            <p>{tConsent("body")}</p>
            <p>{tConsent("bulletTransfer")}</p>
            <p>{tConsent("bulletRevoke")}</p>
            <p>
              <Link
                href="/legal/privacy"
                className="font-semibold text-accent-violet underline-offset-2 hover:underline"
              >
                {tConsent("privacyLink")}
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:flex-wrap lg:items-stretch">
            <button
              type="button"
              className={`${ONBOARDING_GENRE_AI_ACCEPT_BTN} sm:flex-1`}
              disabled={isEnabling}
              onClick={onAccept}
            >
              {isEnabling ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  <span>{t("groqEnableInvite.enabling")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span>{t("groqEnableInvite.accept")}</span>
                </>
              )}
            </button>
            <button
              type="button"
              className={`${ONBOARDING_GENRE_AI_DECLINE_BTN} sm:flex-1`}
              disabled={isEnabling}
              onClick={onDecline}
            >
              {t("groqEnableInvite.decline")}
            </button>
          </div>
        </div>
      </GenreAiPanelChrome>
    </section>
  );
}
