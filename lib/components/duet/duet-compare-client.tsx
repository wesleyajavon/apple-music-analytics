"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Crown, Download, Search, Share2, Swords, Trophy, X } from "lucide-react";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { PeriodSelector, getPeriodFromSearchParams } from "@/lib/components/period-selector";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DuetMetadataBanner } from "@/lib/components/duet/duet-metadata-banner";
import { DuetCompareHero } from "@/lib/components/duet/duet-compare-hero";
import {
  DuetArenaModePicker,
  DuetArenaModeToggle,
  downloadDuetBattleImage,
  shareDuetBattleResult,
  type DuetArenaMode,
} from "@/lib/components/duet/duet-battle-arena-ui";
import { generateDuetBattleSharePng } from "@/lib/utils/duet-battle-share-image";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_LIME,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { useTheme } from "@/lib/providers/theme-provider";
import {
  useDuetCompareEntity,
  useDuetCompareMetadata,
  useDuetCompareTimeline,
  useDuetFriends,
} from "@/lib/hooks/use-duet";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useArtistSearch } from "@/lib/hooks/use-artists";
import { useTrackSearch } from "@/lib/hooks/use-tracks";
import type { CompareEntityResponse } from "@/lib/dto/duet";
import { ApiError } from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type DualLineChartPoint = { date: string; self: number; friend: number };

type ViewerProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

function DuetDualLineChart({
  data,
  chartTheme,
  resolvedTheme,
  selfLabel,
  friendLabel,
}: {
  data: DualLineChartPoint[];
  chartTheme: (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
  resolvedTheme: string;
  selfLabel: string;
  friendLabel: string;
}) {
  return (
    <ChartResponsiveContainer token="trendsLine">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 12 }} stroke={chartTheme.axisStroke} />
        <YAxis tick={{ fill: chartTheme.tick, fontSize: 12 }} stroke={chartTheme.axisStroke} />
        <Tooltip
          contentStyle={{
            backgroundColor: resolvedTheme === "dark" ? "#0f172a" : "#fff",
            border: `1px solid ${chartTheme.grid}`,
            borderRadius: 12,
          }}
        />
        <Legend wrapperStyle={{ color: chartTheme.legend }} />
        <Line type="monotone" dataKey="self" name={selfLabel} stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="friend" name={friendLabel} stroke="#22d3ee" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ChartResponsiveContainer>
  );
}

