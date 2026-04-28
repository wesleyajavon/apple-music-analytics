"use client";

import { useCallback, Suspense, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import type { AiInsightsStyle } from "@/lib/dto/ai-insights";

/** Accent color variants for insight cards - creates visual variety */
const INSIGHT_ACCENTS = [
  { bg: "bg-white/70 dark:bg-slate-950/30", border: "border-l-cyan-300", icon: "text-cyan-600 dark:text-cyan-300", iconBg: "border border-cyan-300/20 bg-cyan-400/10" },
  { bg: "bg-white/70 dark:bg-slate-950/30", border: "border-l-sky-300", icon: "text-sky-600 dark:text-sky-300", iconBg: "border border-sky-300/20 bg-sky-400/10" },
  { bg: "bg-white/70 dark:bg-slate-950/30", border: "border-l-indigo-300", icon: "text-indigo-600 dark:text-indigo-300", iconBg: "border border-indigo-300/20 bg-indigo-400/10" },
  { bg: "bg-white/70 dark:bg-slate-950/30", border: "border-l-blue-300", icon: "text-blue-600 dark:text-blue-300", iconBg: "border border-blue-300/20 bg-blue-400/10" },
  { bg: "bg-white/70 dark:bg-slate-950/30", border: "border-l-cyan-300", icon: "text-cyan-600 dark:text-cyan-300", iconBg: "border border-cyan-300/20 bg-cyan-400/10" },
] as const;
const AI_RAIL_CLASS = "bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-400";
const AI_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-violet-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.13),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.1),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card backdrop-blur-sm dark:border-violet-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.14),_transparent_30%),rgb(var(--card-rgb)/0.9)]";
const AI_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-violet-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.32),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#4c1d95_100%)] px-6 py-8 shadow-2xl shadow-violet-950/40 sm:px-8 sm:py-10";

/** Spark/lightning icon for AI insights */
function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

/** Format date range for display */
function formatDateRange(startDate?: string, endDate?: string, locale?: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const loc = locale && locale.length > 0 ? locale : undefined;
  return `${start.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`;
}

function AiInsightsHeroFrame({
  badgeLabel,
  description,
  stats,
  aside,
}: {
  badgeLabel: string;
  description: string;
  stats: ReactNode;
  aside?: ReactNode;
}) {
  const t = useTranslations("ai-insights");
  return (
    <div className={AI_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(34,211,238,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-400/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-cyan-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${AI_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <SparkIcon className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-10 sm:w-10" aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${AI_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(139,92,246,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-violet-100/90 sm:text-lg">{description}</p>
          <p className="mt-2 text-sm font-medium text-cyan-100/90">
            <span className="inline-flex items-center rounded-full border border-violet-200/30 bg-white/10 px-3 py-1">
              {badgeLabel}
            </span>
          </p>
          {stats}
        </div>
        {aside ? <div className="w-full shrink-0 lg:w-auto">{aside}</div> : null}
      </div>
    </div>
  );
}

function AiInsightsHeroStats({
  insightCount,
  insightStyle,
  cached,
  rateLimitRemaining,
}: {
  insightCount: number;
  insightStyle: AiInsightsStyle;
  cached: boolean;
  rateLimitRemaining?: number;
}) {
  const t = useTranslations("ai-insights");
  const statusText =
    typeof rateLimitRemaining === "number"
      ? t("quotaRemaining", { count: rateLimitRemaining })
      : cached
        ? t("cached")
        : t("heroFresh");
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      <div className="rounded-xl border border-violet-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-violet-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-violet-100/80">{t("heroStatInsights")}</p>
        <p className="text-2xl font-bold text-white">{insightCount}</p>
      </div>
      <div className="rounded-xl border border-cyan-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-cyan-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-cyan-100/80">{t("heroStatTone")}</p>
        <p className="text-2xl font-bold text-white">{t(`styleToggle.${insightStyle}`)}</p>
      </div>
      <div className="rounded-xl border border-rose-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-rose-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-rose-100/80">{t("heroStatStatus")}</p>
        <p className="text-sm font-semibold leading-snug text-white">{statusText}</p>
      </div>
    </div>
  );
}

function AiInsightsHeroStatsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[140px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-initial"
        >
          <div className="mb-2 h-3 w-20 rounded bg-white/15" />
          <div className="h-8 w-16 rounded bg-white/20" />
        </div>
      ))}
    </div>
  );
}

