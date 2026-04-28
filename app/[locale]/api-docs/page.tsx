'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { FileCode2 } from 'lucide-react';
import { DashboardHeroTitle } from '@/lib/components/dashboard-hero-title';

/**
 * Page de documentation API
 * La documentation détaillée des endpoints est dans docs/API.md (accessible à /docs/API.md).
 */
export default function ApiDocsPage() {
  const t = useTranslations("api-docs");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg text-center space-y-6">
        <DashboardHeroTitle icon={FileCode2} variant="page" className="justify-center text-2xl sm:text-3xl">
          {t("title")}
        </DashboardHeroTitle>
        <p className="text-gray-600 dark:text-gray-400">
          {t("description")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/docs/API.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-card-surface px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t("viewReference")}
          </a>
          <Link
            href="/dashboard/overview"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            {t("goToDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
