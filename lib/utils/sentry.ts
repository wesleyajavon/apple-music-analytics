/**
 * Helpers Sentry pour Next.js App Router
 * 
 * Utilitaires pour capturer des erreurs, messages et ajouter du contexte à Sentry.
 * 
 * Note: L'initialisation de Sentry se fait automatiquement via :
 * - SentryInit dans app/layout.tsx (côté client)
 * - sentry.server.config.ts (côté serveur, chargé via instrumentation.ts)
 * 
 * @see https://docs.sentry.dev/platforms/javascript/guides/nextjs/manual-setup/
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Capture une erreur dans Sentry
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value });
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture un message dans Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Ajoute du contexte utilisateur à Sentry
 */
export function setUser(user: { id?: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

/**
 * Ajoute du contexte supplémentaire à Sentry
 */
export function setContext(key: string, context: Record<string, unknown>) {
  Sentry.setContext(key, context);
}

/**
 * Ajoute des tags à Sentry
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Signal dédié pour les pics de rate-limit (429).
 */
export function captureRateLimitSpike(params: {
  route: string;
  blockedInMinute: number;
  threshold: number;
  subject?: string;
}) {
  Sentry.withScope((scope) => {
    scope.setLevel("warning");
    scope.setTag("signal", "rate_limit_spike");
    scope.setTag("route", params.route);
    scope.setContext("rate_limit_spike", {
      route: params.route,
      blockedInMinute: params.blockedInMinute,
      threshold: params.threshold,
      subject: params.subject,
    });
    Sentry.captureMessage("Rate limit spike detected", "warning");
  });
}
