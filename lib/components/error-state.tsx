/**
 * Composant réutilisable pour afficher un état d'erreur
 */

"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getGroqQuotaUserFacingMessage,
  isGroqDailyQuotaError,
} from "@/lib/utils/groq-quota-message";

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
  const displayMessage =
    quotaMessage ?? message ?? t("defaultMessage");
  const retryLabel = t("retry");
  const showTechnicalDetail =
    error && !isGroqDailyQuotaError(error);
  const showRetry = onRetry && !isGroqDailyQuotaError(error);

  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-6">⚠️</div>
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
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
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
}: {
  title: string;
  subtitle: string;
  seeMoreHref: string;
  seeMoreLabel: string;
  error: Error;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[220px] flex flex-col">
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
        </div>
      </div>
      <div className="p-6 flex-1">
        {isGroqDailyQuotaError(error) ? (
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
