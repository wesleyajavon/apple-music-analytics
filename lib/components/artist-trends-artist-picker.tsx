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
  /** Préfixe d’ids DOM (évite les collisions si plusieurs pickers coexistent). */
  idPrefix?: string;
  /** Liste plus courte — adapté aux cartes overview. */
  compact?: boolean;
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
  idPrefix = "artist-trends",
  compact = false,
}: ArtistTrendsArtistPickerProps) {
  const t = useTranslations("artistTrends");
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const searchInputId = `${idPrefix}-search`;
  const listboxId = `${idPrefix}-listbox`;
  const searchHintId = `${idPrefix}-search-hint`;

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

  const setOptionRef = useCallback((id: string, el: HTMLButtonElement | null) => {
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
        <div className="flex shrink-0 items-center gap-3">
          {query.trim() !== "" ? (
            <p className="text-[13px] tabular-nums text-muted" aria-live="polite">
              {t("searchResultsCount", { count: filtered.length, total: catalogArtists.length })}
            </p>
          ) : null}
          <p className="text-[13px] tabular-nums text-muted">
            {t("selectionCount", { selected: selectedIds.length, max: maxSelectable })}
          </p>
        </div>
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
            ) : remoteSuggestions.filter((a) => !catalogIdSet.has(a.id)).length === 0 &&
              remoteSuggestions.length > 0 ? (
              <p className="px-2 py-4 text-center text-[13px] text-muted">
                {t("searchRemoteAllInCatalog")}
              </p>
            ) : remoteSuggestions.length === 0 ? (
              <p className="px-2 py-4 text-center text-[13px] text-muted">
                {t("searchNoResults")}
              </p>
            ) : (
              <ul>
                {remoteSuggestions.map((artist) => {
                  const inCatalog = catalogIdSet.has(artist.id);
                  const selected = selectedIds.includes(artist.id);
                  const disabledAdd = atCapacity && !selected;
                  return (
                    <li key={artist.id} className={DASHBOARD_LIST_SEPARATOR}>
                      <button
                        type="button"
                        disabled={inCatalog || disabledAdd || selected}
                        onClick={() =>
                          !inCatalog && !selected && handlePickRemote(artist)
                        }
                        className={`${DASHBOARD_LIST_ROW} w-full text-[13px] ${
                          inCatalog || selected || disabledAdd
                            ? "cursor-default text-muted"
                            : "text-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium">{artist.name}</span>
                        <span className="shrink-0 text-muted">
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
      ) : null}

      <div
        id={listboxId}
        role="listbox"
        aria-label={t("artistsToDisplay")}
        aria-multiselectable="true"
        className={`flex flex-wrap content-start gap-2 overflow-y-auto ${
          compact ? "max-h-[min(40vh,14rem)]" : "max-h-[min(50vh,22rem)]"
        }`}
      >
        {filtered.length === 0 ? (
          <p className="py-6 text-[13px] text-muted">{t("searchNoResults")}</p>
        ) : (
          filtered.map((artist, pos) => {
            const selected = selectedIds.includes(artist.id);
            const idx = getArtistIndex(artist.id);
            const isHighlighted = highlightIndex === pos;
            const disabled = !selected && atCapacity;
            return (
              <button
                key={artist.id}
                id={`${idPrefix}-opt-${artist.id}`}
                ref={(el) => setOptionRef(artist.id, el)}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                title={artist.name}
                onClick={() => {
                  if (disabled) return;
                  onToggle(artist.id);
                }}
                className={`${selected ? DASHBOARD_FILTER_CHIP_ACTIVE : DASHBOARD_FILTER_CHIP} ${
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
                <span className="truncate">{artist.name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
