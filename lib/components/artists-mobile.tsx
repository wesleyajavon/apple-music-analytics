"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardSectionPanel } from "@/lib/components/dashboard-section-switcher";
import { ArtistsViewSwitcher, type ArtistsView } from "@/lib/components/artists-view-switcher";
import {
  ArtistsCanvasSection,
  ArtistsMasthead,
  ArtistsMetricStrip,
} from "@/lib/components/artists-chrome";
import { ArtistsSpotlight } from "@/lib/components/artists-spotlight";
import {
  ArtistsLeaderboardChart,
  ArtistsLeaderboardChartSkeleton,
  type ArtistsBarPoint,
} from "@/lib/components/artists-leaderboard-chart";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
} from "@/lib/components/dashboard-ui";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { useWaitingForImportDemoHref } from "@/lib/components/waiting-for-import-demo";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import type { ArtistOverviewDto, ArtistStatsDto } from "@/lib/dto/artist";

const MOBILE_CANVAS = "space-y-8 pb-8 lg:hidden";

export function ArtistsMobileSkeleton({ trendsHref }: { trendsHref: string }) {
  const locale = useLocale();
  return (
    <div className={MOBILE_CANVAS} aria-busy="true">
      <ArtistsMasthead trendsHref={trendsHref} compact />
      <ArtistsMetricStrip locale={locale} loading />
      <ReplayRankingSkeleton />
    </div>
  );
}

export function ArtistsMobileEmpty() {
  const t = useTranslations("artists.mobile");
  const demoHref = useWaitingForImportDemoHref("/dashboard/artists");

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

export function ArtistsMobileError({
  error,
  onRetry,
  trendsHref,
}: {
  locale?: string;
  error?: Error | null;
  onRetry: () => void;
  trendsHref: string;
}) {
  const t = useTranslations("artists");
  const tm = useTranslations("artists.mobile");
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_CANVAS}>
      <ArtistsMasthead trendsHref={trendsHref} compact />
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

export function ArtistsMobileExperience({
  trendsHref,
  overview,
  topArtists,
  isTopLoading,
  onOpenArtistInsights,
  locale,
  activeView,
  onViewChange,
  barChartData,
  rankingList,
}: {
  trendsHref: string;
  overview: ArtistOverviewDto | undefined;
  topArtists: ArtistStatsDto[];
  isTopLoading: boolean;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  locale: string;
  activeView: ArtistsView;
  onViewChange: (view: ArtistsView) => void;
  barChartData: ArtistsBarPoint[];
  rankingList: ReactNode;
}) {
  const t = useTranslations("artists");

  if (isTopLoading) return <ArtistsMobileSkeleton trendsHref={trendsHref} />;

  return (
    <div className={MOBILE_CANVAS}>
      <ArtistsMasthead trendsHref={trendsHref} compact />
      {overview ? (
        <ArtistsMetricStrip overview={overview} locale={locale} />
      ) : (
        <ArtistsMetricStrip locale={locale} loading />
      )}

      <ArtistsViewSwitcher
        idPrefix="artists-mobile"
        activeView={activeView}
        onChange={onViewChange}
      />

      <DashboardSectionPanel idPrefix="artists-mobile" view="spotlight" activeView={activeView}>
        <ArtistsSpotlight
          titleId="artists-mobile-spotlight-title"
          artists={topArtists}
          isLoading={isTopLoading}
          locale={locale}
          onOpenArtistInsights={onOpenArtistInsights}
        />
      </DashboardSectionPanel>

      <DashboardSectionPanel idPrefix="artists-mobile" view="leaderboard" activeView={activeView}>
        <ArtistsCanvasSection
          titleId="artists-mobile-leaderboard-title"
          eyebrow={t("sections.charts.eyebrow")}
          title={t("sections.charts.title")}
          description={t("sections.charts.description")}
        >
          {isTopLoading ? (
            <ArtistsLeaderboardChartSkeleton />
          ) : (
            <ArtistsLeaderboardChart data={barChartData} locale={locale} />
          )}
        </ArtistsCanvasSection>
      </DashboardSectionPanel>

      <DashboardSectionPanel idPrefix="artists-mobile" view="ranking" activeView={activeView}>
        <ArtistsCanvasSection
          titleId="artists-mobile-ranking-title"
          eyebrow={t("sections.table.eyebrow")}
          title={t("sections.table.title")}
          description={t("sections.table.description")}
        >
          {rankingList}
        </ArtistsCanvasSection>
      </DashboardSectionPanel>
    </div>
  );
}