function InsightStyleToggle({
  insightStyle,
  onStyleChange,
}: {
  insightStyle: AiInsightsStyle;
  onStyleChange: (style: AiInsightsStyle) => void;
}) {
  const t = useTranslations("ai-insights");
  return (
    <div
      className="flex w-full flex-col gap-2 sm:w-auto"
      role="group"
      aria-label={t("styleToggle.ariaLabel")}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {t("styleToggle.label")}
      </span>
      <div className="inline-flex rounded-xl border border-white/20 bg-white/10 p-1.5 shadow-sm backdrop-blur-sm">
        {(["human", "technical"] as const).map((style) => {
          const isActive = insightStyle === style;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStyleChange(style)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-violet-500 via-cyan-500 to-rose-500 text-white shadow-sm shadow-violet-950/20"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t(`styleToggle.${style}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AiInsightsContent() {
  const t = useTranslations("ai-insights");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const [insightStyle, setInsightStyle] = useState<AiInsightsStyle>("human");

  const { data, isLoading, error, refetch } = useAiInsights(startDate, endDate, {
    insightStyle,
    userId,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;

  const dateRangeLabel = formatDateRange(startDate, endDate, locale);
  const badgeLabelBase = dateRangeLabel || tOverview("allData");

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoadingOrFetching) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <AiInsightsHeroFrame
          badgeLabel={t("loadingShort")}
          description={t("generating")}
          stats={<AiInsightsHeroStatsSkeleton />}
          aside={
            <InsightStyleToggle insightStyle={insightStyle} onStyleChange={setInsightStyle} />
          }
        />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${AI_PANEL_CLASS} p-6`}>
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${AI_RAIL_CLASS} opacity-70`} />
              <div className="flex gap-4">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-violet-200 animate-shimmer dark:bg-violet-900/45" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-5/6 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-4/5 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <AiInsightsHeroFrame
          badgeLabel={badgeLabelBase}
          description={t("errorLoading")}
          stats={null}
        />
        <ErrorState error={error} message={t("errorMessage")} onRetry={handleRetry} />
        <p className="text-sm text-muted">{t("checkApiKey")}</p>
      </div>
    );
  }

  if (!data || !data.insights.length) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <AiInsightsHeroFrame
          badgeLabel={badgeLabelBase}
          description={t("noInsights")}
          stats={null}
        />
        <EmptyState
          {...emptyStatePresets.importData}
          message={t("notEnoughData")}
          description={t("importDescription")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <AiInsightsHeroFrame
        badgeLabel={badgeLabelBase}
        description={t("yourInsights")}
        stats={
          <AiInsightsHeroStats
            insightCount={data.insights.length}
            insightStyle={insightStyle}
            cached={data.cached}
            rateLimitRemaining={data.rateLimit?.remaining}
          />
        }
        aside={<InsightStyleToggle insightStyle={insightStyle} onStyleChange={setInsightStyle} />}
      />

      {/* Spotlight: AI insights — carte principale avec gradient et effet de lumière */}
      <section
        className={`${AI_PANEL_CLASS} animate-fade-in-up transition-all duration-300 hover:shadow-card-hover`}
        aria-labelledby="ai-insights-spotlight-title"
      >
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${AI_RAIL_CLASS} opacity-85`} />
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/12 blur-3xl dark:bg-cyan-400/16" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-violet-400/12 blur-3xl dark:bg-violet-400/16" />
        <div className="pointer-events-none absolute bottom-8 left-1/2 h-24 w-[90%] -translate-x-1/2 rounded-full bg-rose-400/10 blur-3xl dark:bg-rose-400/14" />

        <div className="relative">
          <div className="border-b border-violet-200/20 px-6 py-5 dark:border-violet-300/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-300/10 text-violet-600 shadow-sm shadow-violet-950/10 dark:text-violet-200">
                <SparkIcon className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <h2
                  id="ai-insights-spotlight-title"
                  className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
                >
                  {t("spotlightTitle")}
                </h2>
                <p className="mt-0.5 text-sm text-violet-700/75 dark:text-violet-100/65">
                  {t("spotlightHint")}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6 sm:p-8 md:p-10">
            {data.insights.map((insight, index) => {
              const accent = INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length];
              return (
                <div
                  key={index}
                  className={`
                    relative overflow-hidden rounded-xl border border-violet-200/20 border-l-4
                    bg-white/65 dark:bg-slate-950/24 shadow-card
                    transition-all duration-300 hover:shadow-card-hover
                    ${accent.border} ${accent.bg}
                    opacity-0 animate-fade-in-up
                  `}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${AI_RAIL_CLASS} opacity-45`} />
                  <div className="p-6 flex gap-4">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconBg} ${accent.icon}`}
                      aria-hidden
                    >
                      <SparkIcon className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                        {insight}
                      </p>
                    </div>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-400/10 text-sm font-semibold text-cyan-700 dark:text-cyan-200"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function AiInsightsFallback() {
  const t = useTranslations("ai-insights");
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <AiInsightsHeroFrame
        badgeLabel={t("loadingShort")}
        description={t("loadingShort")}
        stats={<AiInsightsHeroStatsSkeleton />}
        aside={
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
            <div className="h-10 w-48 animate-pulse rounded-xl bg-white/10" />
          </div>
        }
      />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${AI_PANEL_CLASS} p-6`}>
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${AI_RAIL_CLASS} opacity-70`} />
            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-violet-200 animate-shimmer dark:bg-violet-900/45" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-5/6 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-4/5 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * AI Insights page - One-shot insight generator from aggregated analytics.
 * Displays 3-5 concise, data-grounded bullet points in styled cards.
 */
export default function AiInsightsPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<AiInsightsFallback />}>
        <AiInsightsContent />
      </Suspense>
    </div>
  );
}
