"use client";

import { memo } from "react";
import type { ArtistStatsDto } from "@/lib/dto/artist";

const AVATAR_BG_COLORS = [
  "6d28d9", "059669", "d97706", "be123c", "7c2d12", "4d7c0f", "9333ea", "64748b",
];

export function getAvatarUrl(artistName: string, size: number, colorIndex: number = 0): string {
  const bg = AVATAR_BG_COLORS[colorIndex % AVATAR_BG_COLORS.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&size=${size}&background=${bg}&color=fff&bold=true`;
}

/** URL d'image : imageUrl en base si présente, sinon avatar par initiales */
export function getArtistImageUrl(artist: ArtistStatsDto, size: number, colorIndex: number = 0): string {
  if (artist.imageUrl?.trim()) return artist.imageUrl;
  return getAvatarUrl(artist.artistName, size, colorIndex);
}

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
    const gradientByRank = [
      "from-violet-500 via-cyan-400 to-lime-300",
      "from-fuchsia-500 via-violet-500 to-cyan-300",
      "from-cyan-400 via-teal-400 to-orange-300",
    ];

    const cardShell =
      `group relative overflow-hidden rounded-3xl bg-gray-900
              shadow-xl shadow-cyan-950/10 hover:shadow-2xl hover:shadow-violet-950/20 transition-all duration-300 hover:-translate-y-1
              opacity-0 animate-fade-in-up ring-1 ring-white/10`;

    const interactiveExtras = onArtistSelect
      ? "w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background-rgb))] dark:focus-visible:ring-offset-slate-950"
      : "";

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {artists.slice(0, 3).map((artist, index) => {
          const progress = maxListens > 0 ? (artist.listenCount / maxListens) * 100 : 0;
          const body = (
            <>
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getArtistImageUrl(artist, 640, index)}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = getAvatarUrl(artist.artistName, 640, index);
                  }}
                />
              </div>
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradientByRank[index]} opacity-[0.18] mix-blend-overlay transition-opacity group-hover:opacity-25`}
                aria-hidden
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25"
                aria-hidden
              />
              <div className="relative z-10 flex min-h-[280px] flex-col justify-end p-6 pt-16 sm:min-h-[300px]">
                <span className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-gray-900 shadow-lg ring-2 ring-black/20">
                  {index + 1}
                </span>
                <div>
                  <h3 className="truncate text-xl font-bold text-white drop-shadow-sm">
                    {artist.artistName}
                  </h3>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-white drop-shadow-md">
                    {artist.listenCount.toLocaleString(locale)}
                  </p>
                  <p className="text-sm text-white/75">{t("listensCount")}</p>
                  <div className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                    {artist.uniqueTracks.toLocaleString(locale)} {t("uniqueTracks")}
                  </div>
                  <div className="mt-4 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-white/95 via-cyan-100/85 to-lime-100/70 transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
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
