'use client';

import { useEffect } from 'react';

/**
 * Error Boundary global pour Next.js App Router
 * 
 * Capture les erreurs critiques qui ne peuvent pas être gérées par error.tsx
 * Doit être un composant client et wrapper le <html> tag
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Envoie l'erreur à Sentry
    try {
      const Sentry = require('@sentry/nextjs');
      Sentry.captureException(error, {
        contexts: {
          errorBoundary: {
            type: 'global',
            digest: error.digest,
          },
        },
      });
    } catch {
      // Sentry non disponible, on ignore
    }
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Erreur critique
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Une erreur critique s&apos;est produite. L&apos;application a été réinitialisée.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Détails de l&apos;erreur (développement)
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
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
