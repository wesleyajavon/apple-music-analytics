'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Page de documentation API
 * La documentation détaillée des endpoints est dans docs/API.md (accessible à /docs/API.md).
 */
export default function ApiDocsPage() {
  const t = useTranslations("api-docs");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("description")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/docs/API.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t("viewReference")}
          </a>
          <Link
            href="/dashboard/overview"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {t("goToDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
