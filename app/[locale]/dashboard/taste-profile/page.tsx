"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useCallback, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import type { TasteProfileTone } from "@/lib/dto/taste-profile";

const TONE_KEYS: { value: TasteProfileTone; key: string }[] = [
  { value: "analytical", key: "analytical" },
  { value: "casual", key: "casual" },
  { value: "poetic", key: "poetic" },
];

function TasteProfileContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("taste-profile");
  const emptyStatePresets = useEmptyStatePresets();
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const [tone, setTone] = useState<TasteProfileTone>("casual");

  const effectiveRange = useMemo(() => {
    if (startDate && endDate) return { startDate, endDate };
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [startDate, endDate]);

  const { data, isLoading, error, refetch } = useTasteProfile(
    effectiveRange.startDate,
    effectiveRange.endDate,
    tone
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("loading")}
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="animate-pulse flex flex-col gap-4 w-full max-w-lg">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-11/12" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-10/12" />
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4" />
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("analyzing")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("errorLoading")}
          </p>
        </header>

        <ErrorState
          error={error}
          message={t("errorMessage")}
          onRetry={handleRetry}
        />

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t("checkApiKey")}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("noData")}
          </p>
        </header>

        <EmptyState
          {...emptyStatePresets.importData}
          message={t("notEnoughData")}
          description={t("importDescription")}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
          {data.cached && (
            <span className="ml-2 text-accent-violet dark:text-accent-violet">
              {t("cached")}
            </span>
          )}
        </p>
      </header>

      {/* Tone switcher */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 self-center mr-2">
          {t("tone")}
        </span>
        {TONE_KEYS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTone(opt.value)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${
                tone === opt.value
                  ? "bg-accent-violet text-white shadow-lg shadow-accent-violet/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }
            `}
          >
            {t(`tones.${opt.key}`)}
          </button>
        ))}
      </div>

      {/* Shareable profile card */}
      <article
        className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-800/95 dark:to-gray-900/80 shadow-card"
        data-taste-profile
      >
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                />
              </svg>
            </span>
            {t("yourProfile")}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-violet dark:text-accent-violet mb-2">
              {t("inBrief")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {data.description}
            </p>
          </section>

          {/* Influences */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-violet dark:text-accent-violet mb-2">
              {t("influences")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {data.influences}
            </p>
          </section>

          {/* Core genres */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-violet dark:text-accent-violet mb-2">
              {t("coreGenres")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {data.coreGenres}
            </p>
          </section>

          {/* Unique aspect */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-violet dark:text-accent-violet mb-2">
              {t("whatMakesYouUnique")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {data.uniqueAspect}
            </p>
          </section>
        </div>

        <footer className="border-t border-gray-100 dark:border-gray-700/50 px-6 py-3 bg-gray-50/50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("footer")}
          </p>
        </footer>
      </article>
    </div>
  );
}

function TasteProfileFallback() {
  const t = useTranslations("taste-profile");
  return (
    <div className="px-4 py-6 sm:px-0 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("loadingShort")}
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
        <div className="p-12">
          <div className="animate-pulse flex flex-col gap-4 w-full max-w-lg">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-11/12" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Explain My Taste - Music taste profile page.
 * Displays a human-readable profile with tone variants (analytical / casual / poetic).
 */
export default function TasteProfilePage() {
  return (
    <Suspense fallback={<TasteProfileFallback />}>
      <TasteProfileContent />
    </Suspense>
  );
}
