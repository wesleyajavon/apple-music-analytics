"use client";

import { useCallback, Suspense, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LayoutDashboard, MessageSquareText, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
} from "@/lib/constants/dashboard-spotlight";
import { useAiInsights } from "@/lib/hooks/use-ai-insights";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import {
  AiInsightsMobileBackfill,
  AiInsightsMobileEmpty,
  AiInsightsMobileError,
  AiInsightsMobileExperience,
  AiInsightsMobileQuota,
  AiInsightsMobileSkeleton,
  AiInsightsMobileUnavailable,
} from "@/lib/components/ai-insights-mobile";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import {
  isGroqDailyQuotaError,
  isGroqGenreClassificationBlockingError,
} from "@/lib/utils/groq-quota-message";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import type { AiInsightMoment, AiInsightsStyle } from "@/lib/dto/ai-insights";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

function artistPreviewFromMoment(
  moment: AiInsightMoment,
  startDate?: string,
  endDate?: string
): ArtistStatsDto {
  return {
    artistId: moment.artistId ?? "",
    artistName: moment.artistName ?? "",
    imageUrl: null,
    listenCount: 0,
    uniqueTracks: 0,
    firstListenDate: startDate ?? "",
    lastListenDate: endDate ?? "",
    totalPlayTime: 0,
  };
}

/** Accent color variants for insight cards */
const INSIGHT_ACCENTS = [
  { bg: "bg-white dark:bg-slate-950/50", border: "border-l-cyan-500", icon: "text-cyan-600 dark:text-cyan-300", iconBg: "border border-cyan-200/80 bg-cyan-50 dark:border-cyan-300/20 dark:bg-cyan-400/10" },
  { bg: "bg-white dark:bg-slate-950/50", border: "border-l-sky-500", icon: "text-sky-600 dark:text-sky-300", iconBg: "border border-sky-200/80 bg-sky-50 dark:border-sky-300/20 dark:bg-sky-400/10" },
  { bg: "bg-white dark:bg-slate-950/50", border: "border-l-indigo-500", icon: "text-indigo-600 dark:text-indigo-300", iconBg: "border border-indigo-200/80 bg-indigo-50 dark:border-indigo-300/20 dark:bg-indigo-400/10" },
  { bg: "bg-white dark:bg-slate-950/50", border: "border-l-blue-500", icon: "text-blue-600 dark:text-blue-300", iconBg: "border border-blue-200/80 bg-blue-50 dark:border-blue-300/20 dark:bg-blue-400/10" },
  { bg: "bg-white dark:bg-slate-950/50", border: "border-l-violet-500", icon: "text-violet-600 dark:text-violet-300", iconBg: "border border-violet-200/80 bg-violet-50 dark:border-violet-300/20 dark:bg-violet-400/10" },
] as const;

/** Même shell hero que `/dashboard/timeline` — vibe startup / Vercel */
const AI_INSIGHTS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

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

