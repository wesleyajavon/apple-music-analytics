"use client";

import { useState, useMemo, Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useTasteEvolution } from "@/lib/hooks/use-taste-evolution";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { TasteEvolutionSpotlightSkeleton } from "@/lib/components/skeleton-loaders";
import type {
  TasteEvolutionResponse,
  WeekToWeekTrend,
  TrendClassification,
} from "@/lib/dto/taste-evolution";
import { Sprout } from "lucide-react";

const CLASSIFICATION_COLORS: Record<TrendClassification, string> = {
  expansion: "border border-emerald-300/20 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  consolidation: "border border-sky-300/20 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  exploration: "border border-indigo-300/20 bg-indigo-400/10 text-indigo-700 dark:text-indigo-300",
  regression: "border border-rose-300/20 bg-rose-400/10 text-rose-700 dark:text-rose-300",
  stable: "text-gray-500 dark:text-gray-400",
};
const TASTE_RAIL_CLASS = "bg-gradient-to-r from-emerald-300 via-sky-400 to-indigo-400";
const TASTE_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-sky-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#134e4a_100%)] px-6 py-8 shadow-2xl shadow-emerald-950/35 sm:px-8 sm:py-10";
const TASTE_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-sky-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.1),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card backdrop-blur-sm dark:border-sky-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.14),_transparent_30%),rgb(var(--card-rgb)/0.9)]";
const TASTE_SUBCARD_CLASS =
  "rounded-xl border border-sky-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.1),_transparent_38%),rgb(var(--card-rgb)/0.68)] shadow-sm dark:border-sky-300/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.13),_transparent_38%),rgb(15_23_42/0.34)]";
const TASTE_POSITIVE_SUBCARD_CLASS =
  "rounded-xl border border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.14),_transparent_40%),rgb(var(--card-rgb)/0.68)] shadow-sm dark:border-emerald-300/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.16),_transparent_40%),rgb(15_23_42/0.34)]";
const TASTE_NEGATIVE_SUBCARD_CLASS =
  "rounded-xl border border-rose-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.12),_transparent_40%),rgb(var(--card-rgb)/0.68)] shadow-sm dark:border-rose-300/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.14),_transparent_40%),rgb(15_23_42/0.34)]";

function formatDateRange(startDate: string, endDate: string, locale?: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const loc = locale && locale.length > 0 ? locale : undefined;
  return `${start.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`;
}

