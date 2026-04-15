"use client";

import { useState, useMemo, useCallback, useEffect, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useTrackSearch } from "@/lib/hooks/use-tracks";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";

function normalizeForSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

type Props = {
  catalogTracks: TrackTrendsChartTrack[];
  selectedIds: string[];
  onToggle: (trackId: string) => void;
  getColor: (indexInFullList: number) => string;
  getTrackIndex: (trackId: string) => number;
  enableRemoteSearch?: boolean;
  onPickRemoteTrack?: (track: TrackTrendsChartTrack) => void;
  maxSelectable?: number;
};

export function TrackTrendsTrackPicker({
  catalogTracks,
  selectedIds,
  onToggle,
  getColor,
  getTrackIndex,
  enableRemoteSearch = false,
  onPickRemoteTrack,
  maxSelectable = 50,
}: Props) {
  const t = useTranslations("trackTrends");
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const optionRefs = useRef<Map<string, HTMLLabelElement>>(new Map());

  const { data: remoteData, isFetching: remoteLoading } = useTrackSearch(
    enableRemoteSearch ? query : ""
  );

  const catalogIdSet = useMemo(
    () => new Set(catalogTracks.map((track) => track.id)),
    [catalogTracks]
  );

  const remoteSuggestions = useMemo(() => {
    if (!enableRemoteSearch || !remoteData?.tracks?.length) return [];
    return remoteData.tracks;
  }, [enableRemoteSearch, remoteData?.tracks]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return catalogTracks;
    return catalogTracks.filter((track) =>
      normalizeForSearch(getTrackLabel(track)).includes(q)
    );
  }, [catalogTracks, query]);

  const setOptionRef = useCallback((id: string, el: HTMLLabelElement | null) => {
    if (el) optionRefs.current.set(id, el);
    else optionRefs.current.delete(id);
  }, []);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query, catalogTracks]);

  useEffect(() => {
    if (highlightIndex < 0 || highlightIndex >= filtered.length) return;
    const id = filtered[highlightIndex]?.id;
    if (!id) return;
    const el = optionRefs.current.get(id);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightIndex, filtered]);

  const atCapacity = selectedIds.length >= maxSelectable;

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setHighlightIndex((i) => (i < 0 ? 0 : Math.min(i + 1, filtered.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i <= 0 ? -1 : i - 1));
        return;
      }
      if (e.key === "Enter") {
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          e.preventDefault();
          if (!atCapacity || selectedIds.includes(filtered[highlightIndex].id)) {
            onToggle(filtered[highlightIndex].id);
          }
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery("");
        setHighlightIndex(-1);
      }
    },
    [filtered, highlightIndex, onToggle, atCapacity, selectedIds]
  );

  const handlePickRemote = useCallback(
    (track: TrackTrendsChartTrack) => {
      if (atCapacity && !selectedIds.includes(track.id)) return;
      onPickRemoteTrack?.(track);
      setQuery("");
    },
    [atCapacity, onPickRemoteTrack, selectedIds]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="track-trends-search" className="sr-only">
            {t("searchAriaLabel")}
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              aria-hidden
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              id="track-trends-search"
              type="search"
              role="combobox"
              aria-expanded={true}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-accent-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/20 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white dark:placeholder:text-gray-500"
              aria-controls="track-trends-listbox"
              aria-describedby="track-trends-search-hint"
              aria-activedescendant={
                highlightIndex >= 0 && filtered[highlightIndex]
                  ? `track-opt-${filtered[highlightIndex].id}`
                  : undefined
              }
            />
          </div>
          <p id="track-trends-search-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {enableRemoteSearch ? t("searchKeyboardHintExtended") : t("searchKeyboardHint")}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {t("selectionCount", { selected: selectedIds.length, max: maxSelectable })}
        </p>
      </div>

      {enableRemoteSearch && query.trim().length >= 2 && (
        <div
          className="rounded-xl border border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-md dark:shadow-none"
          role="region"
          aria-label={t("searchDatabaseRegion")}
        >
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-3 py-2">
            <p className="text-xs font-medium text-accent-violet dark:text-accent-violet/90">
              {t("searchDatabaseTitle")}
            </p>
          </div>
          <div className="max-h-52 overflow-y-auto p-2">
            {remoteLoading ? (
              <p className="px-2 py-4 text-center text-sm text-gray-500">{t("searchRemoteLoading")}</p>
            ) : remoteSuggestions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("searchNoResults")}
              </p>
            ) : (
              <ul className="space-y-1">
                {remoteSuggestions.map((track) => {
                  const inCatalog = catalogIdSet.has(track.id);
                  const selected = selectedIds.includes(track.id);
                  const disabledAdd = atCapacity && !selected;
                  return (
                    <li key={track.id}>
                      <button
                        type="button"
                        disabled={inCatalog || selected || disabledAdd}
                        onClick={() => !inCatalog && !selected && handlePickRemote(track)}
                        className={`
                          flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors
                          ${
                            inCatalog
                              ? "cursor-default text-gray-400 dark:text-gray-500"
                              : disabledAdd
                                ? "cursor-not-allowed opacity-50 text-gray-500"
                                : "text-gray-900 hover:bg-accent-violet/10 dark:text-white dark:hover:bg-accent-violet/20"
                          }
                        `}
                      >
                        <span className="min-w-0 truncate font-medium">{getTrackLabel(track)}</span>
                        <span className="shrink-0 text-xs">
                          {inCatalog ? t("searchInCatalog") : selected ? t("searchAdded") : t("searchAdd")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <div
        id="track-trends-listbox"
        role="listbox"
        aria-label={t("tracksToDisplay")}
        aria-multiselectable="true"
        className="mt-3 flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 p-2 dark:border-gray-700/50 dark:bg-gray-900/30"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500 dark:text-gray-400">{t("searchNoResults")}</p>
        ) : (
          filtered.map((track, pos) => {
            const selected = selectedIds.includes(track.id);
            const idx = getTrackIndex(track.id);
            const isHighlighted = highlightIndex === pos;
            return (
              <label
                key={track.id}
                id={`track-opt-${track.id}`}
                ref={(el) => setOptionRef(track.id, el)}
                role="option"
                aria-selected={selected}
                className={`
                  inline-flex max-w-[min(100%,320px)] cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 transition-colors
                  ${
                    isHighlighted
                      ? "border-accent-violet ring-2 ring-accent-violet/30 bg-accent-violet/5 dark:bg-accent-violet/10"
                      : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={!selected && atCapacity}
                  onChange={() => {
                    if (!selected && atCapacity) return;
                    onToggle(track.id);
                  }}
                  tabIndex={-1}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                />
                <span
                  className="w-3 h-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: selected ? getColor(idx) : "transparent",
                    border: selected ? "none" : "1px solid #9ca3af",
                  }}
                  aria-hidden
                />
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate" title={getTrackLabel(track)}>
                  {getTrackLabel(track)}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
