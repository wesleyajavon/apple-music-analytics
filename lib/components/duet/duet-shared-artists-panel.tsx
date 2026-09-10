"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Crown, Search } from "lucide-react";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { DuetSharedArtistsEmpty } from "@/lib/components/duet/duet-shared-artists-empty";
import { ErrorState } from "@/lib/components/error-state";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import type { CompareSharedArtistsResponse } from "@/lib/dto/duet";

const VISIBLE_ARTISTS_COUNT = 5;

type SharedArtistStatChipProps = {
  label: string;
  listenCount: number;
  rankLabel: string;
  listensLabel: string;
  isWinner: boolean;
  locale: string;
};

function SharedArtistStatChip({
  label,
  listenCount,
  rankLabel,
  listensLabel,
  isWinner,
  locale,
}: SharedArtistStatChipProps) {
  return (
    <div className="relative min-w-0 border-r border-glass-hairline px-2.5 py-1 last:border-r-0 first:pl-0 last:pr-0">
      {isWinner ? (
        <Crown className="absolute right-1 top-1 h-3 w-3 text-muted" aria-hidden />
      ) : null}
      <p className="truncate pr-4 text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums leading-none text-foreground">
        {listenCount.toLocaleString(locale)}
        <span className="ml-1 text-[13px] font-medium text-muted">{listensLabel}</span>
      </p>
      <p className="mt-1 text-[13px] font-medium leading-snug text-muted">{rankLabel}</p>
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
  totalLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  totalLabel?: string;
}) {
  return (
    <div className="pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
          <h2 className={`mt-1 ${DASHBOARD_SECTION_TITLE}`}>{title}</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
          {totalLabel ? (
            <p className="mt-2 text-[13px] font-medium text-muted">{totalLabel}</p>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-glass-hairline px-2.5 py-1 text-[13px] font-medium text-muted">
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
    <section>
      <SharedArtistsHeader
        eyebrow={t("sharedArtistsEyebrow")}
        title={t("sharedArtistsTitle", { friendName })}
        description={t("sharedArtistsDescription")}
        badge={isEmpty ? t("sharedArtistsEmptyEyebrow") : t("sharedArtistsBadge")}
        totalLabel={
          data && data.totalShared > 0
            ? t("sharedArtistsTotal", { count: data.totalShared })
            : undefined
        }
      />
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-[13px] text-muted">{t("sharedArtistsLoading")}</p>
        ) : error ? (
          <ErrorState variant="startup" error={error} message={t("sharedArtistsError")} onRetry={onRetry} />
        ) : !data || data.artists.length === 0 ? (
          <DuetSharedArtistsEmpty
            className="py-8"
            eyebrow={t("sharedArtistsEmptyEyebrow")}
            title={t("sharedArtistsEmptyTitle")}
            description={t("sharedArtistsEmptyDescription")}
          />
        ) : (
          <>
            <ul>
              {visibleArtists.map((artist, index) => (
                <li key={artist.artistId}>
                  <div
                    className={`group flex w-full gap-3 py-3 sm:items-start ${DASHBOARD_LIST_SEPARATOR}`}
                  >
                    <div className="relative shrink-0 self-start overflow-hidden rounded-xl">
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
                        <p className="truncate font-semibold text-foreground">{artist.artistName}</p>
                        <button
                          type="button"
                          onClick={() => onCompareArtist(artist.artistId, artist.artistName)}
                          className={`${DASHBOARD_BTN_GHOST} hidden min-h-11 shrink-0 gap-1.5 px-3 text-[13px] sm:inline-flex`}
                        >
                          <Search className="h-3.5 w-3.5" aria-hidden />
                          {t("sharedArtistsDuelCta")}
                        </button>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2">
                        <SharedArtistStatChip
                          label={t("seriesSelf")}
                          listenCount={artist.selfCount}
                          listensLabel={t("sharedArtistsListens")}
                          rankLabel={t("sharedArtistsTop50RankSelf", {
                            rank: artist.selfRank,
                            topPool: data.topPool,
                          })}
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
                          isWinner={artist.winner === "friend"}
                          locale={locale}
                        />
                      </div>
                      <div className="mt-2.5 flex justify-end sm:hidden">
                        <button
                          type="button"
                          onClick={() => onCompareArtist(artist.artistId, artist.artistName)}
                          className={`${DASHBOARD_BTN_GHOST} min-h-11 gap-1.5 px-3 text-[13px]`}
                        >
                          <Search className="h-3.5 w-3.5" aria-hidden />
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
                className={`${DASHBOARD_BTN_GHOST} w-full min-h-11 gap-2 text-[13px]`}
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
