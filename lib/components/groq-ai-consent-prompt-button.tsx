"use client";

import { useTranslations } from "next-intl";
import { useGroqAiConsentPrompt } from "@/lib/context/groq-ai-consent-prompt-context";

type GroqAiConsentPromptButtonProps = {
  className?: string;
  variant?: "button" | "inline";
  onGranted?: () => void;
};

export function GroqAiConsentPromptButton({
  className = "",
  variant = "button",
  onGranted,
}: GroqAiConsentPromptButtonProps) {
  const t = useTranslations("aiMasterToggle");
  const { openGroqAiConsentPrompt } = useGroqAiConsentPrompt();

  const baseClass =
    variant === "button"
      ? "inline-flex shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-100 dark:hover:bg-violet-400/15"
      : "inline-flex items-center gap-1 text-sm font-semibold text-accent-violet underline-offset-2 hover:underline";

  return (
    <button
      type="button"
      className={`${baseClass} ${className}`.trim()}
      onClick={() => openGroqAiConsentPrompt({ onGranted })}
    >
      {t("enableGroqCta")}
    </button>
  );
}
