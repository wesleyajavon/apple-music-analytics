"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState } from "@/lib/components/error-state";
import { SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT } from "@/lib/components/spotlight-artists-featured-list";
import {
  ReplayRankingGrid,
  ReplayRankingSection,
  ReplayRankingSkeleton,
  REPLAY_TOPS_LIMIT,
  type ReplayRankingItem,
} from "@/lib/components/replay-ranking-grid";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import {
  overviewArtistLeaderToPreview,
  type OverviewGenreLeader,
  type OverviewTrackLeader,
} from "@/lib/utils/overview-page";

export function OverviewLibraryReplaySections({
  topTracks,
  topGenres,
  tracksHref,
  artistsHref,
  genresHref,
  startDate,
  endDate,
  onOpenArtistInsights,
}: {
  topTracks: OverviewTrackLeader[];
  topGenres: OverviewGenreLeader[];
  tracksHref: string;
  artistsHref: string;
  genresHref: string;
  startDate?: string;
  endDate?: string;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("overview");
  const tArtists = useTranslations("artists");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();

  const pager = {
    pageRangeLabel: (start: number, end: number) => t("replayPager.pageRange", { start, end }),
    pagesNavLabel: t("replayPager.pagesNav"),
    previousPageLabel: t("replayPager.previousPage"),
    nextPageLabel: t("replayPager.nextPage"),
  };

  const { data, isLoading, error, refetch } = useArtistStats(
    startDate,
    endDate,
    viewerUserId,
    SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT
  );

  const topArtists = (data?.topArtists ?? []).slice(0, REPLAY_TOPS_LIMIT);

  const visibleTracks = topTracks.slice(0, REPLAY_TOPS_LIMIT);

  const artistImageById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const artist of topArtists) {
      map.set(artist.artistId, artist.imageUrl ?? null);
    }
    return map;
  }, [topArtists]);

  const trackItems = useMemo(
    (): ReplayRankingItem[] =>
      visibleTracks.map((track) => ({
        id: track.trackId,
        title: track.name,
        metric: `${track.count.toLocaleString(locale)} ${t("listens")}`,
        subtitle: track.artistName,
        ariaLabel: tArtists("artistInsightsAriaOpen", { name: track.artistName }),
        media: {
          kind: "artist",
          artistId: track.artistId,
          artistName: track.artistName,
          imageUrl: artistImageById.get(track.artistId) ?? null,
        },
      })),
    [artistImageById, locale, t, tArtists, visibleTracks]
  );

  const artistItems = useMemo(
    (): ReplayRankingItem[] =>
      topArtists.map((artist) => ({
        id: artist.artistId,
        title: artist.artistName,
        metric: `${artist.listenCount.toLocaleString(locale)} ${t("listens")}`,
        media: {
          kind: "artist",
          artistId: artist.artistId,
          artistName: artist.artistName,
          imageUrl: artist.imageUrl,
        },
        ariaLabel: tArtists("artistInsightsAriaOpen", { name: artist.artistName }),
      })),
    [locale, t, tArtists, topArtists]
  );

  const genreItems = useMemo(
    (): ReplayRankingItem[] =>
      topGenres.slice(0, REPLAY_TOPS_LIMIT).map((genre) => ({
        id: genre.genre,
        title: genre.genre,
        metric: `${genre.count.toLocaleString(locale)} ${t("listens")}`,
        subtitle: `${genre.percentage.toFixed(1)}%`,
        href: genresHref,
        media: { kind: "fill", seed: genre.genre },
      })),
    [genresHref, locale, t, topGenres]
  );

  return (
    <div className="space-y-12">
      {trackItems.length > 0 ? (
        <ReplayRankingSection
          titleId="overview-tops-tracks-title"
          eyebrow={t("sections.library.eyebrow")}
          title={t("topTracks")}
          description={t("yourTopTracks")}
          seeAllHref={tracksHref}
          seeAllLabel={t("seeAll")}
        >
          <ReplayRankingGrid
            items={trackItems}
            maxItems={REPLAY_TOPS_LIMIT}
            onSelect={
              onOpenArtistInsights
                ? (item, index) => {
                    const track = visibleTracks[index];
                    if (!track || track.trackId !== item.id) return;
                    const known = topArtists.find((artist) => artist.artistId === track.artistId);
                    onOpenArtistInsights(
                      known ??
                        overviewArtistLeaderToPreview(
                          {
                            artistId: track.artistId,
                            name: track.artistName,
                            count: track.count,
                            percentage: track.percentage,
                          },
                          index + 1
                        ),
                      index
                    );
                  }
                : undefined
            }
            {...pager}
          />
        </ReplayRankingSection>
      ) : null}

        <ReplayRankingSection
          titleId="overview-tops-artists-title"
          eyebrow={t("sections.library.eyebrow")}
          title={t("topArtists")}
          description={t("yourTopArtists")}
          seeAllHref={artistsHref}
          seeAllLabel={t("seeAll")}
        >
        {isLoading ? (
          <ReplayRankingSkeleton />
        ) : error ? (
          <ErrorState error={error} message={tArtists("errorLoading")} onRetry={() => refetch()} />
        ) : artistItems.length === 0 ? (
          <p className="text-[13px] text-muted">{tArtists("mobile.emptyTitle")}</p>
        ) : (
          <ReplayRankingGrid
            items={artistItems}
            maxItems={REPLAY_TOPS_LIMIT}
            onSelect={
              onOpenArtistInsights
                ? (item, index) => {
                    const artist = topArtists[index];
                    if (!artist || artist.artistId !== item.id) return;
                    onOpenArtistInsights(artist, index);
                  }
                : undefined
            }
            {...pager}
          />
        )}
      </ReplayRankingSection>

      {genreItems.length > 0 ? (
        <ReplayRankingSection
          titleId="overview-tops-genres-title"
          eyebrow={t("sections.library.eyebrow")}
          title={t("topGenres")}
          description={t("yourTopGenres")}
          seeAllHref={genresHref}
          seeAllLabel={t("seeAll")}
        >
          <ReplayRankingGrid items={genreItems} maxItems={REPLAY_TOPS_LIMIT} {...pager} />
        </ReplayRankingSection>
      ) : null}
    </div>
  );
}