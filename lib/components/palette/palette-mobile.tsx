"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import type {
  PaletteMode,
  PaletteSessionDto,
  PaletteSuggestionDto,
} from "@/lib/dto/palette";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

const MOBILE_CANVAS =
  "space-y-8 pb-8 lg:hidden max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+5.75rem))]";
const GENRE_INPUT_CLASS =
  "min-h-11 w-full rounded-2xl border border-glass-hairline bg-surface-raised px-3.5 text-base text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-ring";

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function GenresIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
      />
    </svg>
  );
}

function isUnknownGenreLabel(value: string): boolean {
  return /^(unknown|inconnu|desconocido)$/i.test(value.trim());
}

function ActionRow({
  title,
  lead,
  icon,
  onClick,
}: {
  title: string;
  lead: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 border-b border-glass-hairline py-2.5 text-left text-foreground last:border-b-0"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-foreground dark:bg-white/10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-muted">{lead}</span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}

function DestinationRow({
  href,
  title,
  lead,
  icon,
}: {
  href: string;
  title: string;
  lead: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 border-b border-glass-hairline py-2.5 text-foreground last:border-b-0"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-foreground dark:bg-white/10">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-muted">{lead}</span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

function ModeSwitcher({
  paletteMode,
  setPaletteMode,
}: {
  paletteMode: PaletteMode;
  setPaletteMode: (mode: PaletteMode) => void;
}) {
  const t = useTranslations("palette");
  return (
    <div
      className={`${DASHBOARD_SEGMENTED_TRACK} w-full`}
      role="group"
      aria-label={t("modeAriaLabel")}
    >
      <button
        type="button"
        onClick={() => setPaletteMode("artists")}
        className={`flex-1 ${
          paletteMode === "artists"
            ? DASHBOARD_SEGMENTED_PILL_ACTIVE
            : DASHBOARD_SEGMENTED_PILL
        }`}
      >
        {t("modeArtists")}
      </button>
      <button
        type="button"
        onClick={() => setPaletteMode("tracks")}
        className={`flex-1 ${
          paletteMode === "tracks"
            ? DASHBOARD_SEGMENTED_PILL_ACTIVE
            : DASHBOARD_SEGMENTED_PILL
        }`}
      >
        {t("modeTracks")}
      </button>
    </div>
  );
}

export function PaletteMobileSkeleton() {
  const t = useTranslations("palette");

  return (
    <div className={MOBILE_CANVAS} aria-busy="true">
      <OverviewHeroFrame compact title={t("title")} description="…">
        <div className="mt-4 h-11 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
      </OverviewHeroFrame>
      <div className={`${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}>
        {[0, 1, 2].map((item) => (
          <div key={item} className={`${DASHBOARD_METRIC_CELL} min-w-[9.75rem] flex-none`}>
            <span className={`${DASHBOARD_METRIC_LABEL} inline-block h-3 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10`} />
            <span className={`${DASHBOARD_METRIC_VALUE} mt-2 inline-block h-7 w-14 animate-pulse rounded bg-black/10 dark:bg-white/10`} />
          </div>
        ))}
      </div>
      <section className="space-y-2">
        <div className="h-11 animate-pulse rounded-2xl border border-glass-hairline bg-surface-raised" />
        <div className="h-11 animate-pulse rounded-2xl border border-glass-hairline bg-surface-raised" />
      </section>
    </div>
  );
}

export function PaletteMobileError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("palette");
  const tm = useTranslations("palette.mobile");
  const tCommon = useTranslations("common");

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={tm("errorTitle")} description={t("loadError")}>
        <button
          type="button"
          onClick={onRetry}
          className={`${DASHBOARD_BTN_OUTLINE} mt-4 w-full`}
        >
          {tCommon("retry")}
        </button>
      </OverviewHeroFrame>
    </div>
  );
}

export function PaletteMobileEmpty() {
  const tm = useTranslations("palette.mobile");
  const searchParams = useSearchParams();
  const genresHref = mergeDashboardSearchParams("/dashboard/genres", searchParams);

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={tm("emptyTitle")} description={tm("emptyLead")}>
        <Link href={genresHref} className={`${DASHBOARD_BTN_OUTLINE} mt-6 w-full`}>
          {tm("emptyCta")}
        </Link>
      </OverviewHeroFrame>
    </div>
  );
}

export function PaletteMobileExperience({
  data,
  paletteMode,
  setPaletteMode,
  activeCard,
  track,
  artist,
  suggestions,
  selectedGenre,
  setSelectedGenre,
  customGenre,
  setCustomGenre,
  selectedSuggestionId,
  setSelectedSuggestionId,
  canSubmit,
  isBusy,
  onMap,
  onSkip,
  locale,
}: {
  data: PaletteSessionDto;
  paletteMode: PaletteMode;
  setPaletteMode: (mode: PaletteMode) => void;
  activeCard: PaletteSessionDto["nextArtist"] | PaletteSessionDto["nextTrack"];
  track: PaletteSessionDto["nextTrack"];
  artist: PaletteSessionDto["nextArtist"];
  suggestions: PaletteSuggestionDto[];
  selectedGenre: string;
  setSelectedGenre: (value: string) => void;
  customGenre: string;
  setCustomGenre: (value: string) => void;
  selectedSuggestionId: string | null;
  setSelectedSuggestionId: (value: string | null) => void;
  canSubmit: boolean;
  isBusy: boolean;
  onMap: () => void;
  onSkip: () => void;
  locale: string;
}) {
  const t = useTranslations("palette");
  const tm = useTranslations("palette.mobile");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const genreListId = useId();
  const suggestionsTitleId = useId();
  const customTitleId = useId();
  const [sheet, setSheet] = useState<"suggestions" | "custom" | null>(null);

  const progressPct = Math.round(data.progress.completionRatio * 100);
  const activeTitle =
    paletteMode === "tracks" && track ? track.trackTitle : (artist?.artistName ?? t("doneTitle"));
  const activeSubtitle = paletteMode === "tracks" && track ? track.artistName : tm("nowFixing");
  const artistId = paletteMode === "tracks" ? track?.artistId : artist?.artistId;
  const avatarName =
    paletteMode === "tracks" ? (track?.artistName ?? activeTitle) : (artist?.artistName ?? activeTitle);
  const imageUrl = activeCard?.imageUrl ?? null;
  const impactedListens = activeCard?.unknownListens ?? 0;
  const unknownBlocked = isUnknownGenreLabel(selectedGenre || customGenre.trim());
  const applyEnabled = canSubmit && !unknownBlocked;
  const genresHref = mergeDashboardSearchParams("/dashboard/genres", searchParams);

  const applyLabel = useMemo(() => {
    if (isBusy) return t("saving");
    if (impactedListens > 0) {
      return tm("applyWithImpact", { count: impactedListens.toLocaleString(locale) });
    }
    return tm("apply");
  }, [impactedListens, isBusy, locale, t, tm]);

  function pickSuggestion(suggestion: PaletteSuggestionDto) {
    setSelectedSuggestionId(suggestion.id);
    setSelectedGenre(suggestion.genre);
    setCustomGenre("");
    setSheet(null);
  }

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={t("title")} description={activeSubtitle}>
        <div className="mt-4 flex items-center gap-3.5">
          {artistId ? (
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-glass-hairline">
              <ArtistAvatarHydrated
                artistId={artistId}
                artistName={avatarName}
                imageUrl={imageUrl}
                avatarApiSize={96}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-tight text-foreground">
              {activeTitle}
            </p>
            <p className="mt-0.5 text-sm tabular-nums text-muted">
              {t("listensImpacted", { count: impactedListens.toLocaleString(locale) })}
            </p>
          </div>
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted">
            {progressPct}%
          </span>
        </div>
        <div className="mt-4">
          <ModeSwitcher paletteMode={paletteMode} setPaletteMode={setPaletteMode} />
        </div>
      </OverviewHeroFrame>

      <section aria-label={tm("signalsLabel")}>
        <div className={`${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}>
          <div className={`${DASHBOARD_METRIC_CELL} min-w-[9.75rem] flex-none`}>
            <span className={DASHBOARD_METRIC_LABEL}>{tm("impactSignal")}</span>
            <span className={DASHBOARD_METRIC_VALUE}>{impactedListens.toLocaleString(locale)}</span>
          </div>
          <div className={`${DASHBOARD_METRIC_CELL} min-w-[9.75rem] flex-none`}>
            <span className={DASHBOARD_METRIC_LABEL}>{tm("remainingSignal")}</span>
            <span className={DASHBOARD_METRIC_VALUE}>
              {data.progress.remaining.toLocaleString(locale)}
            </span>
          </div>
          <div className={`${DASHBOARD_METRIC_CELL} min-w-[9.75rem] flex-none`}>
            <span className={DASHBOARD_METRIC_LABEL}>{tm("mappedSignal")}</span>
            <span className={DASHBOARD_METRIC_VALUE}>
              {data.mappedListensTotal.toLocaleString(locale)}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <label className="block text-sm font-semibold text-foreground" htmlFor="palette-mobile-genre">
          {tm("pickGenre")}
        </label>
        <input
          id="palette-mobile-genre"
          list={genreListId}
          value={selectedGenre}
          onChange={(event) => {
            setSelectedGenre(event.target.value);
            setSelectedSuggestionId(null);
          }}
          className={GENRE_INPUT_CLASS}
          placeholder={t("existingGenresPlaceholder")}
          autoComplete="off"
        />
        <datalist id={genreListId}>
          {data.existingGenres.map((genre) => (
            <option key={genre} value={genre} />
          ))}
        </datalist>
        {unknownBlocked ? (
          <p className="text-sm text-red-600 dark:text-red-300">{tm("unknownRejected")}</p>
        ) : null}

        <div className="border-t border-glass-hairline pt-1">
          {suggestions.length > 0 ? (
            <ActionRow
              title={tm("suggestionsRowTitle")}
              lead={tm("suggestionsRowLead", { count: suggestions.length })}
              icon={<span className="text-sm font-bold">{suggestions.length}</span>}
              onClick={() => setSheet("suggestions")}
            />
          ) : null}

          <ActionRow
            title={tm("customRowTitle")}
            lead={customGenre.trim() || tm("customRowLead")}
            icon={<ChevronIcon className="h-5 w-5" />}
            onClick={() => setSheet("custom")}
          />

          <DestinationRow
            href={genresHref}
            title={tm("genresRowTitle")}
            lead={tm("genresRowLead")}
            icon={<GenresIcon className="h-5 w-5" />}
          />
        </div>
      </section>

      <div
        className="fixed inset-x-0 z-[19] border-t border-glass-hairline bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{ bottom: `var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR}, 0px)` }}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onMap}
            disabled={!applyEnabled}
            aria-label={tm("apply")}
            className={`${DASHBOARD_BTN_OUTLINE} min-h-12 min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {applyLabel}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isBusy}
            className={`${DASHBOARD_BTN_GHOST} min-h-12 shrink-0 disabled:opacity-40`}
          >
            {tm("skip")}
          </button>
        </div>
      </div>

      <MobileBottomSheet
        open={sheet === "suggestions"}
        onClose={() => setSheet(null)}
        ariaLabelledBy={suggestionsTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={suggestionsTitleId} className="text-lg font-semibold tracking-tight text-foreground">
                {tm("suggestionsSheetTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("suggestionsHint")}</p>
            </div>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tCommon("close")}
            >
              {tCommon("close")}
            </button>
          </div>
          <ul className="space-y-2">
            {suggestions.map((suggestion) => {
              const selected = selectedSuggestionId === suggestion.id;
              return (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(suggestion)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left ${
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-glass-hairline bg-surface-raised text-foreground"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{suggestion.genre}</span>
                      <span className={`mt-0.5 block truncate text-xs ${selected ? "text-background/80" : "text-muted"}`}>
                        {Math.round(suggestion.confidence * 100)}% · {suggestion.reason}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={sheet === "custom"}
        onClose={() => setSheet(null)}
        ariaLabelledBy={customTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={customTitleId} className="text-lg font-semibold tracking-tight text-foreground">
              {tm("customSheetTitle")}
            </h2>
            <button
              type="button"
              onClick={() => setSheet(null)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tCommon("close")}
            >
              {tCommon("close")}
            </button>
          </div>
          <label className="block text-sm font-semibold text-foreground" htmlFor="palette-mobile-custom-genre">
            {t("customGenre")}
          </label>
          <input
            id="palette-mobile-custom-genre"
            value={customGenre}
            onChange={(event) => {
              setCustomGenre(event.target.value);
              setSelectedSuggestionId(null);
            }}
            className={`${GENRE_INPUT_CLASS} mt-2`}
            placeholder={t("customGenrePlaceholder")}
          />
          <button
            type="button"
            onClick={() => setSheet(null)}
            className={`${DASHBOARD_BTN_OUTLINE} mt-4 w-full`}
          >
            {tm("customDone")}
          </button>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
