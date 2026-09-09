"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ReplayRankingGrid,
  ReplayRankingSection,
  ReplayRankingSkeleton,
  type ReplayRankingItem,
} from "@/lib/components/replay-ranking-grid";
import type { ArtistStatsDto } from "@/lib/dto/artist";

export const ARTISTS_SPOTLIGHT_LIMIT = 20;

export function toArtistReplayItems(
  artists: ArtistStatsDto[],
  locale: string,
  listensLabel: string,
  ariaOpen: (name: string) => string
): ReplayRankingItem[] {
  return artists.map((artist) => ({
    id: artist.artistId,
    title: artist.artistName,
    metric: `${artist.listenCount.toLocaleString(locale)} ${listensLabel}`,
    media: {
      kind: "artist" as const,
      artistId: artist.artistId,
      artistName: artist.artistName,
      imageUrl: artist.imageUrl,
    },
    ariaLabel: ariaOpen(artist.artistName),
  }));
}

export function ArtistsSpotlight({
  titleId,
  artists,
  isLoading,
  locale,
  onOpenArtistInsights,
}: {
  titleId: string;
  artists: ArtistStatsDto[];
  isLoading: boolean;
  locale: string;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("artists");
  const tOverview = useTranslations("overview");
  const visible = useMemo(
    () => artists.slice(0, ARTISTS_SPOTLIGHT_LIMIT),
    [artists]
  );
  const items = useMemo(
    () =>
      toArtistReplayItems(
        visible,
        locale,
        t("listensCount"),
        (name) => t("artistInsightsAriaOpen", { name })
      ),
    [locale, t, visible]
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
            const artist = visible[index];
            if (!artist || artist.artistId !== item.id) return;
            onOpenArtistInsights(artist, index);
          }}
          {...pager}
        />
      )}
    </ReplayRankingSection>
  );
}
