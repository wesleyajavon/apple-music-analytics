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
import { AlertTriangle, Unplug } from "lucide-react";
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

interface ErrorStateProps {
  error: Error | null;
  message?: string;
  onRetry?: () => void;
  className?: string;
  variant?: "default" | "startup";
  eyebrow?: string;
  hint?: string;
}

export function ErrorState({
  error,
  message,
  onRetry,
  className = "",
  variant = "default",
  eyebrow,
  hint,
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
  const detailLabel = t("detailLabel");
  const showTechnicalDetail =
    error && !isGroqDailyQuotaError(error);
  const showRetry = onRetry && !isGroqDailyQuotaError(error);
  const isQuota = isGroqDailyQuotaError(error);

  if (variant === "startup") {
    const statusEyebrow = eyebrow ?? t("startupFallbackEyebrow");
    return (
      <div className={`w-full ${className}`}>
        <div className={`${OVERVIEW_STARTUP_SURFACE_BASE} relative flex min-h-[320px] flex-col sm:min-h-[280px]`}>
          <OverviewStartupSurfaceBg />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div className="min-w-0">
              {statusEyebrow ? (
                <div className={OVERVIEW_STARTUP_EYEBROW_PILL_CLASS}>
                  <span
                    className={`h-2 w-2 rounded-full shadow-[0_0_16px_currentColor] ${
                      isQuota ? "bg-amber-400 text-amber-400" : "bg-accent-emerald text-emerald-400"
                    }`}
                  />
                  {statusEyebrow}
                </div>
              ) : null}
              <h3
                className={`mt-2 text-pretty text-2xl font-semibold tracking-[-0.04em] sm:text-3xl ${
                  isQuota
                    ? "text-amber-900 dark:text-amber-100"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {displayMessage}
              </h3>
              {hint ? (
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  {hint}
                </p>
              ) : null}
              {showRetry ? (
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/25 transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:shadow-black/30 dark:hover:bg-gray-100 dark:focus-visible:ring-offset-slate-900"
                  >
                    {retryLabel}
                  </button>
                </div>
              ) : null}
            </div>
            <div className="relative min-w-0">
              <div className="pointer-events-none absolute -inset-1 rounded-[1.75rem] bg-gradient-to-br from-cyan-500/15 via-transparent to-violet-500/12 blur-xl dark:from-cyan-400/20" />
              <div className="relative flex flex-col items-center justify-center gap-4 rounded-[1.75rem] border border-slate-200/90 bg-slate-50/80 px-6 py-10 dark:border-white/10 dark:bg-slate-900/60">
                {isQuota ? (
                  <AlertTriangle
                    className="h-14 w-14 text-amber-500 dark:text-amber-400"
                    strokeWidth={1.15}
                    aria-hidden
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/15 dark:bg-white/5">
                    <Unplug
                      className="h-8 w-8 text-slate-500 dark:text-slate-300"
                      strokeWidth={1.25}
                      aria-hidden
                    />
                  </div>
                )}
                <p className="text-center font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {isQuota ? t("startupQuotaAside") : t("startupOfflineAside")}
                </p>
              </div>
            </div>
          </div>
          {showTechnicalDetail ? (
            <div className="relative border-t border-slate-200/80 px-6 py-5 sm:px-8 dark:border-white/10">
              <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {detailLabel}
              </p>
              <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
                <p className="text-sm text-red-700 dark:text-red-300/95 font-mono break-words leading-relaxed">
                  {error.message}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6 flex justify-center">
          <AlertTriangle
            className={`h-24 w-24 ${
              isQuota
                ? "text-amber-500 dark:text-amber-400"
                : "text-red-500 dark:text-red-400"
            }`}
            strokeWidth={1.15}
            aria-hidden
          />
        </div>
        <h3
          className={`text-lg font-semibold mb-3 ${
            isQuota
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
      <div className={isStartup ? "relative flex-1 p-6 sm:p-8" : "flex-1 p-6"}>
        {isStartup ? (
          <div className={OVERVIEW_STARTUP_INNER_PANEL_CLASS}>
            {isGroqDailyQuotaError(error) ? (
              <GroqQuotaNotice error={error} />
            ) : (
              <p className="text-sm text-red-700 dark:text-red-300" role="alert">
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
