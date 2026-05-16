"use client";

import { useTranslations } from "next-intl";
import { Video } from "lucide-react";
import { DashboardHeroTitle } from "@/lib/components/dashboard-hero-title";

const DEMO_VIDEOS = [
  { id: "bSSbz4yFeKo", titleKey: "videoTitle" as const },
  { id: "7QmzfMVb8-M", titleKey: "videoTitle2" as const },
] as const;

/**
 * Page Demo - Vidéos YouTube embarquées
 *
 * Affiche les démos produit en iframe.
 */
function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

export default function DemoPage() {
  const t = useTranslations("demo");

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20 mb-6">
          <VideoIcon className="w-5 h-5 text-accent-violet" />
          <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
            {t("heroBadge")}
          </span>
        </div>
        <DashboardHeroTitle icon={Video} variant="page">
          {t("title")}
        </DashboardHeroTitle>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {DEMO_VIDEOS.map(({ id, titleKey }) => (
          <section
            key={id}
            className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card border-l-4 border-l-accent-violet"
          >
            <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
                  <VideoIcon className="w-6 h-6" />
                </span>
                {t(titleKey)}
              </h2>
            </div>
            <div className="p-6">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-900">
                <iframe
                  src={`https://www.youtube.com/embed/${id}?rel=0`}
                  title={t(titleKey)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
