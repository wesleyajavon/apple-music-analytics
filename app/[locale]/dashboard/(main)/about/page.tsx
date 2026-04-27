"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Page About - Guide utilisateur non-technique
 *
 * Décrit le projet, le workflow des données et les fonctionnalités
 * de manière accessible aux utilisateurs non-développeurs.
 */

/** Book/document icon for hero badge */
function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

/** Chevron right for feature links */
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

const SectionIcons = {
  whatIs: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  ),
  whyLastfm: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  ),
  whatIsLastfm: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  workflow: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  features: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

/** Feature key to dashboard route mapping */
const FEATURE_ROUTES: Record<string, string> = {
  overview: "/dashboard/overview",
  timeline: "/dashboard/timeline",
  heatmap: "/dashboard/heatmap",
  tracks: "/dashboard/tracks",
  genres: "/dashboard/genres",
  artists: "/dashboard/artists",
  timeAnalysis: "/dashboard/temporal-analysis",
  musicalProfile: "/dashboard/musical-profile",
  insights: "/dashboard/insights",
  tasteEvolution: "/dashboard/taste-evolution",
  aiInsights: "/dashboard/ai-insights",
};

export default function AboutPage() {
  const t = useTranslations("about");

  const workflowSteps = [
    t("workflow.steps.step1"),
    t("workflow.steps.step2"),
    t("workflow.steps.step3"),
    t("workflow.steps.step4"),
    t("workflow.steps.step5"),
    t("workflow.steps.step6"),
  ];

  const featureKeys = [
    "overview",
    "timeline",
    "heatmap",
    "tracks",
    "genres",
    "artists",
    "timeAnalysis",
    "musicalProfile",
    "insights",
    "tasteEvolution",
    "aiInsights",
  ] as const;

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20 mb-6">
          <BookIcon className="w-5 h-5 text-accent-violet" />
          <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
            {t("heroBadge")}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <div className="space-y-6">
        {/* What is this */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card border-l-4 border-l-accent-violet">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
                {SectionIcons.whatIs}
              </span>
              {t("whatIs.title")}
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {t("whatIs.paragraph")}
            </p>
          </div>
        </section>

        {/* Why Last.fm */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card border-l-4 border-l-accent-cyan">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
                {SectionIcons.whyLastfm}
              </span>
              {t("whyLastfm.title")}
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {t("whyLastfm.paragraph")}
            </p>
          </div>
        </section>

        {/* What is Last.fm */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card border-l-4 border-l-accent-rose">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-rose/15 text-accent-rose">
                {SectionIcons.whatIsLastfm}
              </span>
              {t("whatIsLastfm.title")}
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {t("whatIsLastfm.paragraph")}
            </p>
          </div>
        </section>

        {/* Workflow */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card border-l-4 border-l-accent-indigo">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-indigo">
                {SectionIcons.workflow}
              </span>
              {t("workflow.title")}
            </h2>
          </div>
          <div className="p-6">
            <ol className="relative space-y-0">
              {workflowSteps.map((step, index) => (
                <li
                  key={index}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {/* Vertical timeline line */}
                  {index < workflowSteps.length - 1 && (
                    <span
                      className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-accent-indigo/30 -translate-x-1/2"
                      aria-hidden
                    />
                  )}
                  <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-indigo/15 text-accent-indigo font-semibold text-xs ring-4 ring-white dark:ring-gray-800/90">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card border-l-4 border-l-accent-emerald">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-emerald/15 text-accent-emerald">
                {SectionIcons.features}
              </span>
              {t("features.title")}
            </h2>
          </div>
          <div className="p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {featureKeys.map((key) => {
                const href = FEATURE_ROUTES[key];
                const content = (
                  <>
                    <span className="leading-relaxed text-sm text-gray-600 dark:text-gray-300 group-hover:text-accent-emerald dark:group-hover:text-accent-emerald transition-colors">
                      {t(`features.items.${key}`)}
                    </span>
                    {href && (
                      <ChevronRightIcon className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-accent-emerald group-hover:translate-x-0.5 transition-all" />
                    )}
                  </>
                );
                if (href) {
                  return (
                    <Link
                      key={key}
                      href={href}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 px-4 py-3 transition-all hover:border-accent-emerald/30 hover:bg-accent-emerald/5 hover:shadow-card-hover"
                    >
                      {content}
                    </Link>
                  );
                }
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 px-4 py-3"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
