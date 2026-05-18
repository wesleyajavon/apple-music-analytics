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
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
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
              className="w-full rounded-xl border border-border bg-surface-raised py-2.5 pl-9 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              aria-controls="artist-trends-listbox"
              aria-describedby="artist-trends-search-hint"
              aria-activedescendant={
                highlightIndex >= 0 && filtered[highlightIndex]
                  ? `artist-opt-${filtered[highlightIndex].id}`
                  : undefined
              }
            />
          </div>
          <p id="artist-trends-search-hint" className="mt-1 text-xs text-muted">
            {enableRemoteSearch ? t("searchKeyboardHintExtended") : t("searchKeyboardHint")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {query.trim() !== "" && (
            <p className="text-xs text-muted tabular-nums" aria-live="polite">
              {t("searchResultsCount", { count: filtered.length, total: catalogArtists.length })}
            </p>
          )}
          <p className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted tabular-nums">
            {t("selectionCount", { selected: selectedIds.length, max: maxSelectable })}
          </p>
        </div>
      </div>

      {enableRemoteSearch && query.trim().length >= 2 && (
        <div
          className="rounded-xl border border-border bg-card shadow-lg"
          role="region"
          aria-label={t("searchDatabaseRegion")}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t("searchDatabaseTitle")}
            </p>
          </div>
          <div className="max-h-52 overflow-y-auto p-2">
            {remoteLoading ? (
              <p className="px-2 py-4 text-center text-sm text-muted">{t("searchRemoteLoading")}</p>
            ) : remoteSuggestions.filter((a) => !catalogIdSet.has(a.id)).length === 0 &&
              remoteSuggestions.length > 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted">
                {t("searchRemoteAllInCatalog")}
              </p>
            ) : remoteSuggestions.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted">
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
                              ? "cursor-default text-muted/70"
                              : disabledAdd
                                ? "cursor-not-allowed text-muted opacity-55"
                                : "text-foreground hover:bg-primary/12"
                          }
                        `}
                      >
                        <span className="min-w-0 truncate font-medium">{artist.name}</span>
                        <span className="shrink-0 text-xs text-muted">
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
        className="mt-3 flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-border bg-surface p-2"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted">
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
                      ? "border-primary/45 bg-primary/12 text-foreground shadow-sm"
                      : isHighlighted
                        ? "border-primary/55 bg-primary/10 text-foreground ring-2 ring-primary/28"
                        : "border-border bg-card text-foreground hover:bg-surface-raised"
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
                  className="rounded border-border bg-card text-primary focus:ring-ring disabled:opacity-45"
                />
                <span
                  className={`w-3 h-3 shrink-0 rounded-full border ${selected ? "border-transparent" : "border-muted bg-transparent"}`}
                  style={{
                    backgroundColor: selected ? getColor(idx) : undefined,
                  }}
                  aria-hidden
                />
                <span
                  className="truncate text-sm text-foreground"
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
