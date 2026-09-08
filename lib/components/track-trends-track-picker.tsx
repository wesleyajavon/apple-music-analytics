"use client";

import { useState, useMemo, useCallback, useEffect, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useTrackSearch } from "@/lib/hooks/use-tracks";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";
import {
  DASHBOARD_FILTER_CHIP,
  DASHBOARD_FILTER_CHIP_ACTIVE,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SEARCH_FIELD,
} from "@/lib/components/dashboard-ui";

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
  idPrefix?: string;
  /** Liste plus courte — adapté aux cartes overview. */
  compact?: boolean;
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
  idPrefix = "track-trends",
  compact = false,
}: Props) {
  const t = useTranslations("trackTrends");
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const searchInputId = `${idPrefix}-search`;
  const listboxId = `${idPrefix}-listbox`;
  const searchHintId = `${idPrefix}-search-hint`;

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

  const setOptionRef = useCallback((id: string, el: HTMLButtonElement | null) => {
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            {t("searchAriaLabel")}
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              id={searchInputId}
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
              className={DASHBOARD_SEARCH_FIELD}
              aria-controls={listboxId}
              aria-describedby={searchHintId}
              aria-activedescendant={
                highlightIndex >= 0 && filtered[highlightIndex]
                  ? `${idPrefix}-opt-${filtered[highlightIndex].id}`
                  : undefined
              }
            />
          </div>
          <p id={searchHintId} className="sr-only">
            {enableRemoteSearch ? t("searchKeyboardHintExtended") : t("searchKeyboardHint")}
          </p>
        </div>
        <p className="text-[13px] tabular-nums text-muted">
          {t("selectionCount", { selected: selectedIds.length, max: maxSelectable })}
        </p>
      </div>

      {enableRemoteSearch && query.trim().length >= 2 ? (
        <div
          className="overflow-hidden rounded-[12px] border border-glass-hairline"
          role="region"
          aria-label={t("searchDatabaseRegion")}
        >
          <p className="px-3.5 py-2 text-[13px] text-muted">{t("searchDatabaseTitle")}</p>
          <div className="max-h-52 overflow-y-auto border-t border-glass-hairline px-2">
            {remoteLoading ? (
              <p className="px-2 py-4 text-center text-[13px] text-muted">{t("searchRemoteLoading")}</p>
            ) : remoteSuggestions.length === 0 ? (
              <p className="px-2 py-4 text-center text-[13px] text-muted">
                {t("searchNoResults")}
              </p>
            ) : (
              <ul>
                {remoteSuggestions.map((track) => {
                  const inCatalog = catalogIdSet.has(track.id);
                  const selected = selectedIds.includes(track.id);
                  const disabledAdd = atCapacity && !selected;
                  return (
                    <li key={track.id} className={DASHBOARD_LIST_SEPARATOR}>
                      <button
                        type="button"
                        disabled={inCatalog || selected || disabledAdd}
                        onClick={() => !inCatalog && !selected && handlePickRemote(track)}
                        className={`${DASHBOARD_LIST_ROW} w-full text-[13px] ${
                          inCatalog || selected || disabledAdd
                            ? "cursor-default text-muted"
                            : "text-foreground"
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium">{getTrackLabel(track)}</span>
                        <span className="shrink-0 text-muted">
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
      ) : null}

      <div
        id={listboxId}
        role="listbox"
        aria-label={t("tracksToDisplay")}
        aria-multiselectable="true"
        className={`flex flex-wrap content-start gap-2 overflow-y-auto ${
          compact ? "max-h-[min(40vh,14rem)]" : "max-h-[min(50vh,22rem)]"
        }`}
      >
        {filtered.length === 0 ? (
          <p className="py-6 text-[13px] text-muted">{t("searchNoResults")}</p>
        ) : (
          filtered.map((track, pos) => {
            const selected = selectedIds.includes(track.id);
            const idx = getTrackIndex(track.id);
            const isHighlighted = highlightIndex === pos;
            const disabled = !selected && atCapacity;
            const label = getTrackLabel(track);
            return (
              <button
                key={track.id}
                id={`${idPrefix}-opt-${track.id}`}
                ref={(el) => setOptionRef(track.id, el)}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                title={label}
                onClick={() => {
                  if (disabled) return;
                  onToggle(track.id);
                }}
                className={`${selected ? DASHBOARD_FILTER_CHIP_ACTIVE : DASHBOARD_FILTER_CHIP} max-w-[min(100%,320px)] ${
                  isHighlighted ? "ring-2 ring-ring" : ""
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: selected ? getColor(idx) : "transparent",
                    boxShadow: selected ? undefined : "inset 0 0 0 1px var(--glass-hairline)",
                  }}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
