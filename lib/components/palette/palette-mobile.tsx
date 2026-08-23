"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import type {
  PaletteMode,
  PaletteSessionDto,
  PaletteSuggestionDto,
} from "@/lib/dto/palette";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 lg:hidden max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+5.75rem))]";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const GENRE_INPUT_CLASS =
  "min-h-11 w-full rounded-2xl border border-card-border bg-card-surface px-3.5 text-base text-foreground outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/25";

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

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </article>
  );
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
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left text-gray-950 shadow-sm dark:text-white"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
          {lead}
        </span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
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
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-gray-950 shadow-sm dark:text-white"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
          {lead}
        </span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
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
      className="grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-white/10 p-1"
      role="group"
      aria-label={t("modeAriaLabel")}
    >
      <button
        type="button"
        onClick={() => setPaletteMode("artists")}
        className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
          paletteMode === "artists" ? "bg-white text-violet-950" : "text-white/75"
        }`}
      >
        {t("modeArtists")}
      </button>
      <button
        type="button"
        onClick={() => setPaletteMode("tracks")}
        className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
          paletteMode === "tracks" ? "bg-white text-violet-950" : "text-white/75"
        }`}
      >
        {t("modeTracks")}
      </button>
    </div>
  );
}

export function PaletteMobileSkeleton() {
  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-3">
          <div className="h-8 w-24 animate-pulse rounded-full bg-white/15" />
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-white/15" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-white/15" />
              <div className="h-7 w-40 animate-pulse rounded bg-white/20" />
            </div>
          </div>
          <div className="h-11 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </section>
      <section className="px-4">
        <div className={SNAP_RAIL}>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 min-w-[9.75rem] snap-start animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
      <section className="space-y-2 px-4">
        <div className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        <div className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
      </section>
    </div>
  );
}

export function PaletteMobileError({ onRetry }: { onRetry: () => void }) {
  const tm = useTranslations("palette.mobile");
  const tCommon = useTranslations("common");

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {tm("eyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
            {tm("errorTitle")}
          </h1>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {tCommon("retry")}
          </button>
        </div>
      </section>
    </div>
  );
}

export function PaletteMobileEmpty() {
  const tm = useTranslations("palette.mobile");
  const searchParams = useSearchParams();
  const genresHref = mergeDashboardSearchParams("/dashboard/genres", searchParams);

  return (
    <div className={`${MOBILE_BLEED} max-lg:pb-8`}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {tm("eyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
            {tm("emptyTitle")}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-white/70">{tm("emptyLead")}</p>
          <Link
            href={genresHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {tm("emptyCta")}
          </Link>
        </div>
      </section>
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
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
              {tm("eyebrow")}
            </p>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tabular-nums">
              {progressPct}%
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {artistId ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
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
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                {activeSubtitle}
              </p>
              <h1 className="mt-1 truncate text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
                {activeTitle}
              </h1>
              <p className="mt-1 text-sm font-semibold tabular-nums text-white/75">
                {t("listensImpacted", { count: impactedListens.toLocaleString(locale) })}
              </p>
            </div>
          </div>

          <ModeSwitcher paletteMode={paletteMode} setPaletteMode={setPaletteMode} />
        </div>
      </section>

      <section className="px-4" aria-label={tm("signalsLabel")}>
        <div className={SNAP_RAIL}>
          <SignalTile label={tm("impactSignal")} value={impactedListens.toLocaleString(locale)} />
          <SignalTile
            label={tm("remainingSignal")}
            value={data.progress.remaining.toLocaleString(locale)}
          />
          <SignalTile
            label={tm("mappedSignal")}
            value={data.mappedListensTotal.toLocaleString(locale)}
          />
        </div>
      </section>

      <section className="space-y-3 px-4">
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
      </section>

      <div
        className="fixed inset-x-0 z-[19] border-t border-card-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{ bottom: `var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR}, 0px)` }}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onMap}
            disabled={!applyEnabled}
            aria-label={tm("apply")}
            className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-slate-900/15 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
          >
            {applyLabel}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isBusy}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-card-surface px-4 text-sm font-semibold text-foreground disabled:opacity-40"
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
                        ? "border-violet-600 bg-violet-600 text-white"
                        : "border-card-border bg-card-surface text-foreground"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{suggestion.genre}</span>
                      <span className={`mt-0.5 block truncate text-xs ${selected ? "text-white/80" : "text-muted"}`}>
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
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-slate-950"
          >
            {tm("customDone")}
          </button>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
