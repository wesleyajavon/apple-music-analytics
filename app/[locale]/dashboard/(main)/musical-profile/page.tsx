"use client";

import { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "motion/react";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { useTasteEvolution } from "@/lib/hooks/use-taste-evolution";
import {
  ScrollProgressBar,
  ScrollRevealSection,
  StaggerContainer,
  ParallaxHero,
} from "@/lib/components/overview-bis";
import { WhenWillIListenWidget } from "@/lib/components/when-will-i-listen-widget";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";

/** Spark icon for AI features */
function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

/** Musical note / profile icon */
function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

const PREVIEW_INSIGHTS_COUNT = 3;
const INSIGHT_ACCENTS = [
  { border: "border-l-accent-violet", bg: "bg-accent-violet/8" },
  { border: "border-l-accent-indigo", bg: "bg-accent-indigo/8" },
  { border: "border-l-accent-cyan", bg: "bg-accent-cyan/8" },
] as const;

function truncateText(text: string, maxLength = 180): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(" ");
  const end = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
  return truncated.slice(0, end) + "…";
}

function getTasteEvolutionRange(
  startDate?: string,
  endDate?: string
): { startDate: string; endDate: string } {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 14) return { startDate, endDate };
  }
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 56);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function MusicalProfileContent() {
  const t = useTranslations("musical-profile");
  const tInsights = useTranslations("ai-insights");
  const tProfile = useTranslations("taste-profile");
  const tEvolution = useTranslations("taste-evolution");
  const tWhen = useTranslations("when-will-i-listen");
  const emptyStatePresets = useEmptyStatePresets();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;

  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const evolutionRange = useMemo(
    () => getTasteEvolutionRange(startDate, endDate),
    [startDate, endDate]
  );

  const { data: insightsData, isLoading: insightsLoading, error: insightsError } =
    useAiInsights(startDate, endDate, { userId });
  const { data: profileData, isLoading: profileLoading, error: profileError } =
    useTasteProfile(startDate, endDate, "casual", { userId });
  const { data: evolutionData, isLoading: evolutionLoading, error: evolutionError } =
    useTasteEvolution(evolutionRange.startDate, evolutionRange.endDate, userId);

  const isLoading =
    isRangeLoading || insightsLoading || profileLoading || evolutionLoading;

  const hasAnyData =
    (insightsData?.insights?.length ?? 0) > 0 ||
    !!profileData ||
    (evolutionData?.commentary ?? evolutionData?.commentaryLight) ||
    evolutionData?.trends?.length;

  const hasAiFailure =
    !!insightsError || !!profileError || !!evolutionError;

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  const showEmptyImportState = !hasAnyData && !hasAiFailure;

  if (showEmptyImportState) {
    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("subtitle")}
          </p>
        </header>
        <EmptyState
          {...emptyStatePresets.importData}
          message={t("noData")}
          description={t("importDescription")}
        />
      </div>
    );
  }

  const dateRangeLabel = formatDateRange(startDate, endDate);
  const evolutionCommentary =
    evolutionData?.commentaryLight ?? evolutionData?.commentary ?? "";

  return (
    <div className="space-y-16 pb-8">
      {/* Hero — Your musical profile as a story */}
      <ParallaxHero>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 transition-all duration-300 hover:shadow-[0_0_60px_-12px_rgba(139,92,246,0.3)] hover:border-accent-violet/30"
        >
          <div className="relative px-8 py-12 sm:px-12 sm:py-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20 mb-6">
              <ProfileIcon className="w-5 h-5 text-accent-violet" />
              <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
                {t("heroBadge")}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("heroTitle")}
            </h2>
            <p className="mt-4 text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl">
              {t("heroSubtitle")}
            </p>
            {dateRangeLabel && (
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                {dateRangeLabel}
              </p>
            )}
          </div>
        </motion.div>
      </ParallaxHero>

      {/* Section: Your insights */}
      {((insightsData?.insights?.length ?? 0) > 0 || insightsError) && (
        <ScrollRevealSection className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("sections.insights")}
          </h3>
          <div className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30">
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
                      <SparkIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tInsights("spotlightTitle")}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tInsights("spotlightHint")}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/ai-insights"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20 transition-colors shrink-0"
                  >
                    {tInsights("seeMore")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {insightsError ? (
                  isGroqDailyQuotaError(insightsError) ? (
                    <GroqQuotaNotice error={insightsError} />
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                      {insightsError.message}
                    </p>
                  )
                ) : (
                  <>
                    {insightsData!.insights.slice(0, PREVIEW_INSIGHTS_COUNT).map((insight, index) => {
                      const accent = INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length];
                      return (
                        <div
                          key={index}
                          className={`flex gap-3 p-3 -mx-1 rounded-lg border-l-4 ${accent.border} ${accent.bg}`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                            {insight}
                          </span>
                        </div>
                      );
                    })}
                    {insightsData!.cached && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-violet/60" />
                        {tInsights("cached")}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollRevealSection>
      )}

      {/* Section: Your taste profile */}
      {(profileData || profileError) && (
        <ScrollRevealSection className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("sections.tasteProfile")}
          </h3>
          <div className="relative overflow-hidden rounded-2xl border-2 border-accent-rose/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-rose/10 dark:ring-accent-rose/20 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(244,63,94,0.2)] hover:border-accent-rose/30">
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(244, 63, 94, 0.06) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-rose/20 to-accent-pink/20 text-accent-rose">
                      <ProfileIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tProfile("title")}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tProfile("pullQuoteLabel")}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/taste-profile"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-rose hover:bg-accent-rose/10 dark:hover:bg-accent-rose/20 transition-colors shrink-0"
                  >
                    {tProfile("seeMore")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              <blockquote className="p-6 pl-8 border-l-4 border-accent-rose/60 dark:border-accent-rose/80">
                {profileError ? (
                  isGroqDailyQuotaError(profileError) ? (
                    <GroqQuotaNotice error={profileError} />
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                      {profileError.message}
                    </p>
                  )
                ) : (
                  <>
                    <p className="text-lg sm:text-xl font-medium italic text-gray-800 dark:text-gray-200 leading-snug">
                      &ldquo;{truncateText(profileData!.description, 240)}&rdquo;
                    </p>
                    {profileData!.cached && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{tProfile("cached")}</p>
                    )}
                  </>
                )}
              </blockquote>
            </div>
          </div>
        </ScrollRevealSection>
      )}

      {/* Section: Your taste evolution */}
      {(evolutionCommentary.trim() || evolutionError) && (
        <ScrollRevealSection className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("sections.tasteEvolution")}
          </h3>
          <div className="relative overflow-hidden rounded-2xl border-2 border-accent-emerald/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-emerald/10 dark:ring-accent-emerald/20 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] hover:border-accent-emerald/30">
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(16, 185, 129, 0.06) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-emerald/20 to-accent-teal/20 text-accent-emerald">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tEvolution("spotlightTitle")}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tEvolution("spotlightHint")}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/taste-evolution"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-emerald hover:bg-accent-emerald/10 dark:hover:bg-accent-emerald/20 transition-colors shrink-0"
                  >
                    {tEvolution("seeMore")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                {evolutionError ? (
                  isGroqDailyQuotaError(evolutionError) ? (
                    <GroqQuotaNotice error={evolutionError} />
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                      {evolutionError.message}
                    </p>
                  )
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {evolutionCommentary}
                    </p>
                    {evolutionData?.commentaryCached && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{tEvolution("cached")}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollRevealSection>
      )}

      {/* Section: Your listening moment (When will I listen) */}
      <ScrollRevealSection>
        <WhenWillIListenWidget includeExplanation />
      </ScrollRevealSection>

      {/* Quick links to all AI pages */}
      <ScrollRevealSection className="pt-8 border-t border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("exploreMore")}
        </h3>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/ai-insights"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 hover:border-accent-violet/30 hover:shadow-card transition-all"
          >
            <SparkIcon className="w-5 h-5 text-accent-violet shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tInsights("title")}
            </span>
          </Link>
          <Link
            href="/dashboard/taste-profile"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 hover:border-accent-rose/30 hover:shadow-card transition-all"
          >
            <ProfileIcon className="w-5 h-5 text-accent-rose shrink-0" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tProfile("title")}
            </span>
          </Link>
          <Link
            href="/dashboard/taste-evolution"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 hover:border-accent-emerald/30 hover:shadow-card transition-all"
          >
            <svg className="w-5 h-5 text-accent-emerald shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tEvolution("title")}
            </span>
          </Link>
          <Link
            href="/dashboard/when-will-i-listen"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 hover:border-accent-cyan/30 hover:shadow-card transition-all"
          >
            <svg className="w-5 h-5 text-accent-cyan shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tWhen("title")}
            </span>
          </Link>
        </StaggerContainer>
      </ScrollRevealSection>
    </div>
  );
}

function MusicalProfileFallback() {
  const t = useTranslations("musical-profile");
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-10">
        <div className="h-10 w-48 rounded-full bg-gray-200 dark:bg-gray-700 animate-shimmer mb-6" />
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 h-5 w-96 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
      </header>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function MusicalProfilePage() {
  const t = useTranslations("musical-profile");
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";
  const filterKey = `${startDateParam}-${endDateParam}`;

  return (
    <div className="px-4 py-6 sm:px-0 relative">
      <ScrollProgressBar />
      <header className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20 mb-6">
          <ProfileIcon className="w-5 h-5 text-accent-violet" />
          <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
            {t("headerBadge")}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <Suspense fallback={<MusicalProfileFallback />}>
        <MusicalProfileContent key={filterKey} />
      </Suspense>
    </div>
  );
}
