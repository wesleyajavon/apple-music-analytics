"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { GROQ_AI_CONSENT_SETTINGS_PATH } from "@/lib/constants/groq-ai-settings";

type GroqAiConsentSettingsLinkProps = {
  className?: string;
  variant?: "default" | "button";
};

export function GroqAiConsentSettingsLink({
  className = "",
  variant = "default",
}: GroqAiConsentSettingsLinkProps) {
  const tPrompt = useTranslations("groqAiConsentPrompt");
  const tToggle = useTranslations("aiMasterToggle");

  const baseClass =
    variant === "button"
      ? "inline-flex shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 no-underline transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-100 dark:hover:bg-violet-400/15"
      : "inline-flex items-center gap-1 text-sm font-semibold text-accent-violet no-underline transition hover:underline";

  const label = variant === "button" ? tToggle("enableGroqCta") : tPrompt("manageInSettings");

  return (
    <Link href={GROQ_AI_CONSENT_SETTINGS_PATH} className={`${baseClass} ${className}`.trim()}>
      {label}
    </Link>
  );
}
