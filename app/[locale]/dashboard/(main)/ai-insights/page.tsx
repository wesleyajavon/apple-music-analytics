"use client";

import { useCallback, Suspense, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LayoutDashboard, MessageSquareText, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
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
import { AiUnavailableEmptyState } from "@/lib/components/ai-unavailable-empty-state";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import {
  isGroqDailyQuotaError,
  isGroqGenreClassificationBlockingError,
} from "@/lib/utils/groq-quota-message";
import type { AiInsightMoment, AiInsightsStyle } from "@/lib/dto/ai-insights";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

function artistPreviewFromMoment(
  moment: AiInsightMoment,
  startDate?: string,
  endDate?: string,
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

function formatDateRange(startDate?: string, endDate?: string, locale?: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const loc = locale && locale.length > 0 ? locale : undefined;
  return `${start.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(loc, { month: "short", day: "numeric", year: "numeric" })}`;
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
      <span className="text-[13px] font-medium text-muted">{t("styleToggle.label")}</span>
      <div className={DASHBOARD_SEGMENTED_TRACK}>
        {(["human", "technical"] as const).map((style) => {
          const isActive = insightStyle === style;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStyleChange(style)}
              className={isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
            >
              {t(`styleToggle.${style}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AiInsightsMetricStrip({
  insightCount,
  insightStyle,
  cached,
  rateLimitRemaining,
  loading = false,
}: {
  insightCount?: number;
  insightStyle?: AiInsightsStyle;
  cached?: boolean;
  rateLimitRemaining?: number;
  loading?: boolean;
}) {
  const t = useTranslations("ai-insights");
  const statusText =
    typeof rateLimitRemaining === "number"
      ? t("quotaRemaining", { count: rateLimitRemaining })
      : cached
        ? t("cached")
        : t("heroFresh");

  const metrics = [
    {
      key: "count",
      label: t("heroStatInsights"),
      value: insightCount != null ? String(insightCount) : null,
    },
    {
      key: "tone",
      label: t("heroStatTone"),
      value: insightStyle ? t(`styleToggle.${insightStyle}`) : null,
    },
    {
      key: "status",
      label: t("heroStatStatus"),
      value: loading ? null : statusText,
    },
  ];

  return (
    <div
      className={`${DASHBOARD_METRIC_STRIP} w-full max-lg:flex-nowrap max-lg:overflow-x-auto`}
      aria-busy={loading || undefined}
    >
      {metrics.map((metric) => (
        <div key={metric.key} className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[10.5rem] max-lg:flex-none`}>
          <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
          {metric.value == null ? (
            <span
              className={`${DASHBOARD_METRIC_VALUE} inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`}
            />
          ) : (
            <span className={DASHBOARD_METRIC_VALUE}>{metric.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function AiInsightsMasthead({
  description,
  badgeLabel,
  insightStyleToggle,
  stats,
}: {
  description: string;
  badgeLabel: string;
  insightStyleToggle: ReactNode;
  stats: ReactNode | null;
}) {
  const t = useTranslations("ai-insights");
  return (
    <OverviewHeroFrame title={t("title")} description={description}>
      <p className="mt-3 text-[13px] font-medium text-muted">{badgeLabel}</p>
      <div className="mt-5">{insightStyleToggle}</div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/ask-your-soundprint" className={DASHBOARD_BTN_OUTLINE}>
          <MessageSquareText className="h-4 w-4" aria-hidden />
          {t("ctaAskSoundprint")}
        </Link>
        <Link href="/dashboard/overview" className={DASHBOARD_BTN_GHOST}>
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          {t("ctaOverview")}
        </Link>
      </div>
      {stats ? <div className="mt-8">{stats}</div> : null}
    </OverviewHeroFrame>
  );
}

function InsightMomentRow({
  moment,
  href,
  onOpenArtist,
}: {
  moment: AiInsightMoment;
  href: string;
  onOpenArtist?: (moment: AiInsightMoment) => void;
}) {
  const t = useTranslations("ai-insights");
  const className = `${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_ROW_INTERACTIVE} ${DASHBOARD_LIST_SEPARATOR} w-full text-left`;
  const inner = (
    <>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-muted">{t(`kinds.${moment.kind}`)}</span>
          {moment.metric ? (
            <span className="text-[13px] font-semibold tabular-nums text-foreground">{moment.metric}</span>
          ) : null}
        </div>
        {moment.title ? (
          <p className="text-sm font-semibold tracking-tight text-foreground">{moment.title}</p>
        ) : null}
        <p className="text-[13px] leading-6 text-muted">{moment.body}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-foreground">
        {t("openMoment")}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </>
  );
  if (moment.artistId && onOpenArtist) {
    return (
      <button type="button" onClick={() => onOpenArtist(moment)} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function InsightBulletRow({ index, text }: { index: number; text: string }) {
  return (
    <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
      <span className="w-6 shrink-0 text-[13px] font-semibold tabular-nums text-muted">{index}</span>
      <p className="min-w-0 flex-1 text-[13px] leading-6 text-foreground">{text}</p>
    </div>
  );
}

function InsightListSkeleton() {
  return (
    <div className="space-y-0" aria-busy="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
          <div className="h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      ))}
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
        <AiInsightsMasthead
          badgeLabel={badgeLabelBase}
          description={t("yourInsights")}
          stats={null}
          insightStyleToggle={styleToggle}
        />
        <InteractiveAiGenreBackfillNotice />
      </div>,
    );
  }

  if (isLoadingOrFetching) {
    return splitScreen(
      <AiInsightsMobileSkeleton locale={locale} startDate={startDate} endDate={endDate} />,
      <div className="mx-auto max-w-6xl space-y-8">
        <AiInsightsMasthead
          badgeLabel={t("loadingShort")}
          description={t("generating")}
          stats={<AiInsightsMetricStrip loading />}
          insightStyleToggle={styleToggle}
        />
        <section className="w-full min-w-0" aria-labelledby="ai-insights-spotlight-title">
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("spotlightHint")}</p>
          <h2 id="ai-insights-spotlight-title" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
            {t("spotlightTitle")}
          </h2>
          <div className="mt-8">
            <InsightListSkeleton />
          </div>
        </section>
      </div>,
    );
  }

  if (error) {
    if (isGroqGenreClassificationBlockingError(error)) {
      return splitScreen(
        <AiInsightsMobileBackfill locale={locale} startDate={startDate} endDate={endDate} force />,
        <div className="mx-auto max-w-6xl space-y-8">
          <AiInsightsMasthead
            badgeLabel={badgeLabelBase}
            description={t("yourInsights")}
            stats={null}
            insightStyleToggle={styleToggle}
          />
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
        <AiInsightsMasthead
          badgeLabel={badgeLabelBase}
          description={t("errorLoading")}
          stats={null}
          insightStyleToggle={styleToggle}
        />
        <div>
          <ErrorState variant="startup" error={error} message={t("errorMessage")} onRetry={handleRetry} />
          <p className="mt-4 text-[13px] text-muted">{t("checkApiKey")}</p>
        </div>
      </div>,
    );
  }

  if (data?.aiUnavailable) {
    return splitScreen(
      <AiInsightsMobileUnavailable
        locale={locale}
        reason={data.aiUnavailableReason}
        startDate={startDate}
        endDate={endDate}
      />,
      <div className="mx-auto max-w-6xl space-y-8">
        <AiInsightsMasthead
          badgeLabel={badgeLabelBase}
          description={t("yourInsights")}
          stats={null}
          insightStyleToggle={styleToggle}
        />
        <AiUnavailableEmptyState reason={data.aiUnavailableReason ?? "consent"} onGranted={() => refetch()} />
      </div>,
    );
  }

  if (!data || !data.insights.length) {
    return splitScreen(
      <AiInsightsMobileEmpty locale={locale} startDate={startDate} endDate={endDate} />,
      <div className="mx-auto max-w-6xl space-y-8">
        <AiInsightsMasthead
          badgeLabel={badgeLabelBase}
          description={t("noInsights")}
          stats={null}
          insightStyleToggle={styleToggle}
        />
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
          <AiInsightsMasthead
            badgeLabel={badgeLabelBase}
            description={t("yourInsights")}
            stats={
              <AiInsightsMetricStrip
                insightCount={data.insights.length}
                insightStyle={insightStyle}
                cached={data.cached}
                rateLimitRemaining={data.rateLimit?.remaining}
              />
            }
            insightStyleToggle={styleToggle}
          />

          <section className="w-full min-w-0" aria-labelledby="ai-insights-spotlight-title">
            <p className={DASHBOARD_SECTION_EYEBROW}>{t("spotlightHint")}</p>
            <h2 id="ai-insights-spotlight-title" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
              {t("spotlightTitle")}
            </h2>
            <div className="mt-8">
              {data.moments && data.moments.length > 0
                ? data.moments.map((moment) => (
                    <InsightMomentRow
                      key={moment.id}
                      moment={moment}
                      href={withFilters(moment.href)}
                      onOpenArtist={handleOpenArtist}
                    />
                  ))
                : data.insights.map((insight, index) => (
                    <InsightBulletRow key={index} index={index + 1} text={insight} />
                  ))}
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
      <AiInsightsMasthead
        badgeLabel={t("loadingShort")}
        description={t("loadingShort")}
        stats={<AiInsightsMetricStrip loading />}
        insightStyleToggle={
          <div className="flex w-full max-w-md flex-col gap-2">
            <div className="h-3 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="h-11 w-full max-w-xs animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
          </div>
        }
      />
      <InsightListSkeleton />
    </div>,
  );
}

/**
 * AI Insights page - One-shot insight generator from aggregated analytics.
 * Displays 3-5 concise, data-grounded bullet points on the Crystal canvas.
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
