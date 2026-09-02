"use client";

import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Music2 } from "lucide-react";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";

export { getAvatarUrl, getArtistImageUrl } from "@/lib/components/artist-avatar-utils";

export const SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT = 10;
const CAROUSEL_GAP_PX = 24;

type TopThreeArtistsT = (
  key: string,
  values?: Record<string, string | number>
) => string;

type SpotlightArtistCardProps = {
  artist: ArtistStatsDto;
  index: number;
  t: TopThreeArtistsT;
  locale: string;
  onArtistSelect?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  className?: string;
};

const CARD_SHELL = `group relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90
              p-2 shadow-card backdrop-blur transition-all duration-500 hover:-translate-y-1.5
              hover:border-white hover:shadow-[0_28px_80px_-34px_rgba(80,42,130,0.65)]
              opacity-0 animate-fade-in-up ring-1 ring-card-border
              dark:border-white/[0.08] dark:bg-[#0c0e18] dark:shadow-xl dark:shadow-black/40 dark:ring-white/[0.06]
              dark:hover:border-white/15 dark:hover:shadow-[0_28px_70px_-40px_rgba(0,0,0,0.75)]`;

const INTERACTIVE_EXTRAS =
  "cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background-rgb))] dark:focus-visible:ring-offset-slate-950";

const NAV_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full border border-card-border bg-white/90 text-accent-violet shadow-lg shadow-black/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card disabled:pointer-events-none disabled:opacity-0 dark:border-white/[0.10] dark:bg-[#161822] dark:text-violet-100 dark:hover:bg-[#1c2030]";

function SpotlightArtistCard({
  artist,
  index,
  t,
  locale,
  onArtistSelect,
  className = "",
}: SpotlightArtistCardProps) {
  const body = (
    <div className="relative min-h-[320px] overflow-hidden rounded-[1.35rem] bg-slate-100 dark:bg-slate-900 sm:min-h-[340px]">
      <ArtistAvatarHydrated
        artistId={artist.artistId}
        artistName={artist.artistName}
        imageUrl={artist.imageUrl}
        avatarApiSize={640}
        colorIndex={index}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-focus-visible:scale-110"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-white/20 via-transparent to-white/10 opacity-70 transition-opacity duration-500 group-hover:opacity-35 group-focus-visible:opacity-35 dark:from-black/20 dark:to-black/10"
        aria-hidden
      />
      <span className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/90 text-lg font-black text-gray-950 shadow-xl shadow-black/10 backdrop-blur ring-1 ring-black/5 dark:border-white/20 dark:bg-slate-900/95 dark:text-white dark:shadow-black/40 dark:ring-white/10">
        {index + 1}
      </span>
      {artist.signatureTrack?.title ? (
        <div
          className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-5.5rem)] items-center gap-1.5 rounded-full border border-white/55 bg-black/55 px-2.5 py-1 text-xs font-semibold text-white shadow-lg shadow-black/25 backdrop-blur-md"
          title={artist.signatureTrack.title}
        >
          <Music2 className="h-3.5 w-3.5 shrink-0 text-cyan-200" aria-hidden />
          <span className="truncate">{artist.signatureTrack.title}</span>
          <span className="sr-only">{t("signatureSound")}</span>
        </div>
      ) : null}
      <div className="absolute inset-x-3 bottom-3 translate-y-5 rounded-3xl border border-white/80 bg-white/90 p-4 opacity-0 shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 dark:border-white/10 dark:bg-slate-950/80">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">
              {artist.artistName}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted">
              <Music2 className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-300" aria-hidden />
              <span className="truncate">
                {artist.signatureTrack?.title?.trim() || t("signatureSoundUnavailable")}
              </span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-gray-950 dark:text-white">
              {artist.listenCount.toLocaleString(locale)}
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {t("listensCount")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const styleDelay = { animationDelay: `${index * 80}ms` };

  if (onArtistSelect) {
    return (
      <button
        type="button"
        data-spotlight-artist-card=""
        className={`${CARD_SHELL} ${INTERACTIVE_EXTRAS} ${className}`}
        style={styleDelay}
        onClick={() => onArtistSelect(artist, index)}
        aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      data-spotlight-artist-card=""
      className={`${CARD_SHELL} ${className}`}
      style={styleDelay}
    >
      {body}
    </div>
  );
}

function SpotlightArtistsCarousel({
  artists,
  t,
  locale,
  onArtistSelect,
  previousLabel,
  nextLabel,
  carouselLabel,
}: {
  artists: ArtistStatsDto[];
  t: TopThreeArtistsT;
  locale: string;
  onArtistSelect?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  previousLabel: string;
  nextLabel: string;
  carouselLabel: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScrollState);
      return () => {
        el.removeEventListener("scroll", updateScrollState);
        window.removeEventListener("resize", updateScrollState);
      };
    }

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [artists.length, updateScrollState]);

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-spotlight-artist-card]");
    const delta = card ? card.offsetWidth + CAROUSEL_GAP_PX : Math.max(el.clientWidth * 0.8, 240);
    el.scrollBy({ left: direction * delta, behavior: "smooth" });
  }, []);

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={carouselLabel}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollByCard(1);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollByCard(-1);
          }
        }}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain scroll-smooth py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {artists.map((artist, index) => (
          <SpotlightArtistCard
            key={artist.artistId}
            artist={artist}
            index={index}
            t={t}
            locale={locale}
            onArtistSelect={onArtistSelect}
            className="w-[min(20rem,calc(100%-1.5rem))] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
          />
        ))}
      </div>

      {canScrollPrev ? (
        <div
          className="pointer-events-none absolute inset-y-3 left-0 w-16 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#070812] dark:via-[#070812]/80"
          aria-hidden
        />
      ) : null}
      {canScrollNext ? (
        <div
          className="pointer-events-none absolute inset-y-3 right-0 w-16 bg-gradient-to-l from-[#eef7ff] via-[#eef7ff]/80 to-transparent dark:from-[#0c0e18] dark:via-[#0c0e18]/80"
          aria-hidden
        />
      ) : null}

      <button
        type="button"
        className={`${NAV_BUTTON_CLASS} absolute left-1 top-1/2 z-20 -translate-y-1/2`}
        onClick={() => scrollByCard(-1)}
        disabled={!canScrollPrev}
        aria-label={previousLabel}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        className={`${NAV_BUTTON_CLASS} absolute right-1 top-1/2 z-20 -translate-y-1/2`}
        onClick={() => scrollByCard(1)}
        disabled={!canScrollNext}
        aria-label={nextLabel}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Top artistes – grandes cartes hero style Apple Music Replay.
 * Grille (page artistes) ou carrousel horizontal (spotlight overview).
 */
