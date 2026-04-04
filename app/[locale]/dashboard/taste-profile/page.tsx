"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import type { TasteProfileTone } from "@/lib/dto/taste-profile";

const TONE_KEYS: { value: TasteProfileTone; key: string }[] = [
  { value: "analytical", key: "analytical" },
  { value: "casual", key: "casual" },
  { value: "poetic", key: "poetic" },
];

/** Extract first sentence for pull quote */
function getFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 120) + (text.length > 120 ? "…" : "");
}

/** Sparkles icon for profile */
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  );
}

function TasteProfileContent() {
  const t = useTranslations("taste-profile");
  const emptyStatePresets = useEmptyStatePresets();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const [tone, setTone] = useState<TasteProfileTone>("casual");
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading, error, refetch } = useTasteProfile(
    startDate,
    endDate,
    tone,
    { userId }
  );
  const isLoadingOrFetching = isRangeLoading || isLoading;

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoadingOrFetching) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-rose/10 dark:from-accent-violet/20 dark:to-accent-rose/20 border border-accent-violet/20 mb-6">
            <SparklesIcon className="w-5 h-5 text-accent-violet" />
            <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("loading")}
          </p>
        </header>

        <div className="space-y-6">
          <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-shimmer" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-gray-200 dark:bg-gray-700 animate-shimmer"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
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
      <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
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

  const pullQuote = getFirstSentence(data.description);
  const formatDateRange = (s?: string, e?: string) => {
    if (!s || !e) return "";
    const start = new Date(s);
    const end = new Date(e);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  };
  const dateRangeLabel = formatDateRange(startDate, endDate);

  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
      {/* Hero */}
      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-rose/10 dark:from-accent-violet/20 dark:to-accent-rose/20 border border-accent-violet/20">
            <SparklesIcon className="w-5 h-5 text-accent-violet" />
            <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
              {t("yourProfile")}
            </span>
          </div>
          {data.cached && (
            <span className="px-2 py-0.5 rounded-full bg-accent-violet/20 text-accent-violet text-xs font-medium">
              {t("cached")}
            </span>
          )}
          {dateRangeLabel && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {dateRangeLabel}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>

        {/* Tone pills — magazine-style section picker */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("tone")}
          </span>
          {TONE_KEYS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTone(opt.value)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${
                  tone === opt.value
                    ? "bg-accent-violet text-white shadow-lg shadow-accent-violet/25"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
              `}
            >
              {t(`tones.${opt.key}`)}
            </button>
          ))}
        </div>
      </header>

      {/* Editorial spotlight: pull quote + bento article grid */}
      <article
        className="space-y-8"
        data-taste-profile
      >
        {/* Pull quote — magazine headline style */}
        <blockquote
          className="relative pl-6 sm:pl-8 border-l-4 border-accent-violet/60 dark:border-accent-violet/80 py-4 -ml-1"
          aria-label={t("pullQuoteLabel")}
        >
          <p className="text-xl sm:text-2xl md:text-3xl font-medium italic text-gray-800 dark:text-gray-200 leading-snug max-w-3xl">
            &ldquo;{pullQuote}&rdquo;
          </p>
          <cite className="not-italic mt-3 block text-xs font-semibold uppercase tracking-wider text-accent-violet dark:text-accent-violet">
            {t("pullQuoteLabel")}
          </cite>
        </blockquote>

        {/* Bento grid — asymmetric article sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <section
            className="md:col-span-2 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 sm:p-8 border-l-4 border-l-accent-violet opacity-0 animate-fade-in-up"
            style={{ animationDelay: "0ms" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-violet dark:text-accent-violet mb-3">
              {t("inBrief")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base sm:text-lg">
              {data.description}
            </p>
          </section>

          <section
            className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-rose hover:shadow-card-hover transition-shadow duration-300 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-rose dark:text-accent-rose mb-3">
              {t("influences")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
              {data.influences}
            </p>
          </section>

          <section
            className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-cyan hover:shadow-card-hover transition-shadow duration-300 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "120ms" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-cyan dark:text-accent-cyan mb-3">
              {t("coreGenres")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-line">
              {data.coreGenres}
            </p>
          </section>

          <section
            className="md:col-span-2 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 sm:p-8 border-l-4 border-l-accent-emerald hover:shadow-card-hover transition-shadow duration-300 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "160ms" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-emerald dark:text-accent-emerald mb-3">
              {t("whatMakesYouUnique")}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
              {data.uniqueAspect}
            </p>
          </section>
        </div>

        <footer className="pt-4 border-t border-gray-100 dark:border-gray-700/50">
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
    <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
          <div className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("loadingShort")}
        </p>
      </header>
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-shimmer" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-gray-200 dark:bg-gray-700 animate-shimmer"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Explain My Taste - Music taste profile page.
 * Editorial magazine-style layout: pull quote spotlight + bento article grid.
 */
export default function TasteProfilePage() {
  return (
    <Suspense fallback={<TasteProfileFallback />}>
      <TasteProfileContent />
    </Suspense>
  );
}
