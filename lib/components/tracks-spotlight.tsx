"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ARTISTS_SPOTLIGHT_LIMIT } from "@/lib/components/artists-spotlight";
import {
  ReplayRankingGrid,
  ReplayRankingSection,
  ReplayRankingSkeleton,
  type ReplayRankingItem,
} from "@/lib/components/replay-ranking-grid";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { TrackStatsDto } from "@/lib/dto/track";
import { overviewArtistLeaderToPreview } from "@/lib/utils/overview-page";

export function toTrackReplayItems(
  tracks: TrackStatsDto[],
  locale: string,
  listensLabel: string,
  ariaOpen: (name: string) => string
): ReplayRankingItem[] {
  return tracks.map((track) => ({
    id: track.trackId,
    title: track.trackTitle,
    subtitle: track.artistName,
    metric: `${track.listenCount.toLocaleString(locale)} ${listensLabel}`,
    media: {
      kind: "artist" as const,
      artistId: track.artistId,
      artistName: track.artistName,
    },
    ariaLabel: ariaOpen(track.artistName),
  }));
}

export function TracksSpotlight({
  titleId,
  tracks,
  isLoading,
  locale,
  onOpenArtistInsights,
}: {
  titleId: string;
  tracks: TrackStatsDto[];
  isLoading: boolean;
  locale: string;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("tracks");
  const tArtists = useTranslations("artists");
  const tOverview = useTranslations("overview");
  const visible = useMemo(
    () => tracks.slice(0, ARTISTS_SPOTLIGHT_LIMIT),
    [tracks]
  );
  const items = useMemo(
    () =>
      toTrackReplayItems(
        visible,
        locale,
        t("listensCount"),
        (name) => tArtists("artistInsightsAriaOpen", { name })
      ),
    [locale, t, tArtists, visible]
  );

  const pager = {
    pageRangeLabel: (start: number, end: number) => tOverview("replayPager.pageRange", { start, end }),
    pagesNavLabel: tOverview("replayPager.pagesNav"),
    previousPageLabel: tOverview("replayPager.previousPage"),
    nextPageLabel: tOverview("replayPager.nextPage"),
  };

  return (
    <ReplayRankingSection
      titleId={titleId}
      eyebrow={t("sections.roster.eyebrow")}
      title={t("sections.roster.title")}
      description={t("sections.roster.description")}
    >
      {isLoading ? (
        <ReplayRankingSkeleton />
      ) : (
        <ReplayRankingGrid
          items={items}
          maxItems={ARTISTS_SPOTLIGHT_LIMIT}
          onSelect={(item, index) => {
            const track = visible[index];
            if (!track || track.trackId !== item.id) return;
            onOpenArtistInsights(
              overviewArtistLeaderToPreview(
                {
                  artistId: track.artistId,
                  name: track.artistName,
                  count: track.listenCount,
                  percentage: 0,
                },
                index + 1
              ),
              index
            );
          }}
          {...pager}
        />
      )}
    </ReplayRankingSection>
  );
}
