"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

const ONBOARDING_RAIL_CLASS = "bg-brand-gradient";

const GENRE_AI_SURFACE =
  "relative overflow-hidden rounded-2xl border border-card-border bg-card-surface bg-gradient-to-br from-primary/[0.07] via-transparent to-accent-cyan/[0.05] shadow-card ring-1 ring-primary/[0.12] dark:from-primary/[0.11] dark:to-accent-indigo/[0.06] dark:ring-primary/[0.16]";

export const ONBOARDING_GENRE_AI_ACCEPT_BTN =
  "group inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:min-w-[min(100%,260px)]";

export const ONBOARDING_GENRE_AI_DECLINE_BTN =
  "inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-card-border bg-surface-raised px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/28 hover:bg-primary/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/12 dark:bg-white/[0.06] dark:hover:border-white/22 dark:hover:bg-white/[0.1] sm:w-auto sm:min-w-[min(100%,200px)]";

export function GenreAiPanelChrome({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${GENRE_AI_SURFACE} ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(var(--border-rgb)_/_0.5)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--border-rgb)_/_0.42)_1px,transparent_1px)] bg-[size:22px_22px] opacity-[0.45] dark:opacity-[0.28]" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ONBOARDING_RAIL_CLASS} opacity-85`} />
      <div className="relative">{children}</div>
    </div>
  );
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
      <GenreAiPanelChrome className="p-5 sm:p-6">
        <div className="space-y-5">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.12)] ring-1 ring-primary/25 dark:bg-primary/20"
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
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.1] px-4 py-3 text-sm font-medium leading-snug text-amber-950 shadow-inner dark:text-amber-50">
              {t("genreLlmConsent.missingKey")}
            </div>
          ) : (
            <div className="rounded-xl border border-card-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted shadow-inner dark:bg-surface-raised/80">
              {t("genreLlmConsent.privacy")}
            </div>
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
                  <Sparkles className="h-4 w-4 shrink-0 opacity-90 transition-transform duration-200 group-hover:scale-105" aria-hidden />
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
      <GenreAiPanelChrome className="p-5 sm:p-6">
        <div className="space-y-5">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.12)] ring-1 ring-primary/25 dark:bg-primary/20"
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
          <div className="space-y-2 rounded-xl border border-card-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted shadow-inner dark:bg-surface-raised/80">
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
                  <Sparkles className="h-4 w-4 shrink-0 opacity-90 transition-transform duration-200 group-hover:scale-105" aria-hidden />
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
