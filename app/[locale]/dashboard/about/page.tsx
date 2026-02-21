"use client";

import { useTranslations } from "next-intl";

/**
 * Page About - Guide utilisateur non-technique
 *
 * Décrit le projet, le workflow des données et les fonctionnalités
 * de manière accessible aux utilisateurs non-développeurs.
 */

const SectionIcons = {
  whatIs: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
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
    "genres",
    "artists",
    "timeAnalysis",
    "whenWillIListen",
    "tasteProfile",
    "tasteEvolution",
    "aiInsights",
  ] as const;

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <div className="space-y-6">
        {/* What is this */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
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
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("whyLastfm.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {t("whyLastfm.paragraph")}
            </p>
          </div>
        </section>

        {/* What is Last.fm */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("whatIsLastfm.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {t("whatIsLastfm.paragraph")}
            </p>
          </div>
        </section>

        {/* Workflow */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-indigo">
                {SectionIcons.workflow}
              </span>
              {t("workflow.title")}
            </h2>
          </div>
          <div className="p-6">
            <ol className="space-y-4">
              {workflowSteps.map((step, index) => (
                <li
                  key={index}
                  className="flex gap-4 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-indigo/15 text-accent-indigo font-semibold text-xs">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-emerald/15 text-accent-emerald">
                {SectionIcons.features}
              </span>
              {t("features.title")}
            </h2>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {featureKeys.map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-emerald" />
                  <span className="leading-relaxed">
                    {t(`features.items.${key}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
