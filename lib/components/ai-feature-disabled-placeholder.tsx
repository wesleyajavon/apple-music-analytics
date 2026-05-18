"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";
import {
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_HEADER_LINK_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OVERVIEW_STARTUP_SURFACE_BASE,
  OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS,
  OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS,
  OVERVIEW_STARTUP_WIDGET_TITLE_CLASS,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";

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
  surface = "standard",
  eyebrow,
}: {
  title: string;
  subtitle: string;
  seeMoreHref?: string;
  seeMoreLabel?: string;
  reason: AiUnavailableReason;
  surface?: "standard" | "startup";
  eyebrow?: string;
}) {
  const t = useTranslations("aiMasterToggle");
  const hint =
    reason === "env" ? t("widgetHintEnvLocked") : t("widgetHint");

  const isStartup = surface === "startup";

  return (
    <div
      className={
        isStartup
          ? `${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col`
          : "flex min-h-[220px] flex-col overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 shadow-card"
      }
      role="status"
      aria-label={hint}
    >
      {isStartup ? <OverviewStartupSurfaceBg /> : null}
      <div
        className={
          isStartup
            ? `relative ${OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS} px-6 py-5 sm:px-8`
            : "border-b border-gray-100 px-6 py-4 dark:border-gray-700/50"
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {isStartup && eyebrow ? (
              <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
                <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
                {eyebrow}
              </div>
            ) : null}
            <h2
              className={
                isStartup
                  ? OVERVIEW_STARTUP_WIDGET_TITLE_CLASS
                  : "text-lg font-semibold text-gray-900 dark:text-white"
              }
            >
              {title}
            </h2>
            <p
              className={
                isStartup
                  ? OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS
                  : "mt-0.5 text-sm text-gray-500 dark:text-gray-400"
              }
            >
              {subtitle}
            </p>
          </div>
          {seeMoreHref && seeMoreLabel ? (
            <Link
              href={seeMoreHref}
              className={
                isStartup
                  ? OVERVIEW_STARTUP_HEADER_LINK_CLASS
                  : "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-violet transition-colors duration-200 hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20"
              }
            >
              {seeMoreLabel}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : null}
        </div>
      </div>
      <div
        className={
          isStartup
            ? "relative flex flex-1 flex-col justify-center p-6 sm:p-8"
            : "flex flex-1 flex-col justify-center p-6"
        }
      >
        {isStartup ? (
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            <div className="flex gap-3">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-cyan-100"
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
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{hint}</p>
            </div>
          </div>
        ) : (
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
            <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
