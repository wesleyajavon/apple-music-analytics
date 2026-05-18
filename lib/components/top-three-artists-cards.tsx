"use client";

import { memo } from "react";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";

export { getAvatarUrl, getArtistImageUrl } from "@/lib/components/artist-avatar-utils";

type TopThreeArtistsT = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Top 3 – grandes cartes hero style Apple Music Replay
 */
export const TopThreeArtists = memo(
  ({
    artists,
    maxListens,
    t,
    locale,
    onArtistSelect,
  }: {
    artists: ArtistStatsDto[];
    maxListens: number;
    t: TopThreeArtistsT;
    locale: string;
    onArtistSelect?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  }) => {
    const cardShell =
      `group relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90
              p-2 shadow-card backdrop-blur transition-all duration-500 hover:-translate-y-1.5
              hover:border-white hover:shadow-[0_28px_80px_-34px_rgba(80,42,130,0.65)]
              opacity-0 animate-fade-in-up ring-1 ring-card-border
              dark:border-white/[0.08] dark:bg-[#0c0e18] dark:shadow-xl dark:shadow-black/40 dark:ring-white/[0.06]
              dark:hover:border-white/15 dark:hover:shadow-[0_28px_70px_-40px_rgba(0,0,0,0.75)]`;

    const interactiveExtras = onArtistSelect
      ? "w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background-rgb))] dark:focus-visible:ring-offset-slate-950"
      : "";

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {artists.slice(0, 3).map((artist, index) => {
          const body = (
            <>
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
                <div className="absolute inset-x-3 bottom-3 translate-y-5 rounded-3xl border border-white/80 bg-white/90 p-4 opacity-0 shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 dark:border-white/10 dark:bg-slate-950/80">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">
                        {artist.artistName}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-muted">
                        {artist.uniqueTracks.toLocaleString(locale)} {t("uniqueTracks")}
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
            </>
          );

          const styleDelay = { animationDelay: `${index * 80}ms` };

          if (onArtistSelect) {
            return (
              <button
                key={artist.artistId}
                type="button"
                className={`${cardShell} ${interactiveExtras}`}
                style={styleDelay}
                onClick={() => onArtistSelect(artist, index)}
                aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
              >
                {body}
              </button>
            );
          }

          return (
            <div key={artist.artistId} className={cardShell} style={styleDelay}>
              {body}
            </div>
          );
        })}
      </div>
    );
  }
);

TopThreeArtists.displayName = "TopThreeArtists";
