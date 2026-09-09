"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardSectionPanel } from "@/lib/components/dashboard-section-switcher";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";
import { TracksCanvasSection, TracksMasthead, TracksMetricStrip } from "@/lib/components/tracks-chrome";
import {
  TracksLeaderboardChart,
  TracksLeaderboardChartSkeleton,
  type TracksBarPoint,
} from "@/lib/components/tracks-leaderboard-chart";
import { TracksSectionSwitcher } from "@/lib/components/tracks-section-switcher";
import { TracksSpotlight } from "@/lib/components/tracks-spotlight";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
} from "@/lib/components/dashboard-ui";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { TrackOverviewDto, TrackStatsDto } from "@/lib/dto/track";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { formatListeningTime } from "@/lib/utils/overview-page";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import type { TracksLocalView } from "@/lib/utils/tracks-section";
import { useWaitingForImportDemoHref } from "@/lib/components/waiting-for-import-demo";

const MOBILE_CANVAS = "space-y-8 pb-8 lg:hidden";

function formatShare(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(share);
}

function formatListenDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function TracksMobileSkeleton() {
  const locale = useLocale();
  return (
    <div className={MOBILE_CANVAS} aria-busy="true">
      <TracksMasthead compact />
      <TracksMetricStrip locale={locale} loading />
      <ReplayRankingSkeleton />
    </div>
  );
}

export function TracksMobileEmpty() {
  const t = useTranslations("tracks.mobile");
  const demoHref = useWaitingForImportDemoHref("/dashboard/tracks");

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={t("emptyTitle")} description={t("emptyLead")}>
        <div className="mt-6 flex flex-col gap-3">
          <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={`${DASHBOARD_BTN_OUTLINE} w-full`}>
            {t("emptyCta")}
          </Link>
          <Link href={demoHref} className={`${DASHBOARD_BTN_GHOST} w-full`}>
            {t("emptyDemoCta")}
          </Link>
        </div>
      </OverviewHeroFrame>
    </div>
  );
}

export function TracksMobileError({
  error,
  onRetry,
}: {
  locale?: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("tracks");
  const tm = useTranslations("tracks.mobile");
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_CANVAS}>
      <TracksMasthead compact />
      <OverviewHeroFrame compact title={t("title")} description={tm("errorLead")}>
        {isQuota ? (
          <div className="mt-4">
            <GroqQuotaNotice error={error} />
          </div>
        ) : (
          <button type="button" onClick={onRetry} className={`${DASHBOARD_BTN_OUTLINE} mt-4 w-full`}>
            {tCommon("retry")}
          </button>
        )}
      </OverviewHeroFrame>
    </div>
  );
}

export function TrackDetailSheet({
  track,
  totalListens,
  locale,
  open,
  onClose,
}: {
  track: TrackStatsDto | null;
  totalListens: number;
  locale: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("tracks");
  const tm = useTranslations("tracks.mobile");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const share = track && totalListens > 0 ? track.listenCount / totalListens : 0;
  const playTime = formatListeningTime(track?.totalPlayTime ?? 0, tm("unavailable"));

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      insetAboveBottomNav
    >
      {track ? (
        <div className="px-4 pb-2 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight text-foreground">
                {track.trackTitle}
              </h2>
              <p className="mt-1 truncate text-sm text-muted">{track.artistName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tm("sheetCloseAria")}
            >
              {tCommon("close")}
            </button>
          </div>
          <dl className="space-y-3">
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-glass-hairline">
              <dt className="text-sm text-muted">{t("listens")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {track.listenCount.toLocaleString(locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-glass-hairline">
              <dt className="text-sm text-muted">{tm("shareSignal")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {formatShare(share, locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-glass-hairline">
              <dt className="text-sm text-muted">{tm("detailGenre")}</dt>
              <dd className="max-w-[60%] truncate text-sm font-semibold text-foreground">
                {track.genre ?? tm("unavailable")}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-glass-hairline">
              <dt className="text-sm text-muted">{tm("detailFirst")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {formatListenDate(track.firstListenDate, locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-glass-hairline">
              <dt className="text-sm text-muted">{tm("detailLast")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {formatListenDate(track.lastListenDate, locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3">
              <dt className="text-sm text-muted">{tm("detailPlayTime")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">{playTime}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </MobileBottomSheet>
  );
}

export function TracksMobileExperience({
  overview,
  topTracks,
  isTopLoading,
  onOpenArtistInsights,
  locale,
  activeView,
  onViewChange,
  barChartData,
  rankingList,
}: {
  overview: TrackOverviewDto | undefined;
  topTracks: TrackStatsDto[];
  isTopLoading: boolean;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  locale: string;
  activeView: TracksLocalView;
  onViewChange: (view: TracksLocalView) => void;
  barChartData: TracksBarPoint[];
  rankingList: ReactNode;
}) {
  const t = useTranslations("tracks");

  if (isTopLoading) return <TracksMobileSkeleton />;

  return (
    <div className={MOBILE_CANVAS}>
      <TracksMasthead compact />
      {overview ? (
        <TracksMetricStrip overview={overview} locale={locale} />
      ) : (
        <TracksMetricStrip locale={locale} loading />
      )}

      <TracksSectionSwitcher
        idPrefix="tracks-mobile"
        activeSection={activeView}
        onLocalViewChange={onViewChange}
      />

      <DashboardSectionPanel idPrefix="tracks-mobile" view="spotlight" activeView={activeView}>
        <TracksSpotlight
          titleId="tracks-mobile-spotlight-title"
          tracks={topTracks}
          isLoading={isTopLoading}
          locale={locale}
          onOpenArtistInsights={onOpenArtistInsights}
        />
      </DashboardSectionPanel>

      <DashboardSectionPanel idPrefix="tracks-mobile" view="leaderboard" activeView={activeView}>
        <TracksCanvasSection
          titleId="tracks-mobile-leaderboard-title"
          eyebrow={t("sections.chart.eyebrow")}
          title={t("sections.chart.title")}
          description={t("sections.chart.description")}
        >
          {isTopLoading ? (
            <TracksLeaderboardChartSkeleton />
          ) : (
            <TracksLeaderboardChart data={barChartData} locale={locale} />
          )}
        </TracksCanvasSection>
      </DashboardSectionPanel>

      <DashboardSectionPanel idPrefix="tracks-mobile" view="ranking" activeView={activeView}>
        <TracksCanvasSection
          titleId="tracks-mobile-ranking-title"
          eyebrow={t("sections.table.eyebrow")}
          title={t("sections.table.title")}
          description={t("sections.table.description")}
        >
          {rankingList}
        </TracksCanvasSection>
      </DashboardSectionPanel>
    </div>
  );
}
