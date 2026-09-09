"use client";

import { memo, useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { getAvatarBackgroundColor } from "@/lib/components/artist-avatar-utils";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";

export const REPLAY_PAGE_SIZE = 4;
export const REPLAY_TOPS_LIMIT = 8;

const TILE_FRAME =
  "relative aspect-[3/4] w-full overflow-hidden rounded-[22px] bg-black";

const INTERACTIVE_FOCUS =
  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background-rgb))]";

const REPLAY_ARROW =
  "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-xl transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-0";

export type ReplayRankingMedia =
  | {
      kind: "artist";
      artistId: string;
      artistName: string;
      imageUrl?: string | null;
    }
  | {
      kind: "fill";
      seed: string;
    };

export type ReplayRankingItem = {
  id: string;
  title: string;
  metric: string;
  subtitle?: string;
  media: ReplayRankingMedia;
  href?: string;
  ariaLabel?: string;
};

function fillInitial(seed: string): string {
  const trimmed = seed.trim();
  if (!trimmed) return "?";
  return Array.from(trimmed)[0]!.toUpperCase();
}

function ReplayRankingMediaFill({
  seed,
  index,
}: {
  seed: string;
  index: number;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{ backgroundColor: getAvatarBackgroundColor(index) }}
      aria-hidden
    >
      <span className="absolute inset-0 flex items-center justify-center text-[4.5rem] font-semibold leading-none tracking-tight text-white/90">
        {fillInitial(seed)}
      </span>
    </div>
  );
}

function ReplayRankingTile({
  item,
  index,
  onSelect,
}: {
  item: ReplayRankingItem;
  index: number;
  onSelect?: (item: ReplayRankingItem, index: number) => void;
}) {
  const body = (
    <div className={TILE_FRAME} data-replay-ranking-tile="">
      {item.media.kind === "artist" ? (
        <ArtistAvatarHydrated
          artistId={item.media.artistId}
          artistName={item.media.artistName}
          imageUrl={item.media.imageUrl}
          avatarApiSize={640}
          colorIndex={index}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top"
          loading={index < 4 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <ReplayRankingMediaFill seed={item.media.seed} index={index} />
      )}
      <span className="absolute left-4 top-3 z-20 text-[1.75rem] font-semibold leading-none tracking-tight text-white">
        {index + 1}
      </span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[46%]" aria-hidden>
        <div className="dashboard-replay-card-frost absolute inset-0" />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-4 pt-12 text-center text-white">
        <h3 className="truncate text-[15px] font-semibold leading-tight tracking-tight">{item.title}</h3>
        <p className="mt-0.5 text-[13px] font-medium tabular-nums text-white/70">{item.metric}</p>
        {item.subtitle ? (
          <p className="mt-0.5 truncate text-[12px] text-white/55">{item.subtitle}</p>
        ) : null}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={`min-h-11 w-full text-left ${INTERACTIVE_FOCUS}`}
        onClick={() => onSelect(item, index)}
        aria-label={item.ariaLabel ?? item.title}
      >
        {body}
      </button>
    );
  }

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={`block min-h-11 w-full ${INTERACTIVE_FOCUS}`}
        aria-label={item.ariaLabel ?? item.title}
      >
        {body}
      </Link>
    );
  }

  return <div className="w-full">{body}</div>;
}

export function ReplayRankingSection({
  eyebrow,
  title,
  description,
  seeAllHref,
  seeAllLabel,
  titleId,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full min-w-0" aria-labelledby={titleId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
          <h2 id={titleId} className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        {seeAllHref && seeAllLabel ? (
          <Link href={seeAllHref} className={`${DASHBOARD_BTN_GHOST} shrink-0 self-start`}>
            {seeAllLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function ReplayRankingSkeleton({ count = REPLAY_PAGE_SIZE }: { count?: number }) {
  return (
    <div className="w-full min-w-0" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="aspect-[3/4] w-full animate-pulse rounded-[22px] bg-black/10 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

export const ReplayRankingGrid = memo(function ReplayRankingGrid({
  items,
  onSelect,
  maxItems = REPLAY_TOPS_LIMIT,
  pageRangeLabel,
  pagesNavLabel,
  previousPageLabel,
  nextPageLabel,
}: {
  items: ReplayRankingItem[];
  onSelect?: (item: ReplayRankingItem, index: number) => void;
  maxItems?: number;
  pageRangeLabel: (start: number, end: number) => string;
  pagesNavLabel: string;
  previousPageLabel: string;
  nextPageLabel: string;
}) {
  const visibleItems = items.slice(0, maxItems);
  const pageCount = Math.max(1, Math.ceil(visibleItems.length / REPLAY_PAGE_SIZE));
  const [pageIndex, setPageIndex] = useState(0);
  const safePage = Math.min(pageIndex, pageCount - 1);

  const itemKey = visibleItems.map((item) => item.id).join("|");

  useEffect(() => {
    setPageIndex(0);
  }, [itemKey]);

  useEffect(() => {
    if (pageIndex !== safePage) setPageIndex(safePage);
  }, [pageIndex, safePage]);

  const pages = useMemo(() => {
    return Array.from({ length: pageCount }, (_, page) => {
      const start = page * REPLAY_PAGE_SIZE + 1;
      const end = Math.min((page + 1) * REPLAY_PAGE_SIZE, visibleItems.length);
      return { page, start, end, label: pageRangeLabel(start, end) };
    });
  }, [pageCount, pageRangeLabel, visibleItems.length]);

  const slides = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, page) =>
        visibleItems.slice(page * REPLAY_PAGE_SIZE, page * REPLAY_PAGE_SIZE + REPLAY_PAGE_SIZE)
      ),
    [pageCount, visibleItems]
  );

  const goTo = useCallback(
    (page: number) => {
      setPageIndex(Math.max(0, Math.min(page, pageCount - 1)));
    },
    [pageCount]
  );

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

  if (!visibleItems[0]) return null;

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

  return (
    <div className="w-full min-w-0">
      {pager}
      <div className="relative">
        <div className="overflow-hidden">
          <div
            className="flex w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translate3d(-${safePage * 100}%, 0, 0)` }}
          >
            {slides.map((slideItems, page) => {
              const active = page === safePage;
              return (
                <div
                  key={pages[page]?.start ?? page}
                  className="w-full shrink-0 grow-0 basis-full"
                  aria-hidden={!active}
                  {...(!active ? { inert: true } : {})}
                >
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                    {slideItems.map((item, pageOffset) => {
                      const index = page * REPLAY_PAGE_SIZE + pageOffset;
                      return (
                        <ReplayRankingTile
                          key={item.id}
                          item={item}
                          index={index}
                          onSelect={onSelect}
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