function TasteEvolutionHeroFrame({
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
  const t = useTranslations("taste-evolution");
  return (
    <div className={TASTE_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(56,189,248,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-indigo-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TASTE_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <Sprout className="h-9 w-9 shrink-0 text-emerald-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${TASTE_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(16,185,129,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-sky-100/90 sm:text-lg">{description}</p>
          <p className="mt-2 text-sm font-medium text-indigo-100/90">
            <span className="inline-flex items-center rounded-full border border-sky-200/30 bg-white/10 px-3 py-1">
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

function TasteEvolutionHeroStats({ data }: { data: TasteEvolutionResponse }) {
  const t = useTranslations("taste-evolution");
  const latest = data.trends.length > 0 ? data.trends[data.trends.length - 1] : null;
  const latestLabel = latest ? t(`classifications.${latest.classification}`) : "—";
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      <div className="rounded-xl border border-emerald-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/80">{t("heroStatComparisons")}</p>
        <p className="text-2xl font-bold text-white">{data.trends.length}</p>
      </div>
      <div className="rounded-xl border border-sky-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-sky-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-sky-100/80">{t("heroStatLatest")}</p>
        <p className="text-2xl font-bold text-white">{latestLabel}</p>
      </div>
      <div className="rounded-xl border border-indigo-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-indigo-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-100/80">{t("heroStatSkipped")}</p>
        <p className="text-2xl font-bold text-white">{data.skippedWeeks.length}</p>
      </div>
    </div>
  );
}

function TasteEvolutionHeroStatsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[140px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-initial"
        >
          <div className="mb-2 h-3 w-24 rounded bg-white/15" />
          <div className="h-8 w-12 rounded bg-white/20" />
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
    <div className="flex w-full flex-col gap-2 sm:w-auto" role="tablist" aria-label={t("aiExplanation")}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {t("summaryStyleLabel")}
      </span>
      <div className="inline-flex rounded-xl border border-white/20 bg-white/10 p-1 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          role="tab"
          aria-selected={summaryVersion === "light"}
          onClick={() => onVersionChange("light")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            summaryVersion === "light"
              ? "bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 text-white shadow-sm shadow-sky-950/20"
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
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            summaryVersion === "technical"
              ? "bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 text-white shadow-sm shadow-sky-950/20"
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
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {trend.timeRange.label} {t("vs")} {trend.previousWeekRange.label}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {trend.currentWeekListens} {t("listens")} ({t("vs")} {trend.previousWeekListens})
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${classificationColor}`}
        >
          {classificationLabel}
        </span>
        {isCollapsible && (
          <span
            className={`inline-flex items-center text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>
    </>
  );

  const borderClass = !isCollapsible || isExpanded
    ? "border-b border-sky-200/20 dark:border-sky-300/10"
    : "";

  if (isCollapsible && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-sky-400/10 transition-colors cursor-pointer ${borderClass}`}
        aria-expanded={isExpanded}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${borderClass}`}>
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
    <div className={`${TASTE_PANEL_CLASS} rounded-xl`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TASTE_RAIL_CLASS} opacity-70`} />
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
      <div className="relative p-5 space-y-4">
        {/* Volume & diversity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={(trend.volumeDelta >= 0 ? TASTE_POSITIVE_SUBCARD_CLASS : TASTE_NEGATIVE_SUBCARD_CLASS) + " p-3"}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("volume")}
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                trend.volumeDelta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.volumeDelta >= 0 ? "+" : ""}
              {trend.volumeDelta} ({trend.volumeDeltaPct >= 0 ? "+" : ""}
              {trend.volumeDeltaPct.toFixed(1)}%)
            </p>
          </div>
          <div className={(trend.diversityDelta >= 0 ? TASTE_POSITIVE_SUBCARD_CLASS : TASTE_NEGATIVE_SUBCARD_CLASS) + " p-3"}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("diversity")}
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                trend.diversityDelta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.diversityDelta >= 0 ? "+" : ""}
              {trend.diversityDelta.toFixed(2)}
            </p>
          </div>
          <div className={TASTE_SUBCARD_CLASS + " p-3"}>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("genres")}
            </p>
            <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
              {trend.genreCountPrevious} → {trend.genreCountCurrent}
            </p>
          </div>
        </div>

        {/* Emerging / declining genres */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trend.emergingGenres.length > 0 && (
            <div className={TASTE_POSITIVE_SUBCARD_CLASS + " p-4"}>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-emerald-500" aria-hidden>↑</span>
                {t("emergingGenres")}
              </h4>
              <ul className="space-y-1.5">
                {trend.emergingGenres.slice(0, 5).map((g) => (
                  <li
                    key={g.genre}
                    className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span>{g.genre}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{g.deltaPct.toFixed(1)} {t("pp")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trend.decliningGenres.length > 0 && (
            <div className={TASTE_NEGATIVE_SUBCARD_CLASS + " p-4"}>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-rose-500" aria-hidden>↓</span>
                {t("decliningGenres")}
              </h4>
              <ul className="space-y-1.5">
                {trend.decliningGenres.slice(0, 5).map((g) => (
                  <li
                    key={g.genre}
                    className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span>{g.genre}</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                      {g.deltaPct.toFixed(1)} {t("pp")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Artist movements */}
        {trend.artistRankMovements.length > 0 && (
          <div className={TASTE_SUBCARD_CLASS + " p-4"}>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("artistMovements")}
            </h4>
            <ul className="space-y-1.5">
              {trend.artistRankMovements.slice(0, 5).map((a) => (
                <li
                  key={a.artistName}
                  className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>{a.artistName}</span>
                  <span
                    className={`font-medium tabular-nums ${
                      a.rankChange > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : a.rankChange < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-gray-500"
                    }`}
                  >
                    {a.previousRank
                      ? `#${a.previousRank} → #${a.currentRank}`
                      : `${t("newRank")} #${a.currentRank}`}
                    {a.rankChange !== 0 && (
                      <span className="ml-1">
                        ({a.rankChange > 0 ? "+" : ""}
                        {a.rankChange})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      )}
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

  const { data, isLoading, error, refetch } = useTasteEvolution(
    effectiveRange.startDate,
    effectiveRange.endDate,
    userId
  );

  const handleRetry = () => refetch();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <TasteEvolutionHeroFrame
          badgeLabel={rangeLabel}
          description={t("loading")}
          stats={<TasteEvolutionHeroStatsSkeleton />}
        />
        <TasteEvolutionSpotlightSkeleton />
        <div className="space-y-6">
          <div className="h-8 max-w-full w-48 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card dark:border-gray-700/50 dark:bg-gray-800/90"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700/50">
                  <div className="min-w-[200px] flex-1 space-y-2">
                    <div className="h-5 w-56 max-w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-40 max-w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-8 w-28 shrink-0 animate-shimmer rounded-full bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-3 w-16 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-6 w-24 animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <TasteEvolutionHeroFrame
          badgeLabel={rangeLabel}
          description={t("errorLoading")}
          stats={null}
        />
        <ErrorState
          error={error}
          message={t("errorMessage")}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!data || data.trends.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <TasteEvolutionHeroFrame
          badgeLabel={rangeLabel}
          description={t("emptySubtitle")}
          stats={null}
        />
        <EmptyState
          {...emptyStatePresets.importData}
          message={t("insufficientData")}
          description={t("importDescription")}
        />
      </div>
    );
  }

  const hasCommentary = data.commentary || data.commentaryLight;
  const displayCommentary =
    summaryVersion === "light" && data.commentaryLight
      ? data.commentaryLight
      : (data.commentary ?? data.commentaryLight);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <TasteEvolutionHeroFrame
        badgeLabel={rangeLabel}
        description={t("subtitle")}
        stats={<TasteEvolutionHeroStats data={data} />}
        aside={
          data.commentary && data.commentaryLight ? (
            <TasteSummaryVersionToggle
              summaryVersion={summaryVersion}
              onVersionChange={setSummaryVersion}
            />
          ) : undefined
        }
      />

      {/* Spotlight: AI Summary — main info in the spotlight */}
      {hasCommentary && displayCommentary && (
        <section
          className={`${TASTE_PANEL_CLASS} animate-fade-in-up transition-all duration-300 hover:shadow-card-hover`}
          aria-labelledby="taste-evolution-spotlight-title"
        >
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TASTE_RAIL_CLASS} opacity-85`} />
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-sky-400/12 blur-3xl dark:bg-sky-400/16" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-400/16" />

          <div className="relative">
            <div className="border-b border-sky-200/20 px-6 py-5 dark:border-sky-300/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 text-sky-600 shadow-sm shadow-sky-950/10 dark:text-sky-200">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                    />
                  </svg>
                </div>
                <div>
                  <h2
                    id="taste-evolution-spotlight-title"
                    className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
                  >
                    {t("spotlightTitle")}
                  </h2>
                  <p className="mt-0.5 text-sm text-sky-700/75 dark:text-sky-100/65">
                    {t("spotlightHint")}
                    {data.commentaryCached && (
                      <span className="ml-1">{t("cached")}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {displayCommentary}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Skipped weeks notice */}
      {data.skippedWeeks.length > 0 && (
        <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{t("skippedWeeks")} :</strong>{" "}
            {data.skippedWeeks.map((s) => `${s.weekStart} (${s.reason})`).join(" ; ")}
          </p>
        </div>
      )}

      {/* Trend cards */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("weeklyTrends")}
        </h2>
        <div className="space-y-6">
          {[...data.trends].reverse().map((trend, index) => (
            <TrendCard
              key={trend.timeRange.weekStart}
              trend={trend}
              t={t}
              isLastWeek={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TasteEvolutionFallback() {
  const t = useTranslations("taste-evolution");
  const locale = useLocale();
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 56);
  const rangeLabel = formatDateRange(
    start.toISOString().split("T")[0],
    end.toISOString().split("T")[0],
    locale,
  );
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <TasteEvolutionHeroFrame
        badgeLabel={rangeLabel}
        description={t("loadingShort")}
        stats={<TasteEvolutionHeroStatsSkeleton />}
        aside={
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className="h-3 w-24 animate-pulse rounded bg-white/15" />
            <div className="h-10 w-52 animate-pulse rounded-xl bg-white/10" />
          </div>
        }
      />
      <TasteEvolutionSpotlightSkeleton />
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer max-w-full" />
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={TASTE_PANEL_CLASS}
            >
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TASTE_RAIL_CLASS} opacity-70`} />
                <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-sky-200/20 dark:border-sky-300/10">
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <div className="h-5 w-56 max-w-full rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
                  <div className="h-4 w-40 max-w-full rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
                </div>
                <div className="h-8 w-28 rounded-full bg-gray-200 dark:bg-gray-700 animate-shimmer shrink-0" />
              </div>
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
                    <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-shimmer" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TasteEvolutionPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<TasteEvolutionFallback />}>
        <TasteEvolutionContent />
      </Suspense>
    </div>
  );
}
