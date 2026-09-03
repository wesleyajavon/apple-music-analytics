"use client";

import { useTranslations } from "next-intl";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";
import { EmptyState } from "@/lib/components/empty-state";
import { useAiUnavailableCopy } from "@/lib/components/ai-unavailable-cta";
import { useGroqAiConsentPrompt } from "@/lib/context/groq-ai-consent-prompt-context";
import { GROQ_AI_CONSENT_SETTINGS_PATH } from "@/lib/constants/groq-ai-settings";

/**
 * Full-page empty state for AI features when Groq is off.
 * Must not reuse the import-data empty state: listening history is already present.
 */
export function AiUnavailableEmptyState({
  reason = "consent",
  onGranted,
}: {
  reason?: AiUnavailableReason;
  onGranted?: () => void;
}) {
  const t = useTranslations("aiMasterToggle");
  const tPrompt = useTranslations("groqAiConsentPrompt");
  const copy = useAiUnavailableCopy(reason);
  const { openGroqAiConsentPrompt } = useGroqAiConsentPrompt();

  const actions =
    reason === "consent"
      ? [
          {
            label: t("enableGroqCta"),
            onClick: () => openGroqAiConsentPrompt({ onGranted }),
          },
          {
            label: tPrompt("manageInSettings"),
            href: GROQ_AI_CONSENT_SETTINGS_PATH,
          },
        ]
      : undefined;

  return (
    <EmptyState
      variant="startup"
      eyebrow={t("unavailableEyebrow")}
      aside={t("unavailableAside")}
      message={copy.title}
      description={copy.description}
      actions={actions}
    />
  );
}