function SpotlightSectionHeader({
  eyebrow,
  title,
  description,
  badge,
  badgeVariant = "violet",
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  badgeVariant?: "violet" | "lime";
  action?: ReactNode;
}) {
  const badgeClass = badgeVariant === "lime" ? DASHBOARD_SPOTLIGHT_BADGE_LIME : DASHBOARD_SPOTLIGHT_BADGE_VIOLET;
  const dotClass = badgeVariant === "lime" ? DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME : DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET;

  return (
    <div className={`relative px-5 pb-5 pt-6 sm:px-8 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <span className={badgeClass}>
            <span className={dotClass} aria-hidden />
            {badge}
          </span>
          {action}
        </div>
      </div>
    </div>
  );
}

function EntityBattleScorecard({
  selfCount,
  friendCount,
  viewerName,
  friendName,
  winner,
  entityName,
  entitySubtitle,
  arenaMode,
  locale,
  t,
}: {
  selfCount: number;
  friendCount: number;
  viewerName: string;
  friendName: string;
  winner: "self" | "friend" | "tie";
  entityName: string;
  entitySubtitle?: string;
  arenaMode: DuetArenaMode;
  locale: string;
  t: ReturnType<typeof useTranslations<"duet.compare">>;
}) {
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"share" | "download" | null>(null);
  const total = selfCount + friendCount;
  const selfPct = total > 0 ? (selfCount / total) * 100 : 50;
  const friendPct = total > 0 ? 100 - selfPct : 50;
  const canShare = total > 0;

  const winnerLabel =
    winner === "tie"
      ? t("battleTie")
      : winner === "self"
        ? t("battleWinnerSelf")
        : t("battleWinnerFriend", { friendName });

  async function buildShareImageBlob() {
    const arenaLabel = arenaMode === "artist" ? t("shareArenaArtist") : t("shareArenaTrack");
    return generateDuetBattleSharePng({
      arenaLabel,
      entityName,
      entitySubtitle,
      viewerName,
      friendName,
      selfCount,
      friendCount,
      winner,
      winnerHeadline: winnerLabel,
      selfLabel: t("seriesSelf"),
      friendLabel: t("seriesFriend", { friendName }),
      brandName: t("shareBrandName"),
      brandTagline: t("shareBrandTagline"),
    });
  }

  function buildShareCaption() {
    const outcome =
      winner === "tie"
        ? t("shareOutcomeTie", { friendName })
        : winner === "self"
          ? t("shareOutcomeSelf")
          : t("shareOutcomeFriend", { friendName });
    const arenaLabel = arenaMode === "artist" ? t("shareArenaArtist") : t("shareArenaTrack");
    return t("shareBattleText", {
      arenaLabel,
      entityName,
      selfCount: selfCount.toLocaleString(locale),
      friendName,
      friendCount: friendCount.toLocaleString(locale),
      outcome,
    });
  }

  async function handleShare() {
    setBusyAction("share");
    setShareFeedback(t("shareImagePreparing"));

    try {
      const imageBlob = await buildShareImageBlob();
      const text = buildShareCaption();
      const result = await shareDuetBattleResult(text, imageBlob);
      const feedback =
        result === "shared-image"
          ? t("shareImageShared")
          : result === "shared-text"
            ? t("shareShared")
            : t("shareCopied");
      setShareFeedback(feedback);
      window.setTimeout(() => setShareFeedback(null), 3200);
    } catch {
      setShareFeedback(null);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownload() {
    setBusyAction("download");
    setDownloadFeedback(t("shareImagePreparing"));

    try {
      const imageBlob = await buildShareImageBlob();
      downloadDuetBattleImage(imageBlob);
      setDownloadFeedback(t("shareImageSaved"));
      window.setTimeout(() => setDownloadFeedback(null), 3200);
    } catch {
      setDownloadFeedback(null);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <motion.div
      key={`${winner}-${selfCount}-${friendCount}`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/60 p-5 shadow-inner dark:border-white/10 dark:from-violet-950/40 dark:via-slate-950/60 dark:to-cyan-950/30"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl dark:bg-violet-400/20" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl dark:bg-cyan-400/15" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={winner !== "tie" ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
          >
            {winner === "tie" ? <Swords className="h-5 w-5" aria-hidden /> : <Trophy className="h-5 w-5" aria-hidden />}
          </motion.div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {entityName}
            </p>
            {entitySubtitle ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entitySubtitle}</p>
            ) : null}
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{winnerLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {winner !== "tie" ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
              <Crown className="h-3.5 w-3.5" aria-hidden />
              {winner === "self" ? t("seriesSelf") : friendName}
            </span>
          ) : null}
          {canShare ? (
            <>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleShare()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-violet-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {shareFeedback ?? t("shareBattleImage")}
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleDownload()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {downloadFeedback ?? t("downloadBattleImage")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-violet-200/70 bg-white/80 p-3 dark:border-violet-400/20 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-200">
            {t("seriesSelf")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {selfCount.toLocaleString(locale)}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-200/70 bg-white/80 p-3 dark:border-cyan-400/20 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-200">
            {t("seriesFriend", { friendName })}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {friendCount.toLocaleString(locale)}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex h-4 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
        <div
          className="bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
          style={{ width: `${selfPct}%` }}
        />
        <div
          className="bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all duration-700"
          style={{ width: `${friendPct}%` }}
        />
      </div>
    </motion.div>
  );
}

type EntitySuggestion = { id: string; label: string; subtitle?: string };

function EntityHeadToHeadPanel({
  searchPlaceholder,
  clearLabel,
  loadingLabel,
  errorLabel,
  chartTitle,
  chartDescription,
  noDataTitle,
  noDataDescription,
  query,
  onQueryChange,
  selectedEntityId,
  onSelectEntity,
  onClear,
  suggestions,
  showSuggestions,
  entityCompare,
  isEntityLoading,
  isEntityFetching,
  entityError,
  refetchEntity,
  chartData,
  entityDisplayName,
  entitySubtitle,
  arenaMode,
  viewerName,
  friendName,
  locale,
  t,
  chartTheme,
  resolvedTheme,
}: {
  searchPlaceholder: string;
  clearLabel: string;
  loadingLabel: string;
  errorLabel: string;
  chartTitle: string;
  chartDescription: string;
  noDataTitle: string;
  noDataDescription: string;
  query: string;
  onQueryChange: (value: string) => void;
  selectedEntityId?: string;
  onSelectEntity: (id: string, label: string) => void;
  onClear: () => void;
  suggestions: EntitySuggestion[];
  showSuggestions: boolean;
  entityCompare?: CompareEntityResponse;
  isEntityLoading: boolean;
  isEntityFetching: boolean;
  entityError: Error | null;
  refetchEntity: () => void;
  chartData: DualLineChartPoint[];
  entityDisplayName: string;
  entitySubtitle?: string;
  arenaMode: DuetArenaMode;
  viewerName: string;
  friendName: string;
  locale: string;
  t: ReturnType<typeof useTranslations<"duet.compare">>;
  chartTheme: (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
  resolvedTheme: string;
}) {
  return (
    <div className="space-y-4">
      <div className={`relative ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
        <Search
          className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-10"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200/60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:border-violet-400/40 dark:focus:ring-violet-400/20"
        />
        {selectedEntityId || query ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 sm:right-10"
            aria-label={clearLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <ul className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          {suggestions.map((item) => (
            <li key={item.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
              <button
                type="button"
                onClick={() => onSelectEntity(item.id, item.label)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10"
              >
                <span className="flex items-center gap-3 font-medium text-slate-900 dark:text-white">
                  <Swords className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-300" aria-hidden />
                  {item.label}
                </span>
                {item.subtitle ? (
                  <span className="pl-7 text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedEntityId && (isEntityLoading || isEntityFetching) ? (
        <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{loadingLabel}</p>
      ) : null}

      {selectedEntityId && entityError ? (
        entityError instanceof ApiError &&
        (entityError.statusCode === 403 || entityError.statusCode === 404) ? (
          <EmptyState
            variant="startup"
            message={
              entityError.statusCode === 403 ? t("scopeInsufficientTitle") : t("notFoundTitle")
            }
            description={
              entityError.statusCode === 403
                ? t("scopeInsufficientDescription")
                : t("notFoundDescription")
            }
          />
        ) : (
          <ErrorState
            variant="startup"
            error={entityError}
            message={errorLabel}
            onRetry={() => refetchEntity()}
          />
        )
      ) : null}

      {selectedEntityId && entityCompare && !isEntityLoading && !isEntityFetching && !entityError ? (
        <div className="space-y-5">
          <EntityBattleScorecard
            selfCount={entityCompare.selfCount}
            friendCount={entityCompare.friendCount}
            viewerName={viewerName}
            friendName={friendName}
            winner={entityCompare.winner}
            entityName={entityDisplayName}
            entitySubtitle={entitySubtitle}
            arenaMode={arenaMode}
            locale={locale}
            t={t}
          />

          {entityCompare.rangeClamped ? (
            <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("rangeClamped")}</p>
          ) : null}

          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{chartTitle}</h3>
            <p className={`mt-1 text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{chartDescription}</p>
          </div>

          {chartData.length === 0 ? (
            <EmptyState variant="startup" message={noDataTitle} description={noDataDescription} />
          ) : (
            <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
              <DuetDualLineChart
                data={chartData}
                chartTheme={chartTheme}
                resolvedTheme={resolvedTheme}
                selfLabel={t("seriesSelf")}
                friendLabel={t("seriesFriend", { friendName })}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CompareContent() {
  const t = useTranslations("duet.compare");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];

  const friendUserId = searchParams.get("friendUserId") ?? undefined;
  const { startDate: filterStartDate, endDate: filterEndDate, isAll, isLoading: isRangeLoading } =
    useListenDateRange();
  const startDate = isAll ? undefined : filterStartDate;
  const endDate = isAll ? undefined : filterEndDate;
  const period = getPeriodFromSearchParams(searchParams, "month");

  const { data: friendsData, isLoading: friendsLoading } = useDuetFriends();
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);

  useEffect(() => {
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(async ({ data: auth }) => {
        const userId = auth.user?.id ?? null;
        if (!userId) {
          setViewer(null);
          return;
        }
        try {
          const res = await fetch("/api/user/me", { credentials: "same-origin" });
          if (res.ok) {
            const data = (await res.json()) as { name?: string | null; avatarUrl?: string | null };
            setViewer({
              id: userId,
              name: data.name?.trim() || t("seriesSelf"),
              avatarUrl: data.avatarUrl ?? null,
            });
          } else {
            setViewer({ id: userId, name: t("seriesSelf"), avatarUrl: null });
          }
        } catch {
          setViewer({ id: userId, name: t("seriesSelf"), avatarUrl: null });
        }
      });
  }, [t]);

  const { data: timeline, isLoading, error, refetch } = useDuetCompareTimeline({
    friendUserId,
    startDate,
    endDate,
    period,
  });
  const { data: metadata } = useDuetCompareMetadata(friendUserId);

  const [arenaMode, setArenaMode] = useState<DuetArenaMode | null>(null);
  const [artistQuery, setArtistQuery] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState<string | undefined>();
  const { data: artistResults } = useArtistSearch(artistQuery);
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

  const [trackQuery, setTrackQuery] = useState("");
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>();
  const { data: trackResults } = useTrackSearch(trackQuery);
  const {
    data: trackCompare,
    isLoading: isTrackCompareLoading,
    isFetching: isTrackCompareFetching,
    error: trackCompareError,
    refetch: refetchTrackCompare,
  } = useDuetCompareEntity({
    friendUserId,
    type: "track",
    entityId: selectedTrackId,
    startDate,
    endDate,
    period,
  });

  const showArtistSuggestions =
    !!artistResults?.artists?.length && artistQuery.trim().length >= 2 && !selectedArtistId;
  const showTrackSuggestions =
    !!trackResults?.tracks?.length && trackQuery.trim().length >= 2 && !selectedTrackId;

  const friend = useMemo(() => {
    if (!friendUserId || !friendsData) return null;
    return friendsData.friends.find(
      (f) => f.requester.id === friendUserId || f.addressee.id === friendUserId
    );
  }, [friendUserId, friendsData]);

  const friendUser = friend
    ? friend.requester.id === friendUserId
      ? friend.requester
      : friend.addressee
    : null;
  const friendName = friendUser ? getDuetDisplayName(friendUser) : t("friendFallback");

  const chartData = useMemo(
    () => timeline?.merged.map((row) => ({ date: row.date, self: row.self, friend: row.friend })) ?? [],
    [timeline]
  );

  const artistChartData = useMemo(
    () =>
      artistCompare?.merged.map((row) => ({ date: row.date, self: row.self, friend: row.friend })) ?? [],
    [artistCompare]
  );

  const trackChartData = useMemo(
    () =>
      trackCompare?.merged.map((row) => ({ date: row.date, self: row.self, friend: row.friend })) ?? [],
    [trackCompare]
  );

  const periodTotals = useMemo(() => {
    const selfTotal = chartData.reduce((sum, row) => sum + row.self, 0);
    const friendTotal = chartData.reduce((sum, row) => sum + row.friend, 0);
    return { selfTotal, friendTotal };
  }, [chartData]);

  const selectedArtistName =
    artistCompare?.type === "artist" ? (artistCompare.artistName ?? artistQuery) : artistQuery;
  const selectedTrackName =
    trackCompare?.type === "track" ? (trackCompare.trackTitle ?? trackQuery) : trackQuery;
  const selectedTrackArtistName =
    trackCompare?.type === "track" ? trackCompare.artistName : undefined;

  if (!friendUserId) {
    if (friendsLoading || viewer === null) {
      return (
        <div className="space-y-6">
          <DuetCompareHero mode="picker" viewerName={t("seriesSelf")} locale={locale} />
          <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("loading")}</p>
        </div>
      );
    }

    const acceptedFriends = friendsData?.friends ?? [];

    return (
      <div className="space-y-8">
        <DuetCompareHero
          mode="picker"
          viewerName={viewer.name}
          viewerAvatar={viewer.avatarUrl}
          locale={locale}
          stats={
            acceptedFriends.length > 0 ? (
              <p className="pt-4 text-sm leading-6 text-white/75">
                {t("pickerReadyCount", { count: acceptedFriends.length })}
              </p>
            ) : undefined
          }
        />

        {acceptedFriends.length === 0 ? (
          <EmptyState
            variant="startup"
            message={t("selectFriendTitle")}
            description={t("selectFriendDescription")}
            actions={[{ label: t("goToFriends"), href: "/dashboard/duet/friends" }]}
          />
        ) : (
          <section className={DASHBOARD_SPOTLIGHT_SHELL}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
            <SpotlightSectionHeader
              eyebrow={t("pickerEyebrow")}
              title={t("selectFriendTitle")}
              description={t("selectFriendDescription")}
              badge={t("pickerBadge")}
            />
            <div className="grid gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
              {acceptedFriends.map((friendship, index) => {
                const peer =
                  friendship.requester.id === viewer.id
                    ? friendship.addressee
                    : friendship.requester;
                const displayName = getDuetDisplayName(peer);
                return (
                  <motion.div
                    key={friendship.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link
                      href={`/dashboard/duet/compare?friendUserId=${encodeURIComponent(peer.id)}`}
                      className="group relative flex min-h-[9.5rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/60 hover:shadow-lg hover:shadow-violet-500/10 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-violet-400/30"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/0 via-transparent to-cyan-500/0 opacity-0 transition-opacity duration-300 group-hover:from-violet-500/5 group-hover:to-cyan-500/8 group-hover:opacity-100" />
                      <UserAvatar name={displayName} src={peer.avatarUrl} size="lg" />
                      <div className="relative">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{displayName}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-600 transition-colors group-hover:text-violet-500 dark:text-violet-300">
                          {t("challengeCta")}
                        </p>
                      </div>
                      <span className="absolute right-3 top-3 rounded-full border border-pink-200/80 bg-pink-50 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-pink-600 dark:border-pink-400/25 dark:bg-pink-400/10 dark:text-pink-200">
                        VS
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (isLoading || (!isAll && isRangeLoading)) {
    return (
      <div className="space-y-6">
        <DuetCompareHero
          mode="battle"
          viewerName={viewer?.name ?? t("seriesSelf")}
          viewerAvatar={viewer?.avatarUrl}
          friendName={friendName}
          friendAvatar={friendUser?.avatarUrl}
          locale={locale}
        />
        <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    if (error instanceof ApiError && (error.statusCode === 403 || error.statusCode === 404)) {
      return (
        <div className="space-y-6">
          <DuetCompareHero mode="picker" viewerName={viewer?.name ?? t("seriesSelf")} locale={locale} />
          <EmptyState
            variant="startup"
            message={error.statusCode === 403 ? t("scopeInsufficientTitle") : t("notFoundTitle")}
            description={
              error.statusCode === 403
                ? t("scopeInsufficientDescription")
                : t("notFoundDescription")
            }
          />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <DuetCompareHero mode="picker" viewerName={viewer?.name ?? t("seriesSelf")} locale={locale} />
        <ErrorState variant="startup" error={error} message={t("error")} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DuetCompareHero
        mode="battle"
        viewerName={viewer?.name ?? t("seriesSelf")}
        viewerAvatar={viewer?.avatarUrl}
        friendName={friendName}
        friendAvatar={friendUser?.avatarUrl}
        selfTotal={periodTotals.selfTotal}
        friendTotal={periodTotals.friendTotal}
        locale={locale}
      />

      <DuetMetadataBanner friendName={friendName} metadata={metadata} />

      {timeline?.rangeClamped ? (
        <p className={`rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm ${DASHBOARD_SPOTLIGHT_MUTED} dark:border-white/10 dark:bg-white/5`}>
          {t("rangeClamped")}
        </p>
      ) : null}

      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
        <SpotlightSectionHeader
          eyebrow={t("timelineEyebrow")}
          title={t("chartTitle", { friendName })}
          description={t("chartDescription")}
          badge={t("timelineBadge")}
          action={<PeriodSelector value={period} defaultPeriod="month" />}
        />
        <div className="px-5 pb-6 sm:px-8">
          {chartData.length === 0 ? (
            <EmptyState variant="startup" message={t("noDataTitle")} description={t("noDataDescription")} />
          ) : (
            <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
              <DuetDualLineChart
                data={chartData}
                chartTheme={chartTheme}
                resolvedTheme={resolvedTheme}
                selfLabel={t("seriesSelf")}
                friendLabel={t("seriesFriend", { friendName })}
              />
            </div>
          )}
        </div>
      </section>

      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <div
          className={
            arenaMode === "track"
              ? DASHBOARD_SPOTLIGHT_GRADIENT_CYAN
              : arenaMode === "artist"
                ? DASHBOARD_SPOTLIGHT_GRADIENT_LIME
                : DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY
          }
        />
        <div
          className={
            arenaMode === "track"
              ? DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN
              : arenaMode === "artist"
                ? DASHBOARD_SPOTLIGHT_HAIRLINE_LIME
                : DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET
          }
        />
        <SpotlightSectionHeader
          eyebrow={t("arenaEyebrow")}
          title={t("arenaTitle")}
          description={t("arenaDescription")}
          badge={t("arenaBadge")}
          badgeVariant={arenaMode === "track" ? "violet" : "lime"}
        />
        <div className="space-y-5 px-5 pb-6 sm:px-8">
          {!arenaMode ? (
            <DuetArenaModePicker onSelect={setArenaMode} />
          ) : (
            <>
              <DuetArenaModeToggle mode={arenaMode} onChange={setArenaMode} />
              {arenaMode === "artist" ? (
                <EntityHeadToHeadPanel
                  searchPlaceholder={t("artistSearchPlaceholder")}
                  clearLabel={t("artistClear")}
                  loadingLabel={t("artistLoading")}
                  errorLabel={t("artistError")}
                  chartTitle={t("artistChartTitle", { artistName: selectedArtistName, friendName })}
                  chartDescription={t("artistChartDescription")}
                  noDataTitle={t("artistNoDataTitle")}
                  noDataDescription={t("artistNoDataDescription")}
                  query={artistQuery}
                  onQueryChange={(value) => {
                    setArtistQuery(value);
                    setSelectedArtistId(undefined);
                  }}
                  selectedEntityId={selectedArtistId}
                  onSelectEntity={(id, label) => {
                    setSelectedArtistId(id);
                    setArtistQuery(label);
                  }}
                  onClear={() => {
                    setArtistQuery("");
                    setSelectedArtistId(undefined);
                  }}
                  suggestions={(artistResults?.artists ?? []).slice(0, 8).map((artist) => ({
                    id: artist.id,
                    label: artist.name,
                  }))}
                  showSuggestions={showArtistSuggestions}
                  entityCompare={artistCompare}
                  isEntityLoading={isArtistCompareLoading}
                  isEntityFetching={isArtistCompareFetching}
                  entityError={artistCompareError}
                  refetchEntity={() => void refetchArtistCompare()}
                  chartData={artistChartData}
                  entityDisplayName={selectedArtistName}
                  arenaMode="artist"
                  viewerName={viewer?.name ?? t("seriesSelf")}
                  friendName={friendName}
                  locale={locale}
                  t={t}
                  chartTheme={chartTheme}
                  resolvedTheme={resolvedTheme}
                />
              ) : (
                <EntityHeadToHeadPanel
                  searchPlaceholder={t("trackSearchPlaceholder")}
                  clearLabel={t("trackClear")}
                  loadingLabel={t("trackLoading")}
                  errorLabel={t("trackError")}
                  chartTitle={t("trackChartTitle", { trackName: selectedTrackName, friendName })}
                  chartDescription={t("trackChartDescription")}
                  noDataTitle={t("trackNoDataTitle")}
                  noDataDescription={t("trackNoDataDescription")}
                  query={trackQuery}
                  onQueryChange={(value) => {
                    setTrackQuery(value);
                    setSelectedTrackId(undefined);
                  }}
                  selectedEntityId={selectedTrackId}
                  onSelectEntity={(id, label) => {
                    setSelectedTrackId(id);
                    setTrackQuery(label);
                  }}
                  onClear={() => {
                    setTrackQuery("");
                    setSelectedTrackId(undefined);
                  }}
                  suggestions={(trackResults?.tracks ?? []).slice(0, 8).map((track) => ({
                    id: track.id,
                    label: track.title,
                    subtitle: track.artistName,
                  }))}
                  showSuggestions={showTrackSuggestions}
                  entityCompare={trackCompare}
                  isEntityLoading={isTrackCompareLoading}
                  isEntityFetching={isTrackCompareFetching}
                  entityError={trackCompareError}
                  refetchEntity={() => void refetchTrackCompare()}
                  chartData={trackChartData}
                  entityDisplayName={selectedTrackName}
                  entitySubtitle={selectedTrackArtistName ?? undefined}
                  arenaMode="track"
                  viewerName={viewer?.name ?? t("seriesSelf")}
                  friendName={friendName}
                  locale={locale}
                  t={t}
                  chartTheme={chartTheme}
                  resolvedTheme={resolvedTheme}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function DuetCompareClient() {
  const t = useTranslations("duet.compare");
  return (
    <Suspense fallback={<p className="text-sm text-muted">{t("loading")}</p>}>
      <CompareContent />
    </Suspense>
  );
}
