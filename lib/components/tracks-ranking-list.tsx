"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SEARCH_FIELD,
} from "@/lib/components/dashboard-ui";
import type { TrackStatsDto } from "@/lib/dto/track";

function TracksRankingSearchField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  const t = useTranslations("tracks");
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
    </div>
  );
}

export function TracksRankingList({
  tracks,
  page,
  pageSize,
  totalPages,
  total,
  hasMore,
  offset,
  isFetching,
  onPageChange,
  onPageSizeChange,
  locale,
  searchInput,
  onSearchInputChange,
  searchFieldId,
  layout,
  onOpenTrack,
}: {
  tracks: TrackStatsDto[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  offset: number;
  isFetching: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  locale: string;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  searchFieldId: string;
  layout: "table" | "list";
  onOpenTrack?: (track: TrackStatsDto) => void;
}) {
  const t = useTranslations("tracks");
  const tm = useTranslations("tracks.mobile");
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + tracks.length, total);

  return (
    <div className="w-full min-w-0">
      <div className="max-w-sm">
        <TracksRankingSearchField
          id={searchFieldId}
          value={searchInput}
          onChange={onSearchInputChange}
        />
      </div>
      {layout === "table" ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className={DASHBOARD_LIST_SEPARATOR}>
                <th scope="col" className="py-3 pr-4 text-left text-[13px] font-medium text-muted">
                  {t("rank")}
                </th>
                <th scope="col" className="py-3 pr-4 text-left text-[13px] font-medium text-muted">
                  {t("track")}
                </th>
                <th scope="col" className="py-3 pr-4 text-left text-[13px] font-medium text-muted">
                  {t("artist")}
                </th>
                <th scope="col" className="py-3 text-right text-[13px] font-medium text-muted">
                  {t("listens")}
                </th>
              </tr>
            </thead>
            <tbody>
              {isFetching
                ? Array.from({ length: Math.min(pageSize, 10) }).map((_, index) => (
                    <tr key={`track-rank-skeleton-${index}`} className={DASHBOARD_LIST_SEPARATOR}>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-8 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                      </td>
                      <td className="py-3">
                        <div className="ml-auto h-4 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                      </td>
                    </tr>
                  ))
                : tracks.length === 0
                  ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[13px] text-muted">
                          {t("rankingSearchEmpty")}
                        </td>
                      </tr>
                    )
                  : tracks.map((track, index) => (
                      <tr
                        key={track.trackId}
                        className={`${DASHBOARD_LIST_SEPARATOR} ${
                          onOpenTrack
                            ? "cursor-pointer transition-colors hover:bg-black/[0.04] focus-within:bg-black/[0.04] dark:hover:bg-white/[0.06] dark:focus-within:bg-white/[0.06]"
                            : ""
                        }`}
                        onClick={onOpenTrack ? () => onOpenTrack(track) : undefined}
                        onKeyDown={
                          onOpenTrack
                            ? (event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onOpenTrack(track);
                                }
                              }
                            : undefined
                        }
                        tabIndex={onOpenTrack ? 0 : undefined}
                        role={onOpenTrack ? "button" : undefined}
                        aria-label={
                          onOpenTrack
                            ? tm("sheetOpenAria", { title: track.trackTitle })
                            : undefined
                        }
                      >
                        <td className="whitespace-nowrap py-3 pr-4 text-[13px] tabular-nums text-muted">
                          {track.rank ?? offset + index + 1}
                        </td>
                        <td className="py-3 pr-4 text-[13px] font-semibold text-foreground">{track.trackTitle}</td>
                        <td className="py-3 pr-4 text-[13px] text-muted">{track.artistName}</td>
                        <td className="whitespace-nowrap py-3 text-right text-[13px] font-semibold tabular-nums text-foreground">
                          {track.listenCount.toLocaleString(locale)}
                        </td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4">
          {isFetching
            ? Array.from({ length: Math.min(pageSize, 10) }).map((_, index) => (
                <div
                  key={`track-rank-skeleton-${index}`}
                  className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}
                  aria-hidden
                >
                  <div className="h-4 w-8 shrink-0 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                  <div className="h-4 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                  <div className="ml-auto h-4 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                </div>
              ))
            : tracks.length === 0
              ? (
                  <p className="py-10 text-center text-[13px] text-muted">{t("rankingSearchEmpty")}</p>
                )
              : tracks.map((track, index) => {
                  const displayRank = track.rank ?? offset + index + 1;
                  return (
                    <button
                      key={track.trackId}
                      type="button"
                      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_ROW_INTERACTIVE} ${DASHBOARD_LIST_SEPARATOR} w-full`}
                      aria-label={tm("sheetOpenAria", { title: track.trackTitle })}
                      onClick={() => onOpenTrack?.(track)}
                    >
                      <span className="w-8 shrink-0 text-[13px] font-semibold tabular-nums text-muted">
                        {displayRank}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-foreground">
                          {track.trackTitle}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] text-muted">{track.artistName}</span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                        {track.listenCount.toLocaleString(locale)}
                      </span>
                    </button>
                  );
                })}
        </div>
      )}
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
