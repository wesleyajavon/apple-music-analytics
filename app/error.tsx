"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { captureException } from "@/lib/utils/sentry";

/**
 * Error Boundary pour Next.js App Router
 *
 * Capture les erreurs dans les composants React et les envoie à Sentry
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("components.errorState");

  useEffect(() => {
    captureException(error, {
      errorBoundary: true,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t("somethingWrong")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t("unexpectedError")}
        </p>
        {process.env.NODE_ENV === "development" && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 mb-2">
              {t("errorDetails")}
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
          {tCommon("retry")}
        </button>
      </div>
    </div>
  );
}
