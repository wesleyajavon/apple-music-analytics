/**
 * Composant réutilisable pour afficher un état d'erreur
 */

"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ApiError } from "@/lib/api-client";
import {
  getGroqQuotaUserFacingMessage,
  isGroqDailyQuotaError,
} from "@/lib/utils/groq-quota-message";
import { AlertTriangle } from "lucide-react";
import {
  OVERVIEW_STARTUP_EYEBROW_PILL_CLASS,
  OVERVIEW_STARTUP_HEADER_LINK_CLASS,
  OVERVIEW_STARTUP_INNER_PANEL_CLASS,
  OVERVIEW_STARTUP_SURFACE_BASE,
  OverviewStartupSurfaceBg,
} from "@/lib/components/overview-startup-surface";

interface ErrorStateProps {
  error: Error | null;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  message,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const locale = useLocale();
  const t = useTranslations("components.errorState");
  const tErrors = useTranslations("errors");
  const quotaMessage = error
    ? getGroqQuotaUserFacingMessage(error, tErrors, locale)
    : null;
  const rateLimitMessage = (() => {
    if (!(error instanceof ApiError)) return null;
    if (error.code !== "RATE_LIMIT_EXCEEDED") return null;
    const retryAfterSeconds = error.rateLimit?.retryAfterSeconds;
    if (retryAfterSeconds === undefined) return null;

    if (retryAfterSeconds >= 60) {
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return tErrors("rateLimitRetryAfterMinutes", { minutes });
    }
    return tErrors("rateLimitRetryAfterSeconds", { seconds: retryAfterSeconds });
  })();
  const displayMessage =
    quotaMessage ?? rateLimitMessage ?? message ?? t("defaultMessage");
  const retryLabel = t("retry");
  const showTechnicalDetail =
    error && !isGroqDailyQuotaError(error);
  const showRetry = onRetry && !isGroqDailyQuotaError(error);

  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6 flex justify-center">
          <AlertTriangle
            className={`h-24 w-24 ${
              isGroqDailyQuotaError(error)
                ? "text-amber-500 dark:text-amber-400"
                : "text-red-500 dark:text-red-400"
            }`}
            strokeWidth={1.15}
            aria-hidden
          />
        </div>
        <h3
          className={`text-lg font-semibold mb-3 ${
            isGroqDailyQuotaError(error)
              ? "text-amber-800 dark:text-amber-200"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {displayMessage}
        </h3>
        {showTechnicalDetail && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 font-mono break-words">
              {error.message}
            </p>
          </div>
        )}
        {showRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover dark:hover:bg-primary-hover transition-colors font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Bannière compacte pour quota IA (cartes, widgets). */
export function GroqQuotaNotice({
  error,
  className = "",
}: {
  error: Error | null | undefined;
  className?: string;
}) {
  const locale = useLocale();
  const tErrors = useTranslations("errors");
  const msg = error
    ? getGroqQuotaUserFacingMessage(error, tErrors, locale)
    : null;
  if (!msg) return null;
  return (
    <div
      role="alert"
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40 ${className}`}
    >
      <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
        {msg}
      </p>
    </div>
  );
}

/**
 * Carte widget (overview) : garde le header + lien « voir plus » quand l’IA échoue (quota ou autre).
 */
export function AiWidgetQuotaOrError({
  title,
  subtitle,
  seeMoreHref,
  seeMoreLabel,
  error,
  surface = "standard",
  eyebrow,
}: {
  title: string;
  subtitle: string;
  seeMoreHref?: string;
  seeMoreLabel?: string;
  error: Error;
  surface?: "standard" | "startup";
  eyebrow?: string;
}) {
  const isStartup = surface === "startup";
  return (
    <div
      className={
        isStartup
          ? `${OVERVIEW_STARTUP_SURFACE_BASE} flex min-h-[280px] flex-col`
          : "flex min-h-[220px] flex-col overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card"
      }
    >
      {isStartup ? <OverviewStartupSurfaceBg /> : null}
      <div
        className={
          isStartup
            ? "relative border-b border-white/10 px-6 py-5 sm:px-8"
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
                  ? "text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl"
                  : "text-lg font-semibold text-gray-900 dark:text-white"
              }
            >
              {title}
            </h2>
            <p
              className={
                isStartup
                  ? "mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base"
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
      <div className={isStartup ? "relative flex-1 p-6 sm:p-8" : "flex-1 p-6"}>
        {isStartup ? (
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            {isGroqDailyQuotaError(error) ? (
              <GroqQuotaNotice error={error} />
            ) : (
              <p className="text-sm text-red-300" role="alert">
                {error.message}
              </p>
            )}
          </div>
        ) : isGroqDailyQuotaError(error) ? (
          <GroqQuotaNotice error={error} />
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}
