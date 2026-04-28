"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { useTranslations } from "next-intl";
import type { ArtistTrendsChartArtist } from "@/lib/dto/artist";
import { useArtistSearch } from "@/lib/hooks/use-artists";

function normalizeForSearch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export type ArtistTrendsArtistPickerProps = {
  /** Liste affichée (top + extras) — recherche locale filtre cette liste */
  catalogArtists: ArtistTrendsChartArtist[];
  selectedIds: string[];
  onToggle: (artistId: string) => void;
  getColor: (indexInFullList: number) => string;
  getArtistIndex: (artistId: string) => number;
  /** Recherche serveur sur toute la table Artist */
  enableRemoteSearch?: boolean;
  /** Ajout depuis les résultats API (hors catalogue courant) */
  onPickRemoteArtist?: (artist: ArtistTrendsChartArtist) => void;
  maxSelectable?: number;
};

/**
 * Recherche locale sur le catalogue + optionnellement recherche serveur (catalogue DB complet).
 */
export function ArtistTrendsArtistPicker({
  catalogArtists,
  selectedIds,
  onToggle,
  getColor,
  getArtistIndex,
  enableRemoteSearch = false,
  onPickRemoteArtist,
  maxSelectable = 50,
}: ArtistTrendsArtistPickerProps) {
  const t = useTranslations("artistTrends");
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const optionRefs = useRef<Map<string, HTMLLabelElement>>(new Map());

  const { data: remoteData, isFetching: remoteLoading } = useArtistSearch(
    enableRemoteSearch ? query : ""
  );

  const catalogIdSet = useMemo(
    () => new Set(catalogArtists.map((a) => a.id)),
    [catalogArtists]
  );

  const remoteSuggestions = useMemo(() => {
    if (!enableRemoteSearch || !remoteData?.artists?.length) return [];
    return remoteData.artists;
  }, [enableRemoteSearch, remoteData?.artists]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return catalogArtists;
    return catalogArtists.filter((a) =>
      normalizeForSearch(a.name).includes(q)
    );
  }, [catalogArtists, query]);

  const setOptionRef = useCallback((id: string, el: HTMLLabelElement | null) => {
    if (el) optionRefs.current.set(id, el);
    else optionRefs.current.delete(id);
  }, []);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query, catalogArtists]);

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
        setHighlightIndex((i) =>
          i < 0 ? 0 : Math.min(i + 1, filtered.length - 1)
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => {
          if (i <= 0) return -1;
          return i - 1;
        });
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
        if (filtered.length === 1) {
          e.preventDefault();
          if (!atCapacity || selectedIds.includes(filtered[0].id)) {
            onToggle(filtered[0].id);
          }
        }
        return;
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
    (artist: ArtistTrendsChartArtist) => {
      if (atCapacity && !selectedIds.includes(artist.id)) return;
      onPickRemoteArtist?.(artist);
      setQuery("");
    },
    [atCapacity, onPickRemoteArtist, selectedIds]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="artist-trends-search" className="sr-only">
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
              id="artist-trends-search"
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
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              aria-controls="artist-trends-listbox"
              aria-describedby="artist-trends-search-hint"
              aria-activedescendant={
                highlightIndex >= 0 && filtered[highlightIndex]
                  ? `artist-opt-${filtered[highlightIndex].id}`
                  : undefined
              }
            />
          </div>
          <p id="artist-trends-search-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {enableRemoteSearch ? t("searchKeyboardHintExtended") : t("searchKeyboardHint")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {query.trim() !== "" && (
            <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums" aria-live="polite">
              {t("searchResultsCount", { count: filtered.length, total: catalogArtists.length })}
            </p>
          )}
          <p className="rounded-full border border-gray-200 bg-gray-50/80 px-2.5 py-1 text-xs text-gray-500 tabular-nums dark:border-gray-600 dark:bg-gray-700/30 dark:text-gray-400">
            {t("selectionCount", { selected: selectedIds.length, max: maxSelectable })}
          </p>
        </div>
      </div>

      {enableRemoteSearch && query.trim().length >= 2 && (
        <div
          className="rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
          role="region"
          aria-label={t("searchDatabaseRegion")}
        >
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              {t("searchDatabaseTitle")}
            </p>
          </div>
          <div className="max-h-52 overflow-y-auto p-2">
            {remoteLoading ? (
              <p className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">{t("searchRemoteLoading")}</p>
            ) : remoteSuggestions.filter((a) => !catalogIdSet.has(a.id)).length === 0 &&
              remoteSuggestions.length > 0 ? (
              <p className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("searchRemoteAllInCatalog")}
              </p>
            ) : remoteSuggestions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("searchNoResults")}
              </p>
            ) : (
              <ul className="space-y-1">
                {remoteSuggestions.map((artist) => {
                  const inCatalog = catalogIdSet.has(artist.id);
                  const selected = selectedIds.includes(artist.id);
                  const disabledAdd = atCapacity && !selected;
                  return (
                    <li key={artist.id}>
                      <button
                        type="button"
                        disabled={inCatalog || disabledAdd || selected}
                        onClick={() =>
                          !inCatalog && !selected && handlePickRemote(artist)
                        }
                        className={`
                          flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors
                          ${
                            inCatalog
                              ? "cursor-default text-gray-400 dark:text-gray-500"
                              : disabledAdd
                                ? "cursor-not-allowed opacity-50 text-gray-500 dark:text-gray-400"
                                : "text-gray-900 hover:bg-violet-50 dark:text-white dark:hover:bg-violet-500/10"
                          }
                        `}
                      >
                        <span className="min-w-0 truncate font-medium">{artist.name}</span>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {inCatalog
                            ? t("searchInCatalog")
                            : selected
                              ? t("searchAdded")
                              : t("searchAdd")}
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
        id="artist-trends-listbox"
        role="listbox"
        aria-label={t("artistsToDisplay")}
        aria-multiselectable="true"
        className="mt-3 flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/80 p-2 dark:border-gray-700 dark:bg-gray-700/30"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("searchNoResults")}
          </p>
        ) : (
          filtered.map((artist, pos) => {
            const selected = selectedIds.includes(artist.id);
            const idx = getArtistIndex(artist.id);
            const isHighlighted = highlightIndex === pos;
            return (
              <label
                key={artist.id}
                id={`artist-opt-${artist.id}`}
                ref={(el) => setOptionRef(artist.id, el)}
                role="option"
                aria-selected={selected}
                className={`
                  inline-flex max-w-[min(100%,260px)] cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors
                  ${
                    selected
                      ? "border-violet-300/70 bg-violet-50 text-gray-900 shadow-sm dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-white"
                      : isHighlighted
                        ? "border-violet-500/60 bg-violet-50 ring-2 ring-violet-500/25 dark:bg-violet-500/10"
                        : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700/50"
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={!selected && atCapacity}
                  onChange={() => {
                    if (!selected && atCapacity) return;
                    onToggle(artist.id);
                  }}
                  tabIndex={-1}
                  className="rounded border-gray-300 text-violet-700 focus:ring-violet-600 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800"
                />
                <span
                  className="w-3 h-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: selected ? getColor(idx) : "transparent",
                    border: selected ? "none" : "1px solid #9ca3af",
                  }}
                  aria-hidden
                />
                <span
                  className="truncate text-sm text-gray-900 dark:text-white"
                  title={artist.name}
                >
                  {artist.name}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
