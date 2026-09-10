"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ReplayRankingGrid,
  ReplayRankingSection,
  REPLAY_TOPS_LIMIT,
  type ReplayRankingItem,
} from "@/lib/components/replay-ranking-grid";
import type { FriendMusicLeaderItem } from "@/lib/components/duet/duet-friend-music-mobile";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { overviewArtistLeaderToPreview } from "@/lib/utils/overview-page";

export function FriendMusicReplayTopsSections({
  locale,
  subjectName,
  topArtists,
  topGenres,
  topTracks,
  emptyTracksMessage,
  onOpenArtistInsights,
  className = "space-y-12",
}: {
  locale: string;
  subjectName: string;
  topArtists: FriendMusicLeaderItem[];
  topGenres: FriendMusicLeaderItem[];
  topTracks: FriendMusicLeaderItem[];
  emptyTracksMessage: string;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  className?: string;
}) {
  const t = useTranslations("duet.friendMusic");
  const tOverview = useTranslations("overview");
  const tArtists = useTranslations("artists");

  const pager = {
    pageRangeLabel: (start: number, end: number) =>
      tOverview("replayPager.pageRange", { start, end }),
    pagesNavLabel: tOverview("replayPager.pagesNav"),
    previousPageLabel: tOverview("replayPager.previousPage"),
    nextPageLabel: tOverview("replayPager.nextPage"),
  };

  const artistItems = useMemo(
    (): ReplayRankingItem[] =>
      topArtists.slice(0, REPLAY_TOPS_LIMIT).map((artist) => ({
        id: artist.id,
        title: artist.title,
        metric: `${artist.count.toLocaleString(locale)} ${t("listens")}`,
        media: {
          kind: "artist" as const,
          artistId: artist.id,
          artistName: artist.title,
          imageUrl: artist.imageUrl,
        },
        ariaLabel: tArtists("artistInsightsAriaOpen", { name: artist.title }),
      })),
    [locale, t, tArtists, topArtists]
  );

  const visibleTracks = topTracks.slice(0, REPLAY_TOPS_LIMIT);

  const trackItems = useMemo(
    (): ReplayRankingItem[] =>
      visibleTracks.map((track) => {
        const artistId = track.artistId ?? track.id;
        const artistName = track.subtitle ?? track.title;
        return {
          id: track.id,
          title: track.title,
          metric: `${track.count.toLocaleString(locale)} ${t("listens")}`,
          subtitle: track.subtitle,
          ariaLabel: tArtists("artistInsightsAriaOpen", { name: artistName }),
          media: {
            kind: "artist" as const,
            artistId,
            artistName,
          },
        };
      }),
    [locale, t, tArtists, visibleTracks]
  );

  const genreItems = useMemo(
    (): ReplayRankingItem[] =>
      topGenres.slice(0, REPLAY_TOPS_LIMIT).map((genre) => ({
        id: genre.id,
        title: genre.title,
        metric: `${genre.count.toLocaleString(locale)} ${t("listens")}`,
        subtitle:
          genre.percentage != null ? `${genre.percentage.toFixed(1)}%` : undefined,
        media: { kind: "fill" as const, seed: genre.title },
      })),
    [locale, t, topGenres]
  );

  return (
    <div className={className}>
      {artistItems.length > 0 ? (
        <ReplayRankingSection
          titleId="friend-music-tops-artists-title"
          eyebrow={t("sections.tops.eyebrow")}
          title={t("topArtistsTitle")}
          description={t("topArtistsDescription", { name: subjectName })}
        >
          <ReplayRankingGrid
            items={artistItems}
            maxItems={REPLAY_TOPS_LIMIT}
            onSelect={
              onOpenArtistInsights
                ? (item, index) => {
                    const artist = topArtists[index];
                    if (!artist || artist.id !== item.id) return;
                    onOpenArtistInsights(
                      overviewArtistLeaderToPreview(
                        {
                          artistId: artist.id,
                          name: artist.title,
                          count: artist.count,
                          percentage: artist.percentage ?? 0,
                          imageUrl: artist.imageUrl,
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

      <div data-testid="duet-friend-music-top-tracks">
        {trackItems.length > 0 ? (
          <ReplayRankingSection
            titleId="friend-music-tops-tracks-title"
            eyebrow={t("sections.tops.eyebrow")}
            title={t("topTracksTitle")}
            description={t("topTracksDescription", { name: subjectName })}
          >
            <ReplayRankingGrid
              items={trackItems}
              maxItems={REPLAY_TOPS_LIMIT}
              onSelect={
                onOpenArtistInsights
                  ? (item, index) => {
                      const track = visibleTracks[index];
                      if (!track || track.id !== item.id) return;
                      const artistId = track.artistId;
                      if (!artistId) return;
                      const known = topArtists.find((artist) => artist.id === artistId);
                      onOpenArtistInsights(
                        known
                          ? overviewArtistLeaderToPreview(
                              {
                                artistId: known.id,
                                name: known.title,
                                count: known.count,
                                percentage: known.percentage ?? 0,
                                imageUrl: known.imageUrl,
                              },
                              index + 1
                            )
                          : overviewArtistLeaderToPreview(
                              {
                                artistId,
                                name: track.subtitle ?? track.title,
                                count: track.count,
                                percentage: track.percentage ?? 0,
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
        ) : (
          <p className="text-[13px] leading-6 text-muted">{emptyTracksMessage}</p>
        )}
      </div>

      {genreItems.length > 0 ? (
        <ReplayRankingSection
          titleId="friend-music-tops-genres-title"
          eyebrow={t("sections.tops.eyebrow")}
          title={t("topGenresTitle")}
          description={t("topGenresDescription", { name: subjectName })}
        >
          <ReplayRankingGrid items={genreItems} maxItems={REPLAY_TOPS_LIMIT} {...pager} />
        </ReplayRankingSection>
      ) : null}
    </div>
  );
}
