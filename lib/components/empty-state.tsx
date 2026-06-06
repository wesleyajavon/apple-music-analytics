/**
 * Composant réutilisable pour afficher un état vide avec messages contextuels,
 * actions suggérées et illustrations (SVG ou Lucide).
 */

"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import {
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_SURFACE_BASE,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";
import { BarChart3, Inbox } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  /** Message principal */
  message?: string;
  /** Description ou précision contextuelle */
  description?: string;
  /** Illustration textuelle optionnelle (ignorée si illustration est fournie) */
  icon?: string;
  /** Illustration personnalisée (SVG, composant). Si fourni, remplace icon. */
  illustration?: React.ReactNode;
  /** Actions suggérées (boutons/liens) */
  actions?: EmptyStateAction[];
  className?: string;
  variant?: "default" | "startup";
  eyebrow?: string;
  aside?: string;
}

/** Illustrations SVG légères pour les états vides */
const ILLUSTRATIONS = {
  stats: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  calendar: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  filter: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  ),
  music: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  ),
  replay: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
} as const;

export type EmptyStateIllustrationKey = keyof typeof ILLUSTRATIONS;

function DefaultEmptyIllustration() {
  return (
    <Inbox
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      strokeWidth={1.2}
      aria-hidden
    />
  );
}

export function EmptyState({
  message,
  description,
  icon,
  illustration,
  actions,
  className = "",
  variant = "default",
  eyebrow,
  aside,
}: EmptyStateProps) {
  const t = useTranslations("components.emptyState");
  const displayMessage = message ?? t("defaultMessage");

  const visual =
    illustration ??
    (icon ? (
      <div
        className="mb-6 text-6xl transform transition-transform duration-300 hover:scale-110"
        aria-hidden
      >
        {icon}
      </div>
    ) : (
      <DefaultEmptyIllustration />
    ));

  if (variant === "startup") {
    const statusEyebrow = eyebrow ?? t("startupEmptyEyebrow");
    const asideLabel = aside ?? t("startupEmptyAside");

    return (
      <div className={`w-full ${className}`} role="status" aria-label={displayMessage}>
        <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} relative flex min-h-[320px] flex-col sm:min-h-[300px]`}>
          <OverviewStartupSurfaceBg />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div className="min-w-0">
              {statusEyebrow ? (
                <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
                  <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
                  {statusEyebrow}
                </div>
              ) : null}
              <h3 className="mt-2 text-pretty text-2xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-3xl">
                {displayMessage}
              </h3>
              {description ? (
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  {description}
                </p>
              ) : null}
              {actions && actions.length > 0 ? (
                <div className="mt-7 flex flex-wrap gap-3">
                  {actions.map((action, idx) => {
                    const isPrimary = idx === 0;
                    const primaryClass =
                      "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/25 transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:shadow-black/30 dark:hover:bg-gray-100 dark:focus-visible:ring-offset-slate-900";
                    const secondaryClass =
                      "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/10 dark:text-white dark:shadow-none dark:hover:bg-white/15 dark:focus-visible:ring-offset-slate-900";

                    if (action.href) {
                      return (
                        <Link
                          key={`${action.label}-${idx}`}
                          href={action.href}
                          className={isPrimary ? primaryClass : secondaryClass}
                        >
                          {action.label}
                        </Link>
                      );
                    }
                    return (
                      <button
                        key={`${action.label}-${idx}`}
                        type="button"
                        onClick={action.onClick}
                        className={isPrimary ? primaryClass : secondaryClass}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="relative min-w-0">
              <div className="pointer-events-none absolute -inset-1 rounded-[1.75rem] bg-gradient-to-br from-violet-500/12 via-transparent to-cyan-500/14 blur-xl dark:from-violet-400/18" />
              <div className="relative flex flex-col items-center justify-center gap-4 rounded-[1.75rem] border border-slate-200/90 bg-slate-50/80 px-6 py-10 dark:border-white/10 dark:bg-slate-900/60">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/15 dark:bg-white/5">
                  <BarChart3 className="h-8 w-8 text-slate-500 dark:text-slate-300" strokeWidth={1.25} aria-hidden />
                </div>
                <p className="text-center font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {asideLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center py-16 ${className}`}
      role="status"
      aria-label={displayMessage}
    >
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6 flex justify-center [&>svg]:shrink-0">
          {visual}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {displayMessage}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {description}
          </p>
        )}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions.map((action, idx) => {
              const isPrimary = idx === 0;
              if (action.href) {
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={
                      isPrimary
                        ? "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                        : "inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    }
                  >
                    {action.label}
                  </Link>
                );
              }
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={
                    isPrimary
                      ? "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      : "inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  }
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Hook qui retourne les presets d'état vide traduits */
export function useEmptyStatePresets() {
  const t = useTranslations("components.emptyState");
  const { publicDemoOverviewPath: publicDemoHref } = usePublicDemo();

  const actionsWithPublicDemo = (primaryHref: string, primaryLabel: string): EmptyStateAction[] => [
    { label: primaryLabel, href: primaryHref },
    ...(publicDemoHref
      ? ([{ label: t("publicDemoLabel"), href: publicDemoHref }] as EmptyStateAction[])
      : []),
  ];

  return {
    importData: {
      message: t("importData.message"),
      description: t("importData.description"),
      illustration: ILLUSTRATIONS.stats,
      actions: actionsWithPublicDemo(
        DASHBOARD_ONBOARDING_REIMPORT_PATH,
        t("importData.actionLabel"),
      ),
    },
    importReplay: {
      message: t("importReplay.message"),
      description: t("importReplay.description"),
      illustration: ILLUSTRATIONS.replay,
      actions: actionsWithPublicDemo(
        DASHBOARD_ONBOARDING_REIMPORT_PATH,
        t("importReplay.actionLabel"),
      ),
    },
    changeDates: (basePath: string) => ({
      message: t("changeDates.message"),
      description: t("changeDates.description"),
      illustration: ILLUSTRATIONS.filter,
      actions: [{ label: t("changeDates.actionLabel"), href: basePath }] as EmptyStateAction[],
    }),
    noDayDetail: {
      message: t("noDayDetail.message"),
      description: t("noDayDetail.description"),
      illustration: ILLUSTRATIONS.music,
    },
  };
}

export { ILLUSTRATIONS };
