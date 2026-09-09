"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SEARCH_FIELD,
} from "@/lib/components/dashboard-ui";
import type { ArtistStatsDto } from "@/lib/dto/artist";

function ArtistsRankingSearchField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const t = useTranslations("artists");
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="sr-only">
        {t("rankingSearchAria")}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("rankingSearchPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          className={DASHBOARD_SEARCH_FIELD}
        />
      </div>
      <p className="text-[13px] leading-5 text-muted">{t("rankingClickHint")}</p>
    </div>
  );
}

export function ArtistsRankingList({
  artists,
  page,
  pageSize,
  totalPages,
  total,
  hasMore,
  offset,
  isFetching,
  onPageChange,
  onPageSizeChange,
  onOpenArtistInsights,
  locale,
  searchInput,
  onSearchInputChange,
  searchFieldId,
}: {
  artists: ArtistStatsDto[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  offset: number;
  isFetching: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  locale: string;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  searchFieldId: string;
}) {
  const t = useTranslations("artists");
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + artists.length, total);

  return (
    <div className="w-full min-w-0">
      <div className="max-w-sm">
        <ArtistsRankingSearchField
          id={searchFieldId}
          value={searchInput}
          onChange={onSearchInputChange}
        />
      </div>
      <div className="mt-4">
        {isFetching
          ? Array.from({ length: Math.min(pageSize, 10) }).map((_, index) => (
              <div
                key={`artist-rank-skeleton-${index}`}
                className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}
                aria-hidden
              >
                <div className="h-4 w-8 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
                <div className="h-4 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                <div className="ml-auto h-4 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              </div>
            ))
          : artists.length === 0
            ? (
                <p className="py-10 text-center text-[13px] text-muted">{t("rankingSearchEmpty")}</p>
              )
            : artists.map((artist, index) => {
                const displayRank = artist.rank ?? offset + index + 1;
                const avatarColorIndex = displayRank - 1;
                return (
                  <button
                    key={artist.artistId}
                    type="button"
                    className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                    aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
                    onClick={() => onOpenArtistInsights(artist, avatarColorIndex)}
                  >
                    <span className="w-8 shrink-0 text-[13px] font-semibold tabular-nums text-muted">
                      {displayRank}
                    </span>
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                      <ArtistAvatarHydrated
                        artistId={artist.artistId}
                        artistName={artist.artistName}
                        imageUrl={artist.imageUrl}
                        avatarApiSize={72}
                        colorIndex={avatarColorIndex}
                        alt=""
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                      {artist.artistName}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                      {artist.listenCount.toLocaleString(locale)}
                    </span>
                  </button>
                );
              })}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted">
          {t("paginationSummary", {
            start: pageStart,
            end: pageEnd,
            total,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className={DASHBOARD_BTN_GHOST}
          >
            {t("paginationPrevious")}
          </button>
          <label className="inline-flex min-h-11 items-center gap-2 text-[13px] text-muted">
            <span>{t("pageSizeLabel")}</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-11 rounded-full border border-glass-hairline bg-surface-raised px-3 text-[13px] text-foreground"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <span className="px-2 text-[13px] text-muted">
            {t("paginationPage", { page, totalPages })}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
            className={DASHBOARD_BTN_GHOST}
          >
            {t("paginationNext")}
          </button>
        </div>
      </div>
      {isFetching ? (
        <p className="mt-2 text-[13px] text-muted">{t("paginationLoading")}</p>
      ) : null}
    </div>
  );
}
