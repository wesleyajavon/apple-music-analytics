"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Crown, Search } from "lucide-react";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { DuetSharedArtistsEmpty } from "@/lib/components/duet/duet-shared-artists-empty";
import { ErrorState } from "@/lib/components/error-state";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_LIME,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME,
  DASHBOARD_SPOTLIGHT_PILL_MUTED,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
} from "@/lib/constants/dashboard-spotlight";
import type { CompareSharedArtistsResponse } from "@/lib/dto/duet";

const VISIBLE_ARTISTS_COUNT = 5;

type SharedArtistStatChipProps = {
  label: string;
  listenCount: number;
  rankLabel: string;
  listensLabel: string;
  variant: "self" | "friend";
  isWinner: boolean;
  locale: string;
};

function SharedArtistStatChip({
  label,
  listenCount,
  rankLabel,
  listensLabel,
  variant,
  isWinner,
  locale,
}: SharedArtistStatChipProps) {
  const isSelf = variant === "self";

  return (
    <div
      className={`relative rounded-lg border px-2.5 py-2 transition-colors ${
        isSelf
          ? "border-violet-200/80 bg-violet-50/70 dark:border-violet-400/25 dark:bg-violet-400/10"
          : "border-cyan-200/80 bg-cyan-50/70 dark:border-cyan-400/25 dark:bg-cyan-400/10"
      } ${isWinner ? "ring-1 ring-amber-400/60 dark:ring-amber-400/40" : ""}`}
    >
      {isWinner ? (
        <Crown
          className="absolute right-2 top-2 h-3 w-3 text-amber-500 dark:text-amber-300"
          aria-hidden
        />
      ) : null}
      <p
        className={`truncate pr-4 text-[0.65rem] font-semibold uppercase tracking-wider ${
          isSelf ? "text-violet-700 dark:text-violet-200" : "text-cyan-700 dark:text-cyan-200"
        }`}
      >
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums leading-none text-slate-900 dark:text-white">
        {listenCount.toLocaleString(locale)}
        <span className={`ml-1 text-[0.65rem] font-medium normal-case tracking-normal ${DASHBOARD_SPOTLIGHT_MUTED}`}>
          {listensLabel}
        </span>
      </p>
      <p
        className={`mt-1 text-[0.65rem] font-medium leading-snug ${
          isSelf ? "text-violet-600/90 dark:text-violet-300/90" : "text-cyan-600/90 dark:text-cyan-300/90"
        }`}
      >
        {rankLabel}
      </p>
    </div>
  );
}

type DuetSharedArtistsPanelProps = {
  friendName: string;
  data?: CompareSharedArtistsResponse;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onCompareArtist: (artistId: string, artistName: string) => void;
};

function SharedArtistsHeader({
  eyebrow,
  title,
  description,
  badge,
  badgeMuted = false,
  totalLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  badgeMuted?: boolean;
  totalLabel?: string;
}) {
  return (
    <div className={`relative px-5 pb-5 pt-6 sm:px-8 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{description}</p>
          {totalLabel ? (
            <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.14em] ${DASHBOARD_SPOTLIGHT_MUTED}`}>
              {totalLabel}
            </p>
          ) : null}
        </div>
        <span className={badgeMuted ? DASHBOARD_SPOTLIGHT_PILL_MUTED : DASHBOARD_SPOTLIGHT_BADGE_LIME}>
          {badgeMuted ? null : <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME} aria-hidden />}
          {badge}
        </span>
      </div>
    </div>
  );
}