function AiInsightsHeroTrustPanel() {
  const t = useTranslations("ai-insights");
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

function AiInsightsHeroFrame({
  badgeLabel,
  description,
  stats,
  insightStyleToggle,
}: {
  badgeLabel: string;
  description: string;
  stats: ReactNode | null;
  insightStyleToggle: ReactNode;
}) {
  const t = useTranslations("ai-insights");
  return (
    <div className={AI_INSIGHTS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <LiveStatusDot />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <SparkIcon className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              {badgeLabel}
            </span>
          </div>
          <div className="mt-5">{insightStyleToggle}</div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/ask-your-soundprint"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <MessageSquareText className="h-4 w-4" aria-hidden />
              {t("ctaAskSoundprint")}
            </Link>
            <Link
              href="/dashboard/overview"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {t("ctaOverview")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
              </div>
              {stats ?? <AiInsightsHeroTrustPanel />}
            </div>
          </div>
        </div>
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
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{insightCount}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatInsights")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold tracking-tight text-white">{t(`styleToggle.${insightStyle}`)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatTone")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:col-span-1">
        <p className="text-sm font-semibold leading-snug text-white">{statusText}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatStatus")}</p>
      </div>
    </div>
  );
}

function AiInsightsHeroStatsSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-16 rounded bg-white/20" />
          <div className="h-3 w-20 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function InsightMomentCard({
  moment,
  index,
  href,
  onOpenArtist,
}: {
  moment: AiInsightMoment;
  index: number;
  href: string;
  onOpenArtist?: (moment: AiInsightMoment) => void;
}) {
  const t = useTranslations("ai-insights");
  const accent = INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length];
  const className = `
        relative block overflow-hidden rounded-xl border border-slate-200/90 border-l-4 bg-white shadow-sm
        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.06]
        dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none dark:hover:shadow-black/25
        ${accent.border} ${accent.bg}
        opacity-0 animate-fade-in-up
      `;
  const inner = (
      <div className="flex gap-4 p-6">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconBg} ${accent.icon}`} aria-hidden>
          <SparkIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
              {t(`kinds.${moment.kind}`)}
            </span>
            {moment.metric ? (
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                {moment.metric}
              </span>
            ) : null}
          </div>
          {moment.title ? (
            <p className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{moment.title}</p>
          ) : null}
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">{moment.body}</p>
          <p className="flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
            {t("openMoment")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </p>
        </div>
      </div>
  );
  if (moment.artistId && onOpenArtist) {
    return (
      <button
        type="button"
        onClick={() => onOpenArtist(moment)}
        className={`${className} w-full text-left`}
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {inner}
    </Link>
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
    <div className="flex w-full max-w-md flex-col gap-2" role="group" aria-label={t("styleToggle.ariaLabel")}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{t("styleToggle.label")}</span>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-white/15 bg-white/10 p-1.5 shadow-sm backdrop-blur-sm sm:flex-nowrap">
        {(["human", "technical"] as const).map((style) => {
          const isActive = insightStyle === style;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStyleChange(style)}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-white text-gray-950 shadow-sm shadow-black/20"
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

function InsightCardSkeleton() {
  return (
    <div className={`relative overflow-hidden ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
      <div className="flex gap-4">
        <div className="h-10 w-10 shrink-0 animate-shimmer rounded-xl bg-slate-200 dark:bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full animate-shimmer rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-5/6 animate-shimmer rounded bg-slate-200 dark:bg-white/10" />
          <div className="h-4 w-4/5 animate-shimmer rounded bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function splitScreen(mobile: ReactNode, desktop: ReactNode) {
  return (
    <>
      <div className="lg:hidden">{mobile}</div>
      <div className="hidden lg:block">{desktop}</div>
    </>
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
  const [artistOverlayMoment, setArtistOverlayMoment] = useState<AiInsightMoment | null>(null);
  const withFilters = useMemo(
    () => (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams],
  );
  const askHref = withFilters("/dashboard/ask-your-soundprint");

  const { data, isLoading, error, refetch } = useAiInsights(startDate, endDate, {
    insightStyle,
    userId,
  });
  const isLoadingOrFetching = isRangeLoading || isLoading;
  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  const dateRangeLabel = formatDateRange(startDate, endDate, locale);
  const badgeLabelBase = dateRangeLabel || tOverview("allData");

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOpenArtist = useCallback((moment: AiInsightMoment) => {
    if (!moment.artistId) return;
    setArtistOverlayMoment(moment);
  }, []);

  const styleToggle = <InsightStyleToggle insightStyle={insightStyle} onStyleChange={setInsightStyle} />;

  if (interactiveAiBlockedByGenreBackfill && !isRangeLoading) {
    return splitScreen(
      <AiInsightsMobileBackfill locale={locale} startDate={startDate} endDate={endDate} />,
      <div className="mx-auto max-w-6xl space-y-8">
        <section aria-labelledby="ai-insights-heading">
          <h2 id="ai-insights-heading" className="sr-only">
            {t("title")}
          </h2>
          <AiInsightsHeroFrame
            badgeLabel={badgeLabelBase}
            description={t("yourInsights")}
            stats={null}
            insightStyleToggle={styleToggle}
          />
        </section>
        <InteractiveAiGenreBackfillNotice />
      </div>,
    );
  }

  if (isLoadingOrFetching) {
    return splitScreen(
      <AiInsightsMobileSkeleton locale={locale} startDate={startDate} endDate={endDate} />,
      <div className="mx-auto max-w-6xl space-y-8">
        <section aria-labelledby="ai-insights-heading">
          <h2 id="ai-insights-heading" className="sr-only">
            {t("title")}
          </h2>
          <AiInsightsHeroFrame
            badgeLabel={t("loadingShort")}
            description={t("generating")}
            stats={<AiInsightsHeroStatsSkeleton />}
            insightStyleToggle={styleToggle}
          />
        </section>
        <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative space-y-4 p-6 sm:p-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <InsightCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>,
    );
  }

  if (error) {
    if (isGroqGenreClassificationBlockingError(error)) {
      return splitScreen(
        <AiInsightsMobileBackfill locale={locale} startDate={startDate} endDate={endDate} force />,
        <div className="mx-auto max-w-6xl space-y-8">
          <section aria-labelledby="ai-insights-heading">
            <h2 id="ai-insights-heading" className="sr-only">
              {t("title")}
            </h2>
            <AiInsightsHeroFrame
              badgeLabel={badgeLabelBase}
              description={t("yourInsights")}
              stats={null}
              insightStyleToggle={styleToggle}
            />
          </section>
          <InteractiveAiGenreBackfillNotice force />
        </div>,
      );
    }
    return splitScreen(
      isGroqDailyQuotaError(error) ? (
        <AiInsightsMobileQuota error={error} locale={locale} startDate={startDate} endDate={endDate} />
      ) : (
        <AiInsightsMobileError locale={locale} startDate={startDate} endDate={endDate} onRetry={handleRetry} />
      ),
      <div className="mx-auto max-w-6xl space-y-8">
        <section aria-labelledby="ai-insights-heading">
          <h2 id="ai-insights-heading" className="sr-only">
            {t("title")}
          </h2>
          <AiInsightsHeroFrame
            badgeLabel={badgeLabelBase}
            description={t("errorLoading")}
            stats={null}
            insightStyleToggle={styleToggle}
          />
        </section>
        <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative p-6 sm:p-8">
            <ErrorState variant="startup" error={error} message={t("errorMessage")} onRetry={handleRetry} />
            <p className={`mt-4 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("checkApiKey")}</p>
          </div>
        </div>
      </div>,
    );
  }

  if (!data || !data.insights.length) {
    return splitScreen(
      data?.aiUnavailable ? (
        <AiInsightsMobileUnavailable
          locale={locale}
          reason={data.aiUnavailableReason}
          startDate={startDate}
          endDate={endDate}
        />
      ) : (
        <AiInsightsMobileEmpty locale={locale} startDate={startDate} endDate={endDate} />
      ),
      <div className="mx-auto max-w-6xl space-y-8">
        <section aria-labelledby="ai-insights-heading">
          <h2 id="ai-insights-heading" className="sr-only">
            {t("title")}
          </h2>
          <AiInsightsHeroFrame
            badgeLabel={badgeLabelBase}
            description={t("noInsights")}
            stats={null}
            insightStyleToggle={styleToggle}
          />
        </section>
        <EmptyState
          variant="startup"
          {...emptyStatePresets.importData}
          message={t("notEnoughData")}
          description={t("importDescription")}
        />
      </div>,
    );
  }

  return (
    <>
    {splitScreen(
    <AiInsightsMobileExperience
      askHref={askHref}
      cached={data.cached}
      endDate={endDate}
      insightStyle={insightStyle}
      insights={data.insights}
      locale={locale}
      moments={data.moments}
      onOpenArtist={handleOpenArtist}
      onStyleChange={setInsightStyle}
      rateLimitRemaining={data.rateLimit?.remaining}
      startDate={startDate}
      withFilters={withFilters}
    />,
    <div className="mx-auto max-w-6xl space-y-8">
      <section aria-labelledby="ai-insights-heading">
        <h2 id="ai-insights-heading" className="sr-only">
          {t("title")}
        </h2>
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
          insightStyleToggle={styleToggle}
        />
      </section>

      <section className={`relative ${DASHBOARD_SPOTLIGHT_SHELL} animate-fade-in-up transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/35`} aria-labelledby="ai-insights-spotlight-title">
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
        <div className="relative">
          <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-violet-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-violet-200">
                <SparkIcon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 id="ai-insights-spotlight-title" className={DASHBOARD_SPOTLIGHT_TITLE}>
                  {t("spotlightTitle")}
                </h3>
                <p className={`mt-0.5 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("spotlightHint")}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6 sm:p-8 md:p-10">
            {(data.moments && data.moments.length > 0
              ? data.moments.map((moment, index) => (
                  <InsightMomentCard
                    key={moment.id}
                    moment={moment}
                    index={index}
                    href={withFilters(moment.href)}
                    onOpenArtist={handleOpenArtist}
                  />
                ))
              : data.insights.map((insight, index) => {
                  const accent = INSIGHT_ACCENTS[index % INSIGHT_ACCENTS.length];
                  return (
                    <div
                      key={index}
                      className={`
                        relative overflow-hidden rounded-xl border border-slate-200/90 border-l-4 bg-white shadow-sm
                        transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.06]
                        dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none dark:hover:shadow-black/25
                        ${accent.border} ${accent.bg}
                        opacity-0 animate-fade-in-up
                      `}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="flex gap-4 p-6">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconBg} ${accent.icon}`} aria-hidden>
                          <SparkIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="leading-relaxed text-slate-700 dark:text-slate-300">{insight}</p>
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-white" aria-hidden>
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  );
                }))}
          </div>
        </div>
      </section>
    </div>,
    )}
    <ArtistUserInsightsPanel
      open={artistOverlayMoment != null}
      artistId={artistOverlayMoment?.artistId ?? null}
      previewArtist={
        artistOverlayMoment?.artistId
          ? artistPreviewFromMoment(artistOverlayMoment, startDate, endDate)
          : null
      }
      startDate={startDate}
      endDate={endDate}
      userId={userId}
      locale={locale}
      colorIndex={0}
      onClose={() => setArtistOverlayMoment(null)}
    />
    </>
  );
}

function AiInsightsFallback() {
  const t = useTranslations("ai-insights");
  const locale = useLocale();
  return splitScreen(
    <AiInsightsMobileSkeleton locale={locale} />,
    <div className="mx-auto max-w-6xl space-y-8">
      <section aria-labelledby="ai-insights-heading">
        <h2 id="ai-insights-heading" className="sr-only">
          {t("title")}
        </h2>
        <AiInsightsHeroFrame
          badgeLabel={t("loadingShort")}
          description={t("loadingShort")}
          stats={<AiInsightsHeroStatsSkeleton />}
          insightStyleToggle={
            <div className="flex w-full max-w-md flex-col gap-2">
              <div className="h-3 w-24 animate-pulse rounded bg-white/15" />
              <div className="h-11 w-full max-w-xs animate-pulse rounded-xl bg-white/10" />
            </div>
          }
        />
      </section>
      <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
        <div className="relative space-y-4 p-6 sm:p-8">
          {[1, 2, 3].map((i) => (
            <InsightCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>,
  );
}

/**
 * AI Insights page - One-shot insight generator from aggregated analytics.
 * Displays 3-5 concise, data-grounded bullet points in styled cards.
 */
export default function AiInsightsPage() {
  return (
    <div className="max-lg:p-0 px-4 py-6 sm:px-0">
      <Suspense fallback={<AiInsightsFallback />}>
        <AiInsightsContent />
      </Suspense>
    </div>
  );
}
