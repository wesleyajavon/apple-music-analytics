"use client";

import { memo, useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { usePagedCarouselGestures } from "@/lib/hooks/use-paged-carousel-gestures";

export const SPOTLIGHT_FEATURED_LIMIT = 10;
export const SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT = SPOTLIGHT_FEATURED_LIMIT;
export const SPOTLIGHT_PAGE_SIZE = 4;

type SpotlightArtistsT = (
  key: string,
  values?: Record<string, string | number>
) => string;

const TILE_FRAME =
  "relative aspect-[3/4] w-full overflow-hidden rounded-[22px] bg-black";

const TILE_MEDIA_MOTION =
  "absolute inset-0 origin-center transition-transform duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none group-hover:scale-[1.045] group-focus-visible:scale-[1.045]";

const TILE_HOVER_SHEEN =
  "pointer-events-none absolute inset-0 z-[5] bg-white/0 transition-colors duration-300 motion-reduce:transition-none group-hover:bg-white/[0.08] group-focus-visible:bg-white/[0.08]";

const INTERACTIVE_FOCUS =
  "group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background-rgb))]";

const REPLAY_ARROW =
  "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-xl transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-0";

function signatureLabel(artist: ArtistStatsDto, t: SpotlightArtistsT) {
  return artist.signatureTrack?.title?.trim() || t("signatureSoundUnavailable");
}

function SpotlightArtistTile({
  artist,
  index,
  t,
  locale,
  onArtistSelect,
}: {
  artist: ArtistStatsDto;
  index: number;
  t: SpotlightArtistsT;
  locale: string;
  onArtistSelect?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const interactive = Boolean(onArtistSelect);
  const body = (
    <div className={TILE_FRAME}>
      <div className={interactive ? TILE_MEDIA_MOTION : "absolute inset-0"}>
        <ArtistAvatarHydrated
          artistId={artist.artistId}
          artistName={artist.artistName}
          imageUrl={artist.imageUrl}
          avatarApiSize={640}
          colorIndex={index}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </div>
      {interactive ? <span className={TILE_HOVER_SHEEN} aria-hidden /> : null}
      <span className="absolute left-4 top-3 z-20 text-[1.75rem] font-semibold leading-none tracking-tight text-white">
        {index + 1}
      </span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[46%]" aria-hidden>
        <div className="dashboard-replay-card-frost absolute inset-0" />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-4 pt-12 text-center text-white">
        <h3 className="truncate text-[15px] font-semibold leading-tight tracking-tight">{artist.artistName}</h3>
        <p className="mt-0.5 text-[13px] font-medium tabular-nums text-white/70">
          {artist.listenCount.toLocaleString(locale)} {t("listensCount")}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-white/55">{signatureLabel(artist, t)}</p>
      </div>
    </div>
  );

  if (onArtistSelect) {
    return (
      <button
        type="button"
        data-spotlight-artist-tile=""
        className={`min-h-11 w-full text-left ${INTERACTIVE_FOCUS}`}
        onClick={() => onArtistSelect(artist, index)}
        aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
      >
        {body}
      </button>
    );
  }

  return (
    <div data-spotlight-artist-tile="" className="w-full">
      {body}
    </div>
  );
}

/**
 * Overview spotlight: Replay portrait tiles + page arrows/selector.
 */
export const SpotlightArtistsFeaturedList = memo(function SpotlightArtistsFeaturedList({
  artists,
  t,
  locale,
  onArtistSelect,
  maxArtists = SPOTLIGHT_FEATURED_LIMIT,
  pageRangeLabel,
  pagesNavLabel,
  previousPageLabel,
  nextPageLabel,
}: {
  artists: ArtistStatsDto[];
  t: SpotlightArtistsT;
  locale: string;
  onArtistSelect?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  maxArtists?: number;
  pageRangeLabel: (start: number, end: number) => string;
  pagesNavLabel: string;
  previousPageLabel: string;
  nextPageLabel: string;
}) {
  const visibleArtists = artists.slice(0, maxArtists);
  const pageCount = Math.max(1, Math.ceil(visibleArtists.length / SPOTLIGHT_PAGE_SIZE));
  const [pageIndex, setPageIndex] = useState(0);
  const safePage = Math.min(pageIndex, pageCount - 1);

  const artistKey = visibleArtists.map((artist) => artist.artistId).join("|");

  useEffect(() => {
    setPageIndex(0);
  }, [artistKey]);

  useEffect(() => {
    if (pageIndex !== safePage) setPageIndex(safePage);
  }, [pageIndex, safePage]);

  const pages = useMemo(() => {
    return Array.from({ length: pageCount }, (_, page) => {
      const start = page * SPOTLIGHT_PAGE_SIZE + 1;
      const end = Math.min((page + 1) * SPOTLIGHT_PAGE_SIZE, visibleArtists.length);
      return { page, start, end, label: pageRangeLabel(start, end) };
    });
  }, [pageCount, pageRangeLabel, visibleArtists.length]);

  const slides = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, page) =>
        visibleArtists.slice(page * SPOTLIGHT_PAGE_SIZE, page * SPOTLIGHT_PAGE_SIZE + SPOTLIGHT_PAGE_SIZE)
      ),
    [pageCount, visibleArtists]
  );

  const goTo = useCallback(
    (page: number) => {
      setPageIndex(Math.max(0, Math.min(page, pageCount - 1)));
    },
    [pageCount]
  );

  const { viewportRef, dragOffsetPx, isDragging, viewportProps } = usePagedCarouselGestures({
    pageCount,
    safePage,
    goTo,
    resetKey: artistKey,
  });

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (pageCount <= 1) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goTo(safePage + 1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        goTo(safePage - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(pageCount - 1);
      }
    },
    [goTo, pageCount, safePage]
  );

  if (!visibleArtists[0]) return null;

  const pager =
    pageCount > 1 ? (
      <div
        role="tablist"
        aria-label={pagesNavLabel}
        onKeyDown={onKeyDown}
        className="mb-4 flex items-center gap-1"
      >
        {pages.map(({ page, label }) => {
          const active = page === safePage;
          return (
            <button
              key={page}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={`min-h-11 rounded-full px-3.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted hover:text-foreground"
              }`}
              onClick={() => goTo(page)}
            >
              {label}
            </button>
          );
        })}
      </div>
    ) : null;

  const trackTransform =
    dragOffsetPx === 0
      ? `translate3d(-${safePage * 100}%, 0, 0)`
      : `translate3d(calc(-${safePage * 100}% + ${dragOffsetPx}px), 0, 0)`;

  return (
    <div className="w-full min-w-0">
      {pager}
      <div className="relative">
        <div
          ref={viewportRef}
          data-testid="spotlight-artists-viewport"
          className={`overflow-hidden overscroll-x-contain touch-pan-y ${
            pageCount > 1 ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          {...viewportProps}
        >
          <div
            className={`flex w-full ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              isDragging ? "transition-none" : "transition-transform duration-500"
            }`}
            style={{ transform: trackTransform }}
          >
            {slides.map((slideArtists, page) => {
              const active = page === safePage;
              return (
                <div
                  key={pages[page]?.start ?? page}
                  className="w-full shrink-0 grow-0 basis-full"
                  aria-hidden={!active}
                  {...(!active ? { inert: true } : {})}
                >
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                    {slideArtists.map((artist, pageOffset) => {
                      const index = page * SPOTLIGHT_PAGE_SIZE + pageOffset;
                      return (
                        <SpotlightArtistTile
                          key={artist.artistId}
                          artist={artist}
                          index={index}
                          t={t}
                          locale={locale}
                          onArtistSelect={onArtistSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {pageCount > 1 ? (
          <>
            <button
              type="button"
              className={`${REPLAY_ARROW} left-2`}
              onClick={() => goTo(safePage - 1)}
              disabled={safePage === 0}
              aria-label={previousPageLabel}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              className={`${REPLAY_ARROW} right-2`}
              onClick={() => goTo(safePage + 1)}
              disabled={safePage === pageCount - 1}
              aria-label={nextPageLabel}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
});
