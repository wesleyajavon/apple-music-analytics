"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ReplayRankingGrid,
  ReplayRankingSection,
  ReplayRankingSkeleton,
  type ReplayRankingItem,
} from "@/lib/components/replay-ranking-grid";
import type { GenreChartRow } from "@/lib/components/genres-ranking-list";

export const GENRES_SPOTLIGHT_LIMIT = 10;

export function toGenreReplayItems(
  genres: GenreChartRow[],
  locale: string,
  listensLabel: string,
  ariaOpen?: (name: string) => string
): ReplayRankingItem[] {
  return genres.map((genre) => ({
    id: genre.name,
    title: genre.name,
    subtitle: `${genre.percentage.toFixed(1)}%`,
    metric: `${genre.count.toLocaleString(locale)} ${listensLabel}`,
    media: { kind: "fill" as const, seed: genre.name },
    ariaLabel: ariaOpen?.(genre.name),
  }));
}

export function GenresSpotlight({
  titleId,
  genres,
  isLoading,
  locale,
  onSelectGenre,
}: {
  titleId: string;
  genres: GenreChartRow[];
  isLoading: boolean;
  locale: string;
  onSelectGenre?: (genre: GenreChartRow) => void;
}) {
  const t = useTranslations("genres");
  const tOverview = useTranslations("overview");
  const tm = useTranslations("genres.mobile");
  const visible = useMemo(
    () => genres.slice(0, GENRES_SPOTLIGHT_LIMIT),
    [genres]
  );
  const items = useMemo(
    () =>
      toGenreReplayItems(
        visible,
        locale,
        t("listens"),
        onSelectGenre ? (name) => tm("sheetOpenAria", { name }) : undefined
      ),
    [locale, onSelectGenre, t, tm, visible]
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
      eyebrow={t("sections.spotlight.eyebrow")}
      title={t("sections.spotlight.title")}
      description={t("sections.spotlight.description")}
    >
      {isLoading ? (
        <ReplayRankingSkeleton />
      ) : (
        <ReplayRankingGrid
          items={items}
          maxItems={GENRES_SPOTLIGHT_LIMIT}
          onSelect={
            onSelectGenre
              ? (item, index) => {
                  const genre = visible[index];
                  if (!genre || genre.name !== item.id) return;
                  onSelectGenre(genre);
                }
              : undefined
          }
          {...pager}
        />
      )}
    </ReplayRankingSection>
  );
}
