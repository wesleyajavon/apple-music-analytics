"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Crown, Swords, X } from "lucide-react";
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
              {visibleArtists.map((artist) => {
                const isSelected = selectedArtistId === artist.artistId;
                return (
                  <li key={artist.artistId}>
                    <button
                      type="button"
                      onClick={() => handleArtistClick(artist.artistId, artist.artistName)}
                      aria-expanded={isSelected}
                      className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                        isSelected
                          ? "border-lime-400/80 bg-lime-50/80 shadow-sm ring-2 ring-lime-300/40 dark:border-lime-400/40 dark:bg-lime-400/10 dark:ring-lime-400/20"
                          : "border-slate-200/80 bg-white/80 hover:border-lime-300/70 hover:bg-lime-50/50 hover:shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:hover:border-lime-400/30 dark:hover:bg-lime-400/5"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{artist.artistName}</p>
                        <p className={`mt-1 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                          {t("sharedArtistsCounts", {
                            self: artist.selfCount,
                            friend: artist.friendCount,
                            friendName,
                          })}
                        </p>
                        <p className={`mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                          {t("sharedArtistsRanks", {
                            selfRank: artist.selfRank,
                            friendRank: artist.friendRank,
                            friendName,
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {artist.winner === "self" ? (
                          <Crown className="h-4 w-4 text-lime-600 dark:text-lime-300" aria-hidden />
                        ) : artist.winner === "friend" ? (
                          <Crown className="h-4 w-4 text-cyan-500 dark:text-cyan-300" aria-hidden />
                        ) : null}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border border-lime-200/80 bg-lime-50 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-widest text-lime-700 transition-opacity dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200 ${
                            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Swords className="h-3 w-3" aria-hidden />
                          {t("sharedArtistsDuelCta")}
                        </span>
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