export function DuetSharedArtistsPanel({
  friendName,
  data,
  isLoading,
  error,
  onRetry,
  onCompareArtist,
}: DuetSharedArtistsPanelProps) {
  const t = useTranslations("duet.compare");
  const locale = useLocale();
  const [listExpanded, setListExpanded] = useState(false);

  const visibleArtists = useMemo(() => {
    if (!data?.artists.length) return [];
    if (listExpanded) return data.artists;
    return data.artists.slice(0, VISIBLE_ARTISTS_COUNT);
  }, [data?.artists, listExpanded]);

  const hiddenCount = Math.max(0, (data?.artists.length ?? 0) - VISIBLE_ARTISTS_COUNT);
  const hasMore = hiddenCount > 0;
  const isEmpty = !isLoading && !error && !data?.artists.length;

  return (
    <section className={DASHBOARD_SPOTLIGHT_SHELL}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} />
      <SharedArtistsHeader
        eyebrow={t("sharedArtistsEyebrow")}
        title={t("sharedArtistsTitle", { friendName })}
        description={t("sharedArtistsDescription")}
        badge={isEmpty ? t("sharedArtistsEmptyEyebrow") : t("sharedArtistsBadge")}
        badgeMuted={isEmpty}
        totalLabel={
          data && data.totalShared > 0
            ? t("sharedArtistsTotal", { count: data.totalShared })
            : undefined
        }
      />
      <div className="space-y-4 px-5 pb-6 sm:px-8">
        {isLoading ? (
          <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("sharedArtistsLoading")}</p>
        ) : error ? (
          <ErrorState variant="startup" error={error} message={t("sharedArtistsError")} onRetry={onRetry} />
        ) : !data || data.artists.length === 0 ? (
          <DuetSharedArtistsEmpty
            className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} px-5 py-10 sm:px-8 sm:py-12`}
            eyebrow={t("sharedArtistsEmptyEyebrow")}
            title={t("sharedArtistsEmptyTitle")}
            description={t("sharedArtistsEmptyDescription")}
          />
        ) : (
          <>
            <ul className={`space-y-2 ${DASHBOARD_SPOTLIGHT_INNER_WELL} p-3 sm:p-4`}>
              {visibleArtists.map((artist, index) => (
                <li key={artist.artistId}>
                  <div className="group flex w-full gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 transition-all sm:items-start dark:border-white/10 dark:bg-slate-950/40">
                    <div className="relative shrink-0 self-start overflow-hidden rounded-xl ring-1 ring-slate-200/90 shadow-sm dark:ring-white/10">
                      <ArtistAvatarHydrated
                        artistId={artist.artistId}
                        artistName={artist.artistName}
                        imageUrl={artist.imageUrl}
                        avatarApiSize={112}
                        colorIndex={index}
                        alt=""
                        width={56}
                        height={56}
                        className="h-14 w-14 object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{artist.artistName}</p>
                        <button
                          type="button"
                          onClick={() => onCompareArtist(artist.artistId, artist.artistName)}
                          className="hidden shrink-0 items-center gap-1 rounded-full border border-lime-200/80 bg-lime-50 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-widest text-lime-700 transition-colors hover:border-lime-300 hover:bg-lime-100 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200 dark:hover:bg-lime-400/15 sm:inline-flex"
                        >
                          <Search className="h-3 w-3" aria-hidden />
                          {t("sharedArtistsDuelCta")}
                        </button>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <SharedArtistStatChip
                          label={t("seriesSelf")}
                          listenCount={artist.selfCount}
                          listensLabel={t("sharedArtistsListens")}
                          rankLabel={t("sharedArtistsTop50RankSelf", {
                            rank: artist.selfRank,
                            topPool: data.topPool,
                          })}
                          variant="self"
                          isWinner={artist.winner === "self"}
                          locale={locale}
                        />
                        <SharedArtistStatChip
                          label={friendName}
                          listenCount={artist.friendCount}
                          listensLabel={t("sharedArtistsListens")}
                          rankLabel={t("sharedArtistsTop50RankFriend", {
                            rank: artist.friendRank,
                            friendName,
                            topPool: data.topPool,
                          })}
                          variant="friend"
                          isWinner={artist.winner === "friend"}
                          locale={locale}
                        />
                      </div>
                      <div className="mt-2.5 flex justify-end sm:hidden">
                        <button
                          type="button"
                          onClick={() => onCompareArtist(artist.artistId, artist.artistName)}
                          className="inline-flex items-center gap-1 rounded-full border border-lime-200/80 bg-lime-50 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-widest text-lime-700 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200"
                        >
                          <Search className="h-3 w-3" aria-hidden />
                          {t("sharedArtistsDuelCta")}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {hasMore ? (
              <button
                type="button"
                onClick={() => setListExpanded((prev) => !prev)}
                aria-expanded={listExpanded}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-lime-300/50 bg-lime-50/30 px-4 py-3 text-sm font-semibold text-lime-800 transition-colors hover:border-lime-400/60 hover:bg-lime-50/60 dark:border-lime-400/25 dark:bg-lime-400/5 dark:text-lime-200 dark:hover:bg-lime-400/10"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${listExpanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
                {listExpanded
                  ? t("sharedArtistsShowLess")
                  : t("sharedArtistsShowMore", { count: hiddenCount })}
              </button>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