export const TopThreeArtists = memo(
  ({
    artists,
    maxListens: _maxListens,
    t,
    locale,
    onArtistSelect,
    layout = "grid",
    maxArtists,
    previousLabel,
    nextLabel,
    carouselLabel,
  }: {
    artists: ArtistStatsDto[];
    maxListens: number;
    t: TopThreeArtistsT;
    locale: string;
    onArtistSelect?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
    layout?: "grid" | "carousel";
    maxArtists?: number;
    previousLabel?: string;
    nextLabel?: string;
    carouselLabel?: string;
  }) => {
    const limit =
      maxArtists ??
      (layout === "carousel" ? SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT : 3);
    const visibleArtists = artists.slice(0, limit);

    if (layout === "carousel") {
      return (
        <SpotlightArtistsCarousel
          artists={visibleArtists}
          t={t}
          locale={locale}
          onArtistSelect={onArtistSelect}
          previousLabel={previousLabel ?? "Previous artists"}
          nextLabel={nextLabel ?? "Next artists"}
          carouselLabel={carouselLabel ?? "Artist spotlight"}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {visibleArtists.map((artist, index) => (
          <SpotlightArtistCard
            key={artist.artistId}
            artist={artist}
            index={index}
            t={t}
            locale={locale}
            onArtistSelect={onArtistSelect}
            className="w-full"
          />
        ))}
      </div>
    );
  }
);

TopThreeArtists.displayName = "TopThreeArtists";
