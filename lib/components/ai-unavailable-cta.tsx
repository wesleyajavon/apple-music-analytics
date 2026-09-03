"use client";

import { useTranslations } from "next-intl";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";
import { GroqAiConsentPromptButton } from "@/lib/components/groq-ai-consent-prompt-button";
import { GroqAiConsentSettingsLink } from "@/lib/components/groq-ai-consent-settings-link";

export function useAiUnavailableCopy(reason: AiUnavailableReason = "consent") {
  const t = useTranslations("aiMasterToggle");
  if (reason === "env") {
    return {
      title: t("unavailableTitleEnv"),
      description: t("unavailableDescriptionEnv"),
      hint: t("widgetHintEnvLocked"),
    };
  }
  if (reason === "client") {
    return {
      title: t("unavailableTitleClient"),
      description: t("unavailableDescriptionClient"),
      hint: t("widgetHint"),
    };
  }
  return {
    title: t("unavailableTitle"),
    description: t("unavailableDescriptionConsent"),
    hint: t("widgetHintConsentRequired"),
  };
}

export function AiUnavailableConsentActions({
  onGranted,
  className = "",
}: {
  onGranted?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`.trim()}>
      <GroqAiConsentPromptButton variant="button" onGranted={onGranted} />
      <GroqAiConsentSettingsLink variant="default" className="text-xs font-medium" />
    </div>
  );
}

/**
 * Compact notice when Groq AI is off: explains the real cause and offers
 * Enable Groq (consent) rather than another data import.
 */
export function AiUnavailableCta({
  reason = "consent",
  onGranted,
  className = "",
  tone = "default",
}: {
  reason?: AiUnavailableReason;
  onGranted?: () => void;
  className?: string;
  tone?: "default" | "onDark";
}) {
  const copy = useAiUnavailableCopy(reason);
  const textClass =
    tone === "onDark"
      ? "text-sm leading-6 text-white/70"
      : "text-sm leading-relaxed text-slate-600 dark:text-slate-300";

  return (
    <div className={`space-y-3 ${className}`.trim()} role="status" aria-label={copy.title}>
      <p className={textClass}>{copy.description}</p>
      {reason === "consent" ? <AiUnavailableConsentActions onGranted={onGranted} /> : null}
    </div>
  );
}
