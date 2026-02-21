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
