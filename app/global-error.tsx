"use client";

import { useEffect, useState } from "react";
import { routing } from "@/i18n/routing";

/** Messages statiques pour quand le provider n'est pas disponible (global-error) */
const FALLBACK_MESSAGES: Record<string, Record<string, string>> = {
  fr: {
    criticalError: "Erreur critique",
    criticalErrorMessage: "Une erreur critique s'est produite. L'application a été réinitialisée.",
    errorDetails: "Détails de l'erreur (développement)",
    retry: "Réessayer",
  },
  en: {
    criticalError: "Critical error",
    criticalErrorMessage: "A critical error occurred. The application has been reset.",
    errorDetails: "Error details (development)",
    retry: "Retry",
  },
  es: {
    criticalError: "Error crítico",
    criticalErrorMessage: "Se ha producido un error crítico. La aplicación se ha reiniciado.",
    errorDetails: "Detalles del error (desarrollo)",
    retry: "Reintentar",
  },
};

/**
 * Error Boundary global pour Next.js App Router
 *
 * Capture les erreurs critiques qui ne peuvent pas être gérées par error.tsx.
 * Utilise les messages statiques car le NextIntlClientProvider peut être indisponible.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState(routing.defaultLocale);

  useEffect(() => {
    const pathname = window.location.pathname;
    const localeFromPath = pathname.split("/")[1];
    if (localeFromPath && (routing.locales as readonly string[]).includes(localeFromPath)) {
      setLocale(localeFromPath as "fr" | "en" | "es");
    }
  }, []);

  useEffect(() => {
    try {
      const Sentry = require("@sentry/nextjs");
      Sentry.captureException(error, {
        contexts: {
          errorBoundary: {
            type: "global",
            digest: error.digest,
          },
        },
      });
    } catch {
      // Sentry non disponible, on ignore
    }
  }, [error]);

  const messages = FALLBACK_MESSAGES[locale] ?? FALLBACK_MESSAGES["fr"];

  return (
    <html lang={locale}>
      <body>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {messages.criticalError}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {messages.criticalErrorMessage}
            </p>
            {process.env.NODE_ENV === "development" && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {messages.errorDetails}
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-auto">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
            <button
              onClick={reset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {messages.retry}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
