"use client";

import { memo } from "react";
import type { ArtistStatsDto } from "@/lib/dto/artist";

const AVATAR_BG_COLORS = [
  "8b5cf6", "ec4899", "6366f1", "06b6d4", "10b981", "f59e0b", "ef4444", "a855f7",
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

type TopThreeArtistsT = (k: string) => string;

/**
 * Top 3 – grandes cartes hero style Apple Music Replay
 */
export const TopThreeArtists = memo(
  ({
    artists,
    maxListens,
    t,
    locale,
  }: {
    artists: ArtistStatsDto[];
    maxListens: number;
    t: TopThreeArtistsT;
    locale: string;
  }) => {
    const gradientByRank = [
      "from-violet-500 via-purple-500 to-fuchsia-500",
      "from-pink-500 via-rose-500 to-red-400",
      "from-indigo-500 via-violet-500 to-purple-500",
    ];

    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {artists.slice(0, 3).map((artist, index) => {
          const progress = maxListens > 0 ? (artist.listenCount / maxListens) * 100 : 0;
          return (
            <div
              key={artist.artistId}
              className="group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-800/90
              shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradientByRank[index]} opacity-10 group-hover:opacity-20 transition-opacity`}
              />
              <div className="relative p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div
                      className="overflow-hidden rounded-full ring-4 ring-white/50 dark:ring-gray-700/50 shadow-2xl"
                      style={{ width: 120, height: 120 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getArtistImageUrl(artist, 240, index)}
                        alt={artist.artistName}
                        width={120}
                        height={120}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = getAvatarUrl(artist.artistName, 240, index);
                        }}
                      />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 dark:bg-white text-lg font-black text-white dark:text-gray-900 shadow-lg">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate w-full">
                    {artist.artistName}
                  </h3>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-accent-violet to-accent-pink">
                    {artist.listenCount.toLocaleString(locale)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("listensCount")}</p>
                  <div className="mt-3 w-full max-w-[180px] h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-pink transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

TopThreeArtists.displayName = "TopThreeArtists";
