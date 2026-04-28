"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";

/**
 * Carte overview quand l’IA est coupée (réponse `aiUnavailable` de l’API).
 * Garde le même en-tête + lien que les widgets IA pour un layout stable.
 */
export function AiFeatureDisabledPlaceholder({
  title,
  subtitle,
  seeMoreHref,
  seeMoreLabel,
  reason,
}: {
  title: string;
  subtitle: string;
  seeMoreHref?: string;
  seeMoreLabel?: string;
  reason: AiUnavailableReason;
}) {
  const t = useTranslations("aiMasterToggle");
  const hint =
    reason === "env" ? t("widgetHintEnvLocked") : t("widgetHint");

  return (
    <div
      className="overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 shadow-card min-h-[220px] flex flex-col"
      role="status"
      aria-label={hint}
    >
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          </div>
          {seeMoreHref && seeMoreLabel && (
            <Link
              href={seeMoreHref}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
                text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
                transition-colors duration-200 shrink-0"
            >
              {seeMoreLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-center">
        <div className="flex gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          </span>
          <p className="text-sm text-muted-foreground leading-relaxed">{hint}</p>
        </div>
      </div>
    </div>
  );
}
