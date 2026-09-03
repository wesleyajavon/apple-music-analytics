"use client";

import { useState, useMemo, Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LayoutDashboard, Sprout, TrendingUp, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
} from "@/lib/constants/dashboard-spotlight";
import { useTasteEvolution } from "@/lib/hooks/use-taste-evolution";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import { TasteEvolutionSpotlightSkeleton } from "@/lib/components/skeleton-loaders";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import type {
  TasteEvolutionResponse,
  WeekToWeekTrend,
  TrendClassification,
} from "@/lib/dto/taste-evolution";

const CLASSIFICATION_COLORS: Record<TrendClassification, string> = {
  expansion: "border border-emerald-200/90 bg-emerald-50/90 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  consolidation: "border border-sky-200/90 bg-sky-50/90 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  exploration: "border border-indigo-200/90 bg-indigo-50/90 text-indigo-800 dark:border-indigo-400/25 dark:bg-indigo-400/10 dark:text-indigo-200",
  regression: "border border-rose-200/90 bg-rose-50/90 text-rose-800 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-200",
  stable: "border border-slate-200/90 bg-slate-50/90 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300",
};

const TASTE_SUBCARD_CLASS = `${DASHBOARD_SPOTLIGHT_INNER_WELL} !rounded-xl`;
const TASTE_POSITIVE_SUBCARD_CLASS =
  "rounded-xl border border-emerald-200/90 bg-emerald-50/70 shadow-inner shadow-emerald-900/[0.03] dark:border-emerald-400/20 dark:bg-emerald-950/30 dark:shadow-none";
const TASTE_NEGATIVE_SUBCARD_CLASS =
  "rounded-xl border border-rose-200/90 bg-rose-50/70 shadow-inner shadow-rose-900/[0.03] dark:border-rose-400/20 dark:bg-rose-950/30 dark:shadow-none";

/** Même shell hero que `/dashboard/timeline` — vibe startup / Vercel */
const TASTE_EVOLUTION_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const TASTE_MOBILE_BLEED = "-mx-4 -mt-4 space-y-4 pb-8 lg:hidden";
const TASTE_MOBILE_HERO = "relative overflow-hidden bg-gray-950 px-4 pb-6 pt-4 text-white";
const TASTE_MOBILE_RETRY =
  "inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25";

