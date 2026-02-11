"use client";

import { useTranslations } from "next-intl";

/**
 * Page Insights - Documentation sur les patterns, calculs et limitations
 * 
 * Cette page explique:
 * - Quels patterns révèlent ces données
 * - Comment les analytics sont calculés
 * - Les compromis et limitations du système
 */

const SectionIcons = {
  patterns: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  calculations: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  ),
  limitations: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  architecture: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  ),
};

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-accent-violet dark:text-accent-violet font-mono text-sm">
      {children}
    </code>
  );
}

export default function InsightsPage() {
  const t = useTranslations("insights");
  const code = (chunks: React.ReactNode) => <InlineCode>{chunks}</InlineCode>;

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
        {/* Section 1: Patterns révélés */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
                {SectionIcons.patterns}
              </span>
              {t("patterns.sectionTitle")}
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("patterns.overview.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t.rich("patterns.overview.paragraph", { code })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("patterns.timeline.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t.rich("patterns.timeline.paragraph", { code })}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("patterns.timeline.li1")}</li>
                <li>{t("patterns.timeline.li2")}</li>
                <li>{t("patterns.timeline.li3")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("patterns.heatmap.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t.rich("patterns.heatmap.paragraph", { code })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("patterns.temporal.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t.rich("patterns.temporal.paragraph", { code })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("patterns.genres.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t.rich("patterns.genres.paragraph", { code })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("patterns.network.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t.rich("patterns.network.paragraph", { code })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("patterns.replay.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t.rich("patterns.replay.paragraph", { code })}
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Calculs des analytics */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-indigo">
                {SectionIcons.calculations}
              </span>
              {t("calculations.sectionTitle")}
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("calculations.aggregations.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("calculations.aggregations.paragraph")}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("calculations.aggregations.li1")}</li>
                <li>{t("calculations.aggregations.li2")}</li>
                <li>{t("calculations.aggregations.li3")}</li>
                <li>{t("calculations.aggregations.li4")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("calculations.stats.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("calculations.stats.paragraph")}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("calculations.stats.li1")}</li>
                <li>{t("calculations.stats.li2")}</li>
                <li>{t("calculations.stats.li3")}</li>
                <li>{t("calculations.stats.li4")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("calculations.network.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("calculations.network.paragraph")}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("calculations.network.li1")}</li>
                <li>{t("calculations.network.li2")}</li>
                <li>{t("calculations.network.li3")}</li>
                <li>{t("calculations.network.li4")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("calculations.genres.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("calculations.genres.paragraph")}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("calculations.genres.li1")}</li>
                <li>{t("calculations.genres.li2")}</li>
                <li>{t("calculations.genres.li3")}</li>
                <li>{t("calculations.genres.li4")}</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t.rich("calculations.genres.enrichNote", { code })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("calculations.export.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("calculations.export.paragraph")}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("calculations.export.li1")}</li>
                <li>{t("calculations.export.li2")}</li>
                <li>{t("calculations.export.li3")}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Limitations et compromis */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-rose/15 text-accent-rose">
                {SectionIcons.limitations}
              </span>
              {t("limitations.sectionTitle")}
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("limitations.genreMapping.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.genreMapping.limitation")}
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.genreMapping.impact")}
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                {t("limitations.genreMapping.solution")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("limitations.proximityWindow.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.proximityWindow.limitation")}
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.proximityWindow.impact")}
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                {t("limitations.proximityWindow.solution")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("limitations.dataSources.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.dataSources.limitation")}
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.dataSources.impact")}
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                {t("limitations.dataSources.solution")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("limitations.listenTime.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.listenTime.limitation")}
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.listenTime.impact")}
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                {t("limitations.listenTime.solution")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("limitations.queryPerformance.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.queryPerformance.limitation")}
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.queryPerformance.impact")}
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                {t("limitations.queryPerformance.solution")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("limitations.dataNormalization.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.dataNormalization.limitation")}
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                {t("limitations.dataNormalization.impact")}
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                {t("limitations.dataNormalization.solution")}
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Architecture technique */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
                {SectionIcons.architecture}
              </span>
              {t("architecture.sectionTitle")}
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("architecture.stack.title")}
              </h3>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("architecture.stack.li1")}</li>
                <li>{t("architecture.stack.li2")}</li>
                <li>{t("architecture.stack.li3")}</li>
                <li>{t("architecture.stack.li4")}</li>
                <li>{t("architecture.stack.li5")}</li>
                <li>{t("architecture.stack.li6")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("architecture.model.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("architecture.model.paragraph")}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("architecture.model.li1")}</li>
                <li>{t("architecture.model.li2")}</li>
                <li>{t("architecture.model.li3")}</li>
                <li>{t("architecture.model.li4")}</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                {t("architecture.import.title")}
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                {t("architecture.import.paragraph")}
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li>{t("architecture.import.li1")}</li>
                <li>{t("architecture.import.li2")}</li>
                <li>{t("architecture.import.li3")}</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

