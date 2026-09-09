"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { OverviewMobileHero } from "@/lib/components/overview-hero";
import { HeatmapCalendarOverviewWidget } from "@/lib/components/heatmap-calendar-overview-widget";
import { AiInsightsSummaryWidget } from "@/lib/components/ai-insights-summary-widget";
import { OverviewMomentumTabs, type OverviewMomentumSlide } from "@/lib/components/overview-momentum-tabs";
import { OverviewGoFurtherSection } from "@/lib/components/overview-go-further";
import { OverviewFriendsSection } from "@/lib/components/overview-friends-section";
import { OverviewSectionHeader } from "@/lib/components/overview-section";
import { OverviewStatsSection, type OverviewStatsChanges } from "@/lib/components/overview-stats-section";
import { OverviewStatsSectionSkeleton } from "@/lib/components/skeleton-loaders";
import { OverviewLibraryReplaySections } from "@/lib/components/overview-library-replay";
import { TopThreeArtistsOverviewWidget } from "@/lib/components/top-three-artists-overview-widget";
import {
  OverviewSectionSwitcher,
  OverviewViewPanel,
  useOverviewView,
  type OverviewView,
} from "@/lib/components/overview-section-switcher";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
} from "@/lib/components/dashboard-ui";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";
import {
  buildOverviewPrimaryInsight,
  type OverviewArtistLeader,
  type OverviewGenreLeader,
  type OverviewTrackLeader,
} from "@/lib/utils/overview-page";
import { usePublicDemoViewer, useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";

export function MobileOverviewFlow({
  title,
  data,
  changes,
  showComparison,
  momentumSlides,
  topTracks,
  topArtists,
  topGenres,
  locale,
  tracksHref,
  artistsHref,
  genresHref,
  musicalProfileHref,
  musicAgentHref,
  duetHref,
  startDate,
  endDate,
  avatarUrl,
  onOpenArtistInsights,
}: {
  title: string;
  data?: OverviewStatsWithTopArtists;
  changes: OverviewStatsChanges;
  showComparison: boolean;
  momentumSlides: OverviewMomentumSlide[];
  topTracks: OverviewTrackLeader[];
  topArtists: OverviewArtistLeader[];
  topGenres: OverviewGenreLeader[];
  locale: string;
  tracksHref: string;
  artistsHref: string;
  genresHref: string;
  musicalProfileHref: string;
  musicAgentHref: string;
  duetHref: string;
  startDate?: string;
  endDate?: string;
  avatarUrl?: string | null;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("overview");
  const authUserId = useSupabaseAuthUserId();
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const showFriendsTab = Boolean(authUserId) && !isPublicDemoViewer;
  const topTrack = topTracks[0];
  const topArtist = topArtists[0];
  const topGenre = topGenres[0];
  const primaryInsight = data
    ? buildOverviewPrimaryInsight({
        pageTitle: title,
        locale,
        data,
        topTrack,
        topArtist,
        labels: {
          topTrackEyebrow: t("mobile.primaryInsight.topTrackEyebrow"),
          topTrackBody: topTrack?.artistName ?? "",
          topArtistEyebrow: t("mobile.primaryInsight.topArtistEyebrow"),
          topArtistBody: "",
          libraryEyebrow: t("mobile.primaryInsight.libraryEyebrow"),
          libraryBody: "",
          listens: t("listens"),
          totalListens: t("stats.totalListens"),
        },
      })
    : undefined;

  const hasLeaders = Boolean(topTrack || topArtist || topGenre);
  const availableViews = useMemo((): OverviewView[] => {
    const views: OverviewView[] = ["spotlight"];
    if (hasLeaders) views.push("tops");
    if (momentumSlides.length > 0) views.push("trends");
    views.push("context", "summary");
    if (showFriendsTab) views.push("friends");
    views.push("further");
    return views;
  }, [hasLeaders, momentumSlides.length, showFriendsTab]);
  const { activeView, setView } = useOverviewView(availableViews);

  return (
    <div className="space-y-8 pb-8 lg:hidden">
      <OverviewMobileHero title={title} avatarUrl={avatarUrl} insight={primaryInsight} />

      <OverviewSectionSwitcher
        idPrefix="overview-mobile"
        available={availableViews}
        activeView={activeView}
        onChange={setView}
      />

      <OverviewViewPanel idPrefix="overview-mobile" view="summary" activeView={activeView}>
        {data ? (
          <OverviewStatsSection
            totalListens={data.totalListens}
            uniqueArtists={data.uniqueArtists}
            uniqueTracks={data.uniqueTracks}
            totalPlayTime={data.totalPlayTime}
            changes={changes}
            showComparison={showComparison}
            headingId="overview-mobile-stats-heading"
          />
        ) : (
          <OverviewStatsSectionSkeleton />
        )}
      </OverviewViewPanel>

      <OverviewViewPanel idPrefix="overview-mobile" view="spotlight" activeView={activeView}>
        <TopThreeArtistsOverviewWidget
          startDate={startDate}
          endDate={endDate}
          onOpenArtistInsights={onOpenArtistInsights}
        />
      </OverviewViewPanel>

      {hasLeaders ? (
        <OverviewViewPanel idPrefix="overview-mobile" view="tops" activeView={activeView}>
          <OverviewLibraryReplaySections
            topTracks={topTracks}
            topGenres={topGenres}
            tracksHref={tracksHref}
            artistsHref={artistsHref}
            genresHref={genresHref}
            startDate={startDate}
            endDate={endDate}
            onOpenArtistInsights={onOpenArtistInsights}
          />
        </OverviewViewPanel>
      ) : null}

      {momentumSlides.length > 0 ? (
        <OverviewViewPanel idPrefix="overview-mobile" view="trends" activeView={activeView}>
          <section className="relative">
            <OverviewSectionHeader
              eyebrow={t("sections.momentum.eyebrow")}
              title={t("sections.momentum.title")}
              description={t("sections.momentum.description")}
            />
            <OverviewMomentumTabs slides={momentumSlides} />
          </section>
        </OverviewViewPanel>
      ) : null}

      <OverviewViewPanel idPrefix="overview-mobile" view="context" activeView={activeView}>
        <section className="relative">
          <OverviewSectionHeader
            eyebrow={t("sections.intelligence.eyebrow")}
            title={t("sections.intelligence.title")}
            description={t("sections.intelligence.description")}
          />
          <div className="grid grid-cols-1 gap-10">
            <div className="flex min-h-[280px] w-full min-w-0">
              <AiInsightsSummaryWidget />
            </div>
            <div className="min-w-0">
              <HeatmapCalendarOverviewWidget startDate={startDate} endDate={endDate} />
            </div>
          </div>
        </section>
      </OverviewViewPanel>

      {showFriendsTab ? (
        <OverviewViewPanel idPrefix="overview-mobile" view="friends" activeView={activeView}>
          <OverviewFriendsSection />
        </OverviewViewPanel>
      ) : null}

      <OverviewViewPanel idPrefix="overview-mobile" view="further" activeView={activeView}>
        <OverviewGoFurtherSection
          soundprintChatHref={musicAgentHref}
          duetHref={duetHref}
        />
        <Link
          href={musicalProfileHref}
          aria-label={t("mobile.profileTitle")}
          className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} no-underline text-foreground`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold tracking-tight">{t("mobile.profileTitle")}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-muted">{t("mobile.profileLead")}</p>
          </div>
          <span className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-medium text-muted">
            {t("seeAll")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </OverviewViewPanel>
    </div>
  );
}