function TasteEvolutionMobileSkeleton() {
  return (
    <div className={TASTE_MOBILE_BLEED} aria-busy="true">
      <section className={TASTE_MOBILE_HERO}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-3">
          <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-3 w-10/12 animate-pulse rounded bg-white/10" />
        </div>
      </section>
      <section className="px-4">
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 min-w-[9.75rem] animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function TasteEvolutionMobileEmpty() {
  const t = useTranslations("taste-evolution");

  return (
    <DashboardMobileImportEmpty
      eyebrow={t("mobile.eyebrow")}
      title={t("mobile.emptyTitle")}
      lead={t("mobile.emptyLead")}
      demoPath="/dashboard/taste-evolution"
      importLabel={t("mobile.emptyCta")}
    />
  );
}

function TasteEvolutionMobileError({
  error,
  onRetry,
}: {
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("taste-evolution");
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={TASTE_MOBILE_BLEED}>
      <section className={TASTE_MOBILE_HERO}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("mobile.eyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
            {t("mobile.errorLead")}
          </h1>
          {isQuota ? (
            <GroqQuotaNotice error={error} />
          ) : (
            <button type="button" onClick={onRetry} className={TASTE_MOBILE_RETRY}>
              {tCommon("retry")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDateRange(startDate: string, endDate: string, locale?: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const loc = locale && locale.length > 0 ? locale : undefined;
  return `${start.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`;
}

function TasteEvolutionHeroTrustPanel() {
  const t = useTranslations("taste-evolution");
  return (
    <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust1")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust2")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust3")}</span>
      </li>
    </ul>
  );
}

function TasteEvolutionHeroFrame({
  badgeLabel,
  description,
  stats,
  summaryToggle,
}: {
  badgeLabel: string;
  description: string;
  stats: ReactNode | null;
  summaryToggle?: ReactNode;
}) {
  const t = useTranslations("taste-evolution");
  return (
    <div className={TASTE_EVOLUTION_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white lg:text-6xl">
            <Sprout className="h-8 w-8 shrink-0 text-emerald-200/90 lg:h-11 lg:w-11" strokeWidth={1.5} aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              {badgeLabel}
            </span>
          </div>
          {summaryToggle ? <div className="mt-5">{summaryToggle}</div> : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/overview"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100 sm:w-auto"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {t("ctaOverview")}
            </Link>
            <Link
              href="/dashboard/genres/trends"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15 sm:w-auto"
            >
              <TrendingUp className="h-4 w-4" aria-hidden />
              {t("ctaGenreTrends")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-emerald-100">{t("heroStatTag")}</span>
              </div>
              {stats ?? <TasteEvolutionHeroTrustPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasteEvolutionHeroStats({ data }: { data: TasteEvolutionResponse }) {
  const t = useTranslations("taste-evolution");
  const latest = data.trends.length > 0 ? data.trends[data.trends.length - 1] : null;
  const latestLabel = latest ? t(`classifications.${latest.classification}`) : "—";
  return (
    <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{data.trends.length}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatComparisons")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold leading-snug text-white">{latestLabel}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatLatest")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{data.skippedWeeks.length}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatSkipped")}</p>
      </div>
    </div>
  );
}

function TasteEvolutionHeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-16 rounded bg-white/20" />
          <div className="h-3 w-20 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function TasteSummaryVersionToggle({
  summaryVersion,
  onVersionChange,
}: {
  summaryVersion: "light" | "technical";
  onVersionChange: (v: "light" | "technical") => void;
}) {
  const t = useTranslations("taste-evolution");
  return (
    <div className="flex w-full max-w-md flex-col gap-2" role="tablist" aria-label={t("aiExplanation")}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{t("summaryStyleLabel")}</span>
      <div className="inline-flex w-full max-w-md rounded-xl border border-white/15 bg-white/10 p-1.5 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          role="tab"
          aria-selected={summaryVersion === "light"}
          onClick={() => onVersionChange("light")}
          className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            summaryVersion === "light"
              ? "bg-white text-gray-950 shadow-sm shadow-black/20"
              : "text-white/70 hover:text-white"
          }`}
        >
          {t("summaryVersionLight")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={summaryVersion === "technical"}
          onClick={() => onVersionChange("technical")}
          className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            summaryVersion === "technical"
              ? "bg-white text-gray-950 shadow-sm shadow-black/20"
              : "text-white/70 hover:text-white"
          }`}
        >
          {t("summaryVersionTechnical")}
        </button>
      </div>
    </div>
  );
}

function TrendCardHeader({
  trend,
  t,
  classificationColor,
  classificationLabel,
  isCollapsible,
  isExpanded,
  onToggle,
}: {
  trend: WeekToWeekTrend;
  t: (k: string) => string;
  classificationColor: string;
  classificationLabel: string;
  isCollapsible: boolean;
  isExpanded: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {trend.timeRange.label} {t("vs")} {trend.previousWeekRange.label}
        </h3>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
          {trend.currentWeekListens} {t("listens")} ({t("vs")} {trend.previousWeekListens})
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${classificationColor}`}>{classificationLabel}</span>
        {isCollapsible ? (
          <span className={`inline-flex items-center text-slate-400 transition-transform duration-200 dark:text-slate-500 ${isExpanded ? "rotate-180" : ""}`} aria-hidden>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        ) : null}
      </div>
    </>
  );

  const borderClass = !isCollapsible || isExpanded ? `${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}` : "";

  if (isCollapsible && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-11 w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.04] ${borderClass}`}
        aria-expanded={isExpanded}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${borderClass}`}>
      {content}
    </div>
  );
}

function TrendCard({
  trend,
  t,
  isLastWeek,
}: {
  trend: WeekToWeekTrend;
  t: (k: string) => string;
  isLastWeek: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isLastWeek);
  const classificationColor = CLASSIFICATION_COLORS[trend.classification];
  const classificationLabel = t(`classifications.${trend.classification}`);
  const isCollapsible = !isLastWeek;

  return (
    <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/35`}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
      <div className="relative">
        <TrendCardHeader
          trend={trend}
          t={t}
          classificationColor={classificationColor}
          classificationLabel={classificationLabel}
          isCollapsible={isCollapsible}
          isExpanded={isExpanded}
          onToggle={isCollapsible ? () => setIsExpanded((prev) => !prev) : undefined}
        />

        {(isLastWeek || isExpanded) && (
          <div className="relative space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`${trend.volumeDelta >= 0 ? TASTE_POSITIVE_SUBCARD_CLASS : TASTE_NEGATIVE_SUBCARD_CLASS} p-3`}>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("volume")}</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    trend.volumeDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {trend.volumeDelta >= 0 ? "+" : ""}
                  {trend.volumeDelta} ({trend.volumeDeltaPct >= 0 ? "+" : ""}
                  {trend.volumeDeltaPct.toFixed(1)}%)
                </p>
              </div>
              <div className={`${trend.diversityDelta >= 0 ? TASTE_POSITIVE_SUBCARD_CLASS : TASTE_NEGATIVE_SUBCARD_CLASS} p-3`}>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("diversity")}</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    trend.diversityDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {trend.diversityDelta >= 0 ? "+" : ""}
                  {trend.diversityDelta.toFixed(2)}
                </p>
              </div>
              <div className={`${TASTE_SUBCARD_CLASS} p-3`}>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("genres")}</p>
                <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                  {trend.genreCountPrevious} → {trend.genreCountCurrent}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {trend.emergingGenres.length > 0 ? (
                <div className={`${TASTE_POSITIVE_SUBCARD_CLASS} p-4`}>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-emerald-500" aria-hidden>
                      ↑
                    </span>
                    {t("emergingGenres")}
                  </h4>
                  <ul className="space-y-1.5">
                    {trend.emergingGenres.slice(0, 5).map((g) => (
                      <li key={g.genre} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>{g.genre}</span>
                        <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{g.deltaPct.toFixed(1)} {t("pp")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {trend.decliningGenres.length > 0 ? (
                <div className={`${TASTE_NEGATIVE_SUBCARD_CLASS} p-4`}>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-rose-500" aria-hidden>
                      ↓
                    </span>
                    {t("decliningGenres")}
                  </h4>
                  <ul className="space-y-1.5">
                    {trend.decliningGenres.slice(0, 5).map((g) => (
                      <li key={g.genre} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>{g.genre}</span>
                        <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
                          {g.deltaPct.toFixed(1)} {t("pp")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {trend.artistRankMovements.length > 0 ? (
              <div className={`${TASTE_SUBCARD_CLASS} p-4`}>
                <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{t("artistMovements")}</h4>
                <ul className="space-y-1.5">
                  {trend.artistRankMovements.slice(0, 5).map((a) => (
                    <li key={a.artistName} className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>{a.artistName}</span>
                      <span
                        className={`font-medium tabular-nums ${
                          a.rankChange > 0 ? "text-emerald-600 dark:text-emerald-400" : a.rankChange < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
                        }`}
                      >
                        {a.previousRank ? `#${a.previousRank} → #${a.currentRank}` : `${t("newRank")} #${a.currentRank}`}
                        {a.rankChange !== 0 ? (
                          <span className="ml-1">
                            ({a.rankChange > 0 ? "+" : ""}
                            {a.rankChange})
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryToggleSkeleton() {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="h-3 w-28 animate-pulse rounded bg-white/15" />
      <div className="h-11 w-full max-w-xs animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}

function TrendCardSkeleton() {
  return (
    <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
      <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}`}>
        <div className="min-w-[200px] flex-1 space-y-2">
          <div className="h-5 w-56 max-w-full animate-shimmer rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-40 max-w-full animate-shimmer rounded bg-slate-200 dark:bg-white/10" />
        </div>
        <div className="h-8 w-28 shrink-0 animate-shimmer rounded-full bg-slate-200 dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((j) => (
          <div key={j} className="space-y-2">
            <div className="h-3 w-16 animate-shimmer rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-6 w-24 animate-shimmer rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TasteEvolutionContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("taste-evolution");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const [summaryVersion, setSummaryVersion] = useState<"light" | "technical">("light");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const userId = searchParams.get("userId") ?? undefined;

  const effectiveRange = useMemo(() => {
    if (startDateParam && endDateParam) {
      return { startDate: startDateParam, endDate: endDateParam };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 56);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [startDateParam, endDateParam]);

  const rangeLabel = formatDateRange(effectiveRange.startDate, effectiveRange.endDate, locale);

  const { data, isLoading, error, refetch } = useTasteEvolution(effectiveRange.startDate, effectiveRange.endDate, userId);

  const handleRetry = () => refetch();

  const pageWrap = "mx-auto max-w-6xl space-y-6 lg:space-y-8";

  if (isLoading) {
    return (
      <>
        <TasteEvolutionMobileSkeleton />
        <div className={`hidden lg:block ${pageWrap}`}>
        <section aria-labelledby="taste-evolution-heading">
          <h2 id="taste-evolution-heading" className="sr-only">
            {t("title")}
          </h2>
          <TasteEvolutionHeroFrame
            badgeLabel={rangeLabel}
            description={t("loading")}
            stats={<TasteEvolutionHeroStatsSkeleton />}
            summaryToggle={<SummaryToggleSkeleton />}
          />
        </section>
        <TasteEvolutionSpotlightSkeleton />
        <div className="space-y-6">
          <div className="h-8 w-56 max-w-full animate-shimmer rounded-lg bg-slate-200 dark:bg-white/10" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <TrendCardSkeleton key={i} />
            ))}
          </div>
        </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <TasteEvolutionMobileError error={error} onRetry={handleRetry} />
        <div className={`hidden lg:block ${pageWrap}`}>
        <section aria-labelledby="taste-evolution-heading">
          <h2 id="taste-evolution-heading" className="sr-only">
            {t("title")}
          </h2>
          <TasteEvolutionHeroFrame badgeLabel={rangeLabel} description={t("errorLoading")} stats={null} />
        </section>
        <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative p-6 sm:p-8">
            <ErrorState variant="startup" error={error} message={t("errorMessage")} onRetry={handleRetry} />
          </div>
        </div>
        </div>
      </>
    );
  }

  if (!data || data.trends.length === 0) {
    return (
      <>
        <TasteEvolutionMobileEmpty />
        <div className={`hidden lg:block ${pageWrap}`}>
        <section aria-labelledby="taste-evolution-heading">
          <h2 id="taste-evolution-heading" className="sr-only">
            {t("title")}
          </h2>
          <TasteEvolutionHeroFrame badgeLabel={rangeLabel} description={t("emptySubtitle")} stats={null} />
        </section>
        <EmptyState variant="startup" {...emptyStatePresets.importData} message={t("insufficientData")} description={t("importDescription")} />
        </div>
      </>
    );
  }

  const hasCommentary = data.commentary || data.commentaryLight;
  const displayCommentary =
    summaryVersion === "light" && data.commentaryLight ? data.commentaryLight : (data.commentary ?? data.commentaryLight);

  const summaryToggle =
    data.commentary && data.commentaryLight ? (
      <TasteSummaryVersionToggle summaryVersion={summaryVersion} onVersionChange={setSummaryVersion} />
    ) : undefined;

  return (
    <div className={pageWrap}>
      <section aria-labelledby="taste-evolution-heading">
        <h2 id="taste-evolution-heading" className="sr-only">
          {t("title")}
        </h2>
        <TasteEvolutionHeroFrame
          badgeLabel={rangeLabel}
          description={t("subtitle")}
          stats={<TasteEvolutionHeroStats data={data} />}
          summaryToggle={summaryToggle}
        />
      </section>

      {hasCommentary && displayCommentary ? (
        <section
          className={`relative ${DASHBOARD_SPOTLIGHT_SHELL} animate-fade-in-up transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/35`}
          aria-labelledby="taste-evolution-spotlight-title"
        >
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative">
            <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-violet-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-violet-200">
                  <Zap className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h3 id="taste-evolution-spotlight-title" className={DASHBOARD_SPOTLIGHT_TITLE}>
                    {t("spotlightTitle")}
                  </h3>
                  <p className={`mt-0.5 ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                    {t("spotlightHint")}
                    {data.commentaryCached ? <span className="ml-1">{t("cached")}</span> : null}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <p className="leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">{displayCommentary}</p>
            </div>
          </div>
        </section>
      ) : data.aiUnavailable ? (
        <section
          className={`relative ${DASHBOARD_SPOTLIGHT_SHELL} animate-fade-in-up`}
          aria-labelledby="taste-evolution-spotlight-title"
        >
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative">
            <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-violet-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-violet-200">
                  <Zap className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h3 id="taste-evolution-spotlight-title" className={DASHBOARD_SPOTLIGHT_TITLE}>
                    {t("spotlightTitle")}
                  </h3>
                  <p className={`mt-0.5 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("spotlightHint")}</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <AiUnavailableCta reason={data.aiUnavailableReason ?? "consent"} />
            </div>
          </div>
        </section>
      ) : null}

      {data.skippedWeeks.length > 0 ? (
        <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} border-amber-200/90 bg-amber-50/90 dark:border-amber-400/25 dark:bg-amber-950/35`}>
          <p className="text-sm text-amber-950 dark:text-amber-100">
            <strong>{t("skippedWeeks")}:</strong> {data.skippedWeeks.map((s) => `${s.weekStart} (${s.reason})`).join(" · ")}
          </p>
        </div>
      ) : null}

      <section className="space-y-6" aria-labelledby="taste-weekly-trends-title">
        <h3 id="taste-weekly-trends-title" className={`${DASHBOARD_SPOTLIGHT_TITLE} text-xl lg:text-2xl`}>
          {t("weeklyTrends")}
        </h3>
        <div className="space-y-6">
          {[...data.trends].reverse().map((trend, index) => (
            <TrendCard key={trend.timeRange.weekStart} trend={trend} t={t} isLastWeek={index === 0} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TasteEvolutionFallback() {
  const t = useTranslations("taste-evolution");
  const locale = useLocale();
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 56);
  const rangeLabel = formatDateRange(start.toISOString().split("T")[0], end.toISOString().split("T")[0], locale);
  return (
    <>
      <TasteEvolutionMobileSkeleton />
      <div className="mx-auto hidden max-w-6xl space-y-6 lg:block lg:space-y-8">
      <section aria-labelledby="taste-evolution-heading">
        <h2 id="taste-evolution-heading" className="sr-only">
          {t("title")}
        </h2>
        <TasteEvolutionHeroFrame
          badgeLabel={rangeLabel}
          description={t("loadingShort")}
          stats={<TasteEvolutionHeroStatsSkeleton />}
          summaryToggle={<SummaryToggleSkeleton />}
        />
      </section>
      <TasteEvolutionSpotlightSkeleton />
      <div className="space-y-6">
        <div className="h-8 w-48 max-w-full animate-shimmer rounded-lg bg-slate-200 dark:bg-white/10" />
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <TrendCardSkeleton key={i} />
          ))}
        </div>
      </div>
      </div>
    </>
  );
}

export default function TasteEvolutionPage() {
  return (
    <div className="px-4 pb-4 pt-0 sm:px-0 lg:py-6">
      <Suspense fallback={<TasteEvolutionFallback />}>
        <TasteEvolutionContent />
      </Suspense>
    </div>
  );
}
