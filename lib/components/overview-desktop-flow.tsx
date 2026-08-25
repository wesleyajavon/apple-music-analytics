"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { HeatmapCalendarOverviewWidget } from "@/lib/components/heatmap-calendar-overview-widget";
import { AiInsightsSummaryWidget } from "@/lib/components/ai-insights-summary-widget";
import { OverviewMomentumTabs, type OverviewMomentumSlide } from "@/lib/components/overview-momentum-tabs";
import { OverviewGoFurtherSection } from "@/lib/components/overview-go-further";
import { OverviewFriendsSection } from "@/lib/components/overview-friends-section";
import { OverviewTasteTeaser } from "@/lib/components/overview-taste-teaser";
import { OverviewSectionHeader } from "@/lib/components/overview-section";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { OverviewStatsSection, type OverviewStatsChanges } from "@/lib/components/overview-stats-section";
import { OverviewStatsSectionSkeleton } from "@/lib/components/skeleton-loaders";
import {
  TopLibraryCard,
  LIBRARY_LEADER_ACCENTS,
} from "@/lib/components/overview-library-rankings";
import { TopThreeArtistsOverviewWidget } from "@/lib/components/top-three-artists-overview-widget";
import {
  OverviewSectionSwitcher,
  OverviewViewPanel,
  useOverviewView,
  type OverviewView,
} from "@/lib/components/overview-section-switcher";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";
import {
  buildOverviewPrimaryInsight,
  overviewArtistLeaderToPreview,
  type OverviewArtistLeader,
  type OverviewGenreLeader,
  type OverviewTrackLeader,
} from "@/lib/utils/overview-page";
import { usePublicDemoViewer, useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";

export function OverviewDesktopFlow({
  title,
  badgeLabel,
  showPeriodHint = false,
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
  badgeLabel: string;
  showPeriodHint?: boolean;
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
  const tArtists = useTranslations("artists");
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
          topTrackBody: t("mobile.primaryInsight.topTrackBody", {
            artist: topTrack?.artistName ?? "",
          }),
          topArtistEyebrow: t("mobile.primaryInsight.topArtistEyebrow"),
          topArtistBody: t("mobile.primaryInsight.topArtistBody"),
          libraryEyebrow: t("mobile.primaryInsight.libraryEyebrow"),
          libraryBody: t("mobile.primaryInsight.libraryBody"),
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
    <div className="hidden space-y-8 lg:block">
      <OverviewHeroFrame
        title={title}
        description={t("subtitle")}
        badgeLabel={badgeLabel}
        showPeriodHint={showPeriodHint}
        avatarUrl={avatarUrl}
        insight={primaryInsight}
        genreName={topGenre?.genre}
      />

      <OverviewSectionSwitcher
        idPrefix="overview-desktop"
        available={availableViews}
        activeView={activeView}
        onChange={setView}
      />

      <OverviewViewPanel idPrefix="overview-desktop" view="summary" activeView={activeView}>
        <section className="relative">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {data ? (
              <OverviewStatsSection
                totalListens={data.totalListens}
                uniqueArtists={data.uniqueArtists}
                uniqueTracks={data.uniqueTracks}
                totalPlayTime={data.totalPlayTime}
                changes={changes}
                showComparison={showComparison}
              />
            ) : (
              <OverviewStatsSectionSkeleton />
            )}
          </div>
        </section>
      </OverviewViewPanel>

      <OverviewViewPanel idPrefix="overview-desktop" view="spotlight" activeView={activeView}>
        <TopThreeArtistsOverviewWidget
          startDate={startDate}
          endDate={endDate}
          onOpenArtistInsights={onOpenArtistInsights}
        />
      </OverviewViewPanel>

      {hasLeaders ? (
        <OverviewViewPanel idPrefix="overview-desktop" view="tops" activeView={activeView}>
          <section className="relative">
            <OverviewSectionHeader
              eyebrow={t("sections.library.eyebrow")}
              title={t("sections.library.title")}
              description={t("sections.library.description")}
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {topTracks.length > 0 ? (
                <TopLibraryCard
                  title={t("topTracks")}
                  description={t("yourTopTracks")}
                  href={tracksHref}
                  accent={LIBRARY_LEADER_ACCENTS.tracks}
                  items={topTracks.map((track) => ({
                    id: track.trackId,
                    title: track.name,
                    subtitle: track.artistName,
                    count: track.count,
                    percentage: track.percentage,
                  }))}
                  locale={locale}
                  listensLabel={t("listens")}
                  ctaLabel={t("seeAll")}
                />
              ) : null}

              {topArtists.length > 0 ? (
                <TopLibraryCard
                  title={t("topArtists")}
                  description={t("yourTopArtists")}
                  href={artistsHref}
                  accent={LIBRARY_LEADER_ACCENTS.artists}
                  items={topArtists.map((artist) => ({
                    id: artist.artistId,
                    title: artist.name,
                    count: artist.count,
                    percentage: artist.percentage,
                    imageUrl: artist.imageUrl,
                  }))}
                  locale={locale}
                  listensLabel={t("listens")}
                  ctaLabel={t("seeAll")}
                  showArtistAvatars
                  onItemSelect={
                    onOpenArtistInsights
                      ? (item, index) => {
                          const artist = topArtists[index];
                          if (!artist || artist.artistId !== item.id) return;
                          onOpenArtistInsights(
                            overviewArtistLeaderToPreview(artist, index + 1),
                            index
                          );
                        }
                      : undefined
                  }
                  itemAriaLabel={(item) =>
                    tArtists("artistInsightsAriaOpen", { name: item.title })
                  }
                />
              ) : null}

              {topGenres.length > 0 ? (
                <TopLibraryCard
                  title={t("topGenres")}
                  description={t("yourTopGenres")}
                  href={genresHref}
                  accent={LIBRARY_LEADER_ACCENTS.genres}
                  items={topGenres.map((genre) => ({
                    id: genre.genre,
                    title: genre.genre,
                    count: genre.count,
                    percentage: genre.percentage,
                  }))}
                  locale={locale}
                  listensLabel={t("listens")}
                  ctaLabel={t("seeAll")}
                  showPercentage
                />
              ) : null}
            </div>
          </section>
        </OverviewViewPanel>
      ) : null}

      {momentumSlides.length > 0 ? (
        <OverviewViewPanel idPrefix="overview-desktop" view="trends" activeView={activeView}>
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

      <OverviewViewPanel idPrefix="overview-desktop" view="context" activeView={activeView}>
        <section className="relative">
          <OverviewSectionHeader
            eyebrow={t("sections.intelligence.eyebrow")}
            title={t("sections.intelligence.title")}
            description={t("sections.intelligence.description")}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="flex min-h-[280px] w-full min-w-0">
              <AiInsightsSummaryWidget />
            </div>
            <div className="min-w-0">
              <HeatmapCalendarOverviewWidget startDate={startDate} endDate={endDate} />
            </div>
          </div>
          <div className="mt-5">
            <OverviewTasteTeaser href={musicalProfileHref} />
          </div>
        </section>
      </OverviewViewPanel>

      {showFriendsTab ? (
        <OverviewViewPanel idPrefix="overview-desktop" view="friends" activeView={activeView}>
          <OverviewFriendsSection />
        </OverviewViewPanel>
      ) : null}

      <OverviewViewPanel idPrefix="overview-desktop" view="further" activeView={activeView}>
        <OverviewGoFurtherSection
          soundprintChatHref={musicAgentHref}
          duetHref={duetHref}
        />
      </OverviewViewPanel>
    </div>
  );
}
