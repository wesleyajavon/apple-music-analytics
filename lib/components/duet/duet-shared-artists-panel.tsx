"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Crown, Swords, X } from "lucide-react";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import {
  DuetDualLineChart,
  EntityBattleScorecard,
} from "@/lib/components/duet/duet-entity-duel-blocks";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_LIME,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import type { PeriodType } from "@/lib/components/period-selector";
import { useTheme } from "@/lib/providers/theme-provider";
import { useDuetCompareEntity } from "@/lib/hooks/use-duet";
import type { CompareSharedArtistsResponse } from "@/lib/dto/duet";
import { ApiError } from "@/lib/api-client";

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
  friendUserId: string;
  friendName: string;
  viewerName: string;
  startDate?: string;
  endDate?: string;
  period: PeriodType;
  data?: CompareSharedArtistsResponse;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
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
        <span className={DASHBOARD_SPOTLIGHT_BADGE_LIME}>
          <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME} aria-hidden />
          {badge}
        </span>
      </div>
    </div>
  );
}

export function DuetSharedArtistsPanel({
  friendUserId,
  friendName,
  viewerName,
  startDate,
  endDate,
  period,
  data,
  isLoading,
  error,
  onRetry,
}: DuetSharedArtistsPanelProps) {
  const t = useTranslations("duet.compare");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];

  const [listExpanded, setListExpanded] = useState(false);
  const [selectedArtistId, setSelectedArtistId] = useState<string | undefined>();
  const [selectedArtistName, setSelectedArtistName] = useState("");

  const {
    data: artistCompare,
    isLoading: isArtistCompareLoading,
    isFetching: isArtistCompareFetching,
    error: artistCompareError,
    refetch: refetchArtistCompare,
  } = useDuetCompareEntity({
    friendUserId,
    type: "artist",
    entityId: selectedArtistId,
    startDate,
    endDate,
    period,
  });

  const artistChartData = useMemo(
    () =>
      artistCompare?.merged.map((row) => ({ date: row.date, self: row.self, friend: row.friend })) ?? [],
    [artistCompare]
  );

  const visibleArtists = useMemo(() => {
    if (!data?.artists.length) return [];
    if (listExpanded) return data.artists;

    const initial = data.artists.slice(0, VISIBLE_ARTISTS_COUNT);
    if (!selectedArtistId) return initial;

    const selected = data.artists.find((artist) => artist.artistId === selectedArtistId);
    if (!selected || initial.some((artist) => artist.artistId === selectedArtistId)) {
      return initial;
    }
    return [...initial, selected];
  }, [data?.artists, listExpanded, selectedArtistId]);

  const hiddenCount = Math.max(0, (data?.artists.length ?? 0) - VISIBLE_ARTISTS_COUNT);
  const hasMore = hiddenCount > 0;

  function handleArtistClick(artistId: string, artistName: string) {
    if (selectedArtistId === artistId) {
      setSelectedArtistId(undefined);
      setSelectedArtistName("");
      return;
    }
    setSelectedArtistId(artistId);
    setSelectedArtistName(artistName);
  }

  function handleCloseDuel() {
    setSelectedArtistId(undefined);
    setSelectedArtistName("");
  }

  const duelArtistName =
    artistCompare?.type === "artist" ? (artistCompare.artistName ?? selectedArtistName) : selectedArtistName;

  return (
    <section className={DASHBOARD_SPOTLIGHT_SHELL}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} />
      <SharedArtistsHeader
        eyebrow={t("sharedArtistsEyebrow")}
        title={t("sharedArtistsTitle", { friendName })}
        description={t("sharedArtistsDescription")}
        badge={t("sharedArtistsBadge")}
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
        ) : !data?.artists.length ? (
          <EmptyState
            variant="startup"
            message={t("sharedArtistsEmptyTitle")}
            description={t("sharedArtistsEmptyDescription")}
          />
        ) : (
          <>
            <ul className={`space-y-2 ${DASHBOARD_SPOTLIGHT_INNER_WELL} p-3 sm:p-4`}>
              {visibleArtists.map((artist, index) => {
                const isSelected = selectedArtistId === artist.artistId;
                return (
                  <li key={artist.artistId}>
                    <button
                      type="button"
                      onClick={() => handleArtistClick(artist.artistId, artist.artistName)}
                      aria-expanded={isSelected}
                      className={`group flex w-full gap-3 rounded-xl border px-3 py-3 text-left transition-all sm:items-start ${
                        isSelected
                          ? "border-lime-400/80 bg-lime-50/80 shadow-sm ring-2 ring-lime-300/40 dark:border-lime-400/40 dark:bg-lime-400/10 dark:ring-lime-400/20"
                          : "border-slate-200/80 bg-white/80 hover:border-lime-300/70 hover:bg-lime-50/50 hover:shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5"
                      }`}
                    >
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
                          className="h-14 w-14 object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{artist.artistName}</p>
                          <span
                            className={`hidden shrink-0 items-center gap-1 rounded-full border border-lime-200/80 bg-lime-50 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-widest text-lime-700 transition-opacity dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200 sm:inline-flex ${
                              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            <Swords className="h-3 w-3" aria-hidden />
                            {t("sharedArtistsDuelCta")}
                          </span>
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
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border border-lime-200/80 bg-lime-50 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-widest text-lime-700 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200 ${
                              isSelected ? "opacity-100" : "opacity-100"
                            }`}
                          >
                            <Swords className="h-3 w-3" aria-hidden />
                            {t("sharedArtistsDuelCta")}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
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

            {selectedArtistId ? (
              <div className={`space-y-4 ${DASHBOARD_SPOTLIGHT_INNER_WELL} p-4 sm:p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-lime-700 dark:text-lime-300">
                      {t("sharedArtistsDuelEyebrow")}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                      {t("artistChartTitle", { artistName: duelArtistName, friendName })}
                    </h3>
                    <p className={`mt-1 text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("artistChartDescription")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseDuel}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    aria-label={t("sharedArtistsCloseDuel")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {isArtistCompareLoading || isArtistCompareFetching ? (
                  <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("artistLoading")}</p>
                ) : artistCompareError ? (
                  artistCompareError instanceof ApiError &&
                  (artistCompareError.statusCode === 403 || artistCompareError.statusCode === 404) ? (
                    <EmptyState
                      variant="startup"
                      message={
                        artistCompareError.statusCode === 403
                          ? t("scopeInsufficientTitle")
                          : t("notFoundTitle")
                      }
                      description={
                        artistCompareError.statusCode === 403
                          ? t("scopeInsufficientDescription")
                          : t("notFoundDescription")
                      }
                    />
                  ) : (
                    <ErrorState
                      variant="startup"
                      error={artistCompareError}
                      message={t("artistError")}
                      onRetry={() => void refetchArtistCompare()}
                    />
                  )
                ) : artistCompare ? (
                  <div className="space-y-5">
                    <EntityBattleScorecard
                      selfCount={artistCompare.selfCount}
                      friendCount={artistCompare.friendCount}
                      viewerName={viewerName}
                      friendName={friendName}
                      winner={artistCompare.winner}
                      entityName={duelArtistName}
                      arenaMode="artist"
                      locale={locale}
                      t={t}
                    />

                    {artistCompare.rangeClamped ? (
                      <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("rangeClamped")}</p>
                    ) : null}

                    {artistChartData.length === 0 ? (
                      <EmptyState
                        variant="startup"
                        message={t("artistNoDataTitle")}
                        description={t("artistNoDataDescription")}
                      />
                    ) : (
                      <DuetDualLineChart
                        data={artistChartData}
                        chartTheme={chartTheme}
                        resolvedTheme={resolvedTheme}
                        selfLabel={t("seriesSelf")}
                        friendLabel={t("seriesFriend", { friendName })}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
