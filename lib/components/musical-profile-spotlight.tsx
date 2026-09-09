"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { toArtistReplayItems } from "@/lib/components/artists-spotlight";
import {
  ReplayRankingGrid,
  ReplayRankingSection,
  ReplayRankingSkeleton,
} from "@/lib/components/replay-ranking-grid";
import type { ArtistStatsDto } from "@/lib/dto/artist";

export const MUSICAL_PROFILE_SPOTLIGHT_LIMIT = 4;

export function MusicalProfileSpotlight({
  titleId,
  artists,
  isLoading,
  locale,
  seeAllHref,
  onOpenArtistInsights,
}: {
  titleId: string;
  artists: ArtistStatsDto[];
  isLoading: boolean;
  locale: string;
  seeAllHref: string;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("musical-profile");
  const tArtists = useTranslations("artists");
  const tOverview = useTranslations("overview");
  const visible = useMemo(
    () => artists.slice(0, MUSICAL_PROFILE_SPOTLIGHT_LIMIT),
    [artists]
  );
  const items = useMemo(
    () =>
      toArtistReplayItems(
        visible,
        locale,
        tArtists("listensCount"),
        (name) => tArtists("artistInsightsAriaOpen", { name })
      ),
    [locale, tArtists, visible]
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
      eyebrow={t("signature.eyebrow")}
      title={t("signature.title")}
      description={t("signature.description")}
      seeAllHref={seeAllHref}
      seeAllLabel={t("signature.seeAll")}
    >
      {isLoading ? (
        <ReplayRankingSkeleton count={MUSICAL_PROFILE_SPOTLIGHT_LIMIT} />
      ) : (
        <ReplayRankingGrid
          items={items}
          maxItems={MUSICAL_PROFILE_SPOTLIGHT_LIMIT}
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
