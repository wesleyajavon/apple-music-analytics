"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import {
  DuetDualLineChart,
  applyDuetChartView,
  type DuetChartViewMode,
} from "@/lib/components/duet/duet-entity-duel-blocks";
import { EntityHeadToHeadPanel } from "@/lib/components/duet/duet-entity-head-to-head-panel";
import { getPeriodFromSearchParams } from "@/lib/components/period-selector";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DuetSharedArtistsPanel } from "@/lib/components/duet/duet-shared-artists-panel";
import { DuetCompareHero } from "@/lib/components/duet/duet-compare-hero";
import { DuetCompareContextBar } from "@/lib/components/duet/duet-compare-context-bar";
import {
  DuetCompareSectionTabs,
  buildCompareFriendHref,
  buildCompareTargetParams,
  resolveCompareSection,
  type DuetCompareSection,
} from "@/lib/components/duet/duet-compare-section-tabs";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
import {
  DuetCompareMobileError,
  DuetCompareMobileExperience,
  DuetCompareMobileGated,
  DuetCompareMobilePicker,
  DuetCompareMobileSkeleton,
  DuetCompareMobileUnavailable,
} from "@/lib/components/duet/duet-compare-mobile";
import {
  DuetCompareBattleSkeleton,
  DuetComparePageFallback,
  DuetComparePickerSkeleton,
} from "@/lib/components/duet/duet-compare-skeleton";
import {
  DuetArenaModeToggle,
  type DuetArenaMode,
} from "@/lib/components/duet/duet-battle-arena-ui";
import { DuetChartViewToggle } from "@/lib/components/duet/duet-chart-view-toggle";
import { DuetShareCardActions } from "@/lib/components/duet/duet-share-card-actions";
import {
  generateDuetTimelineSharePng,
  resolveDuetTimelineWinner,
} from "@/lib/utils/duet-timeline-share-image";
import { duetShareHeadlineKey, duetShareLeadKey } from "@/lib/utils/duet-share-headline";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import {
  getDuetDisplayName,
  getViewerDisplayName,
  resolveAuthAvatarUrl,
} from "@/lib/components/duet/duet-utils";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { useTheme } from "@/lib/providers/theme-provider";
import {
  useDuetCompareEntity,
  useDuetCompareSharedArtists,
  useDuetCompareTimeline,
  useDuetFriends,
} from "@/lib/hooks/use-duet";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useArtistSearch } from "@/lib/hooks/use-artists";
import { useTrackSearch } from "@/lib/hooks/use-tracks";
import { ApiError } from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePublicDemoViewer, useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { buildFriendMusicHref } from "@/lib/utils/duet-compare-href";

type ViewerProfile = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

function CanvasSectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className={DASHBOARD_SECTION_TITLE}>{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function parseInitialArenaMode(value: string | null): DuetArenaMode | null {
  if (value === "artist" || value === "track") return value;
  return null;
}

function formatShareDateRange(
  startIso: string | undefined,
  endIso: string | undefined,
  locale: string
): string {
  if (!startIso || !endIso) return "";
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

function CompareSplit({ mobile, desktop }: { mobile: ReactNode; desktop: ReactNode }) {
  return (
    <>
      <div className="lg:hidden">{mobile}</div>
      <div className="hidden lg:block">{desktop}</div>
    </>
  );
}

function CompareContent() {
  const t = useTranslations("duet.compare");
  const tPeriod = useTranslations("components.periodSelector");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const friendUserId = searchParams.get("friendUserId") ?? undefined;
  const activeSection = resolveCompareSection(searchParams);
  const authUserId = useSupabaseAuthUserId();
  const userIdFromUrl = searchParams.get("userId");
  const isPublicDemoViewer = usePublicDemoViewer(userIdFromUrl);
  const withFilters = useCallback(
    (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams]
  );
  const hrefForFriend = useCallback(
    (friendId: string) => buildCompareFriendHref(pathname, searchParams, friendId),
    [pathname, searchParams]
  );
  const seeMusicHref = friendUserId
    ? buildFriendMusicHref(searchParams, friendUserId)
    : null;
  const handleSelectFriend = useCallback(
    (friendId: string) => {
      router.replace(buildCompareFriendHref(pathname, searchParams, friendId), { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const handleSectionChange = useCallback(
    (section: DuetCompareSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("section", section);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const { startDate: filterStartDate, endDate: filterEndDate, isAll, isLoading: isRangeLoading } =
    useListenDateRange();
  const startDate = isAll ? undefined : filterStartDate;
  const endDate = isAll ? undefined : filterEndDate;
  const period = getPeriodFromSearchParams(searchParams, "month");

  const { data: friendsData, isLoading: friendsLoading } = useDuetFriends({
    enabled: authUserId !== undefined && !isPublicDemoViewer,
  });
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);

  useEffect(() => {
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(async ({ data: auth }) => {
        const authUser = auth.user;
        const userId = authUser?.id ?? null;
        if (!userId || !authUser) {
          setViewer(null);
          return;
        }

        const authEmail = authUser.email ?? null;
        const authAvatarUrl = resolveAuthAvatarUrl(authUser);
        const authFallbackName = getViewerDisplayName({
          name:
            (authUser.user_metadata?.name as string | undefined) ??
            (authUser.user_metadata?.full_name as string | undefined),
          email: authEmail,
          id: userId,
        });

        try {
          const res = await fetch("/api/user/me", { credentials: "same-origin" });
          if (res.ok) {
            const data = (await res.json()) as {
              user?: {
                name?: string | null;
                email?: string | null;
                avatarUrl?: string | null;
              } | null;
            };
            const email = data.user?.email ?? authEmail;
            setViewer({
              id: userId,
              email,
              name: getViewerDisplayName({
                name: data.user?.name,
                email,
                id: userId,
              }),
              avatarUrl: data.user?.avatarUrl ?? authAvatarUrl,
            });
          } else {
            setViewer({
              id: userId,
              email: authEmail,
              name: authFallbackName,
              avatarUrl: authAvatarUrl,
            });
          }
        } catch {
          setViewer({
            id: userId,
            email: authEmail,
            name: authFallbackName,
            avatarUrl: authAvatarUrl,
          });
        }
      });
  }, []);

  const { data: timeline, isLoading, error, refetch } = useDuetCompareTimeline({
    friendUserId,
    startDate,
    endDate,
    period,
  });
  const {
    data: sharedArtists,
    isLoading: isSharedArtistsLoading,
    error: sharedArtistsError,
    refetch: refetchSharedArtists,
  } = useDuetCompareSharedArtists({
    friendUserId,
    startDate,
    endDate,
  });

  const initialArenaMode = parseInitialArenaMode(searchParams.get("arenaMode"));
  const initialEntityType = searchParams.get("entityType") ?? searchParams.get("type");
  const initialEntityId = searchParams.get("entityId") ?? undefined;
  const initialEntityName = searchParams.get("entityName") ?? undefined;

  const [arenaMode, setArenaMode] = useState<DuetArenaMode | null>(initialArenaMode);
  const [chartView, setChartView] = useState<DuetChartViewMode>("period");
  const [artistQuery, setArtistQuery] = useState(
    initialEntityType === "artist" && initialEntityId ? (initialEntityName ?? "") : ""
  );
  const [selectedArtistId, setSelectedArtistId] = useState<string | undefined>(
    initialEntityType === "artist" ? initialEntityId : undefined
  );
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
  const [selectedTrackId, setSelectedTrackId] = useState<string | undefined>(
    initialEntityType === "track" ? initialEntityId : undefined
  );
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

  useEffect(() => {
    if (initialArenaMode) setArenaMode(initialArenaMode);
  }, [initialArenaMode]);

  useEffect(() => {
    if (trackCompare?.type === "track" && selectedTrackId && !trackQuery) {
      setTrackQuery(trackCompare.trackTitle ?? "");
    }
  }, [trackCompare, selectedTrackId, trackQuery]);

  useEffect(() => {
    if (artistCompare?.type === "artist" && selectedArtistId && !artistQuery) {
      setArtistQuery(artistCompare.artistName ?? "");
    }
  }, [artistCompare, selectedArtistId, artistQuery]);

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

  const timelineDisplayChartData = useMemo(
    () => applyDuetChartView(chartData, chartView),
    [chartData, chartView]
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

  const dateRangeLabel = formatOverviewDateRangeLabel(
    timeline?.startDate ?? startDate,
    timeline?.endDate ?? endDate,
    locale
  );

  const handleCompareArtist = useCallback(
    (artistId: string, artistName: string) => {
      const params = buildCompareTargetParams(
        new URLSearchParams(searchParams.toString()),
        artistId,
        artistName
      );
      setArenaMode("artist");
      setSelectedArtistId(artistId);
      setArtistQuery(artistName);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      if (window.matchMedia("(min-width: 1024px)").matches) {
        document.getElementById("duet-compare-context-bar")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    },
    [pathname, router, searchParams]
  );

  const timelineShareActions = useMemo(() => {
    const total = periodTotals.selfTotal + periodTotals.friendTotal;
    if (total <= 0) return null;

    const winner = resolveDuetTimelineWinner(periodTotals.selfTotal, periodTotals.friendTotal);
    const periodLabel =
      period === "day" ? tPeriod("daily") : period === "week" ? tPeriod("weekly") : tPeriod("monthly");
    const shareDateRange = formatShareDateRange(timeline?.startDate, timeline?.endDate, locale);
    const subtitle = shareDateRange
      ? t("shareTimelineSubtitle", { periodLabel, dateRange: shareDateRange })
      : periodLabel;
    const viewerName = viewer?.name ?? t("seriesSelf");
    const winnerHeadline = t(duetShareHeadlineKey("timeline", winner), { friendName });

    return (
      <DuetShareCardActions
        canShare
        variant="hero"
        buildImageBlob={() =>
          generateDuetTimelineSharePng({
            arenaLabel: t("shareArenaTimeline"),
            title: t("shareTimelineTitle"),
            subtitle,
            viewerName,
            friendName,
            viewerAvatarUrl: viewer?.avatarUrl,
            friendAvatarUrl: friendUser?.avatarUrl,
            selfTotal: periodTotals.selfTotal,
            friendTotal: periodTotals.friendTotal,
            winner,
            winnerHeadline,
            selfLabel: t("shareCountLabel"),
            friendLabel: t("shareCountLabel"),
            brandName: t("shareBrandName"),
            brandTagline: t("shareBrandTagline"),
            vsLabel: t("shareVsLabel"),
            leadLabel:
              winner === "friend"
                ? t("scoreboardLeadsFriend", { name: friendName })
                : t(duetShareLeadKey(winner)),
            marginCaption:
              winner === "tie" ||
              Math.abs(periodTotals.selfTotal - periodTotals.friendTotal) === 0
                ? undefined
                : t("scoreboardMargin", {
                    margin: Math.abs(
                      periodTotals.selfTotal - periodTotals.friendTotal
                    ).toLocaleString(locale),
                  }),
          })
        }
        buildCaption={() =>
          t("shareTimelineText", {
            arenaLabel: t("shareArenaTimeline"),
            selfTotal: periodTotals.selfTotal.toLocaleString(locale),
            friendName,
            friendTotal: periodTotals.friendTotal.toLocaleString(locale),
            dateRange: shareDateRange || subtitle,
            outcome: winnerHeadline,
          })
        }
        shareLabel={t("shareBattleImage")}
        downloadLabel={t("downloadBattleImage")}
        preparingLabel={t("shareImagePreparing")}
        sharedImageLabel={t("shareImageShared")}
        sharedTextLabel={t("shareShared")}
        copiedLabel={t("shareCopied")}
        savedLabel={t("shareImageSaved")}
        downloadFilename="soundprint-timeline.png"
      />
    );
  }, [
    periodTotals,
    timeline?.startDate,
    timeline?.endDate,
    period,
    locale,
    friendName,
    viewer?.name,
    viewer?.avatarUrl,
    friendUser?.avatarUrl,
    t,
    tPeriod,
  ]);

  const selectedArtistName =
    artistCompare?.type === "artist" ? (artistCompare.artistName ?? artistQuery) : artistQuery;
  const selectedTrackName =
    trackCompare?.type === "track" ? (trackCompare.trackTitle ?? trackQuery) : trackQuery;
  const selectedTrackArtistName =
    trackCompare?.type === "track" ? trackCompare.artistName : undefined;

  const targetMode: DuetArenaMode = arenaMode ?? "artist";
  const mobileTarget =
    targetMode === "track"
      ? {
          query: trackQuery,
          onQueryChange: (value: string) => {
            setTrackQuery(value);
            setSelectedTrackId(undefined);
          },
          suggestions: (trackResults?.tracks ?? []).map((track) => ({
            id: track.id,
            label: track.title,
            subtitle: track.artistName,
          })),
          showSuggestions: showTrackSuggestions,
          selectedLabel: selectedTrackId ? selectedTrackName : "",
          subtitle: selectedTrackArtistName ?? undefined,
          compare: trackCompare,
          chartData: trackChartData,
          loading: isTrackCompareLoading || isTrackCompareFetching,
          error: Boolean(trackCompareError),
          retry: () => void refetchTrackCompare(),
          select: (id: string, label: string) => {
            setSelectedTrackId(id);
            setTrackQuery(label);
          },
          clear: () => {
            setTrackQuery("");
            setSelectedTrackId(undefined);
          },
        }
      : {
          query: artistQuery,
          onQueryChange: (value: string) => {
            setArtistQuery(value);
            setSelectedArtistId(undefined);
          },
          suggestions: (artistResults?.artists ?? []).map((artist) => ({
            id: artist.id,
            label: artist.name,
          })),
          showSuggestions: showArtistSuggestions,
          selectedLabel: selectedArtistId ? selectedArtistName : "",
          subtitle: undefined as string | undefined,
          compare: artistCompare,
          chartData: artistChartData,
          loading: isArtistCompareLoading || isArtistCompareFetching,
          error: Boolean(artistCompareError),
          retry: () => void refetchArtistCompare(),
          select: (id: string, label: string) => {
            setSelectedArtistId(id);
            setArtistQuery(label);
          },
          clear: () => {
            setArtistQuery("");
            setSelectedArtistId(undefined);
          },
        };

  const renderTargetSection = () => {
    const activeArenaMode = arenaMode ?? "artist";
    return (
    <section>
      <CanvasSectionHeader title={t("arenaTitle")} />
      <div className="space-y-5">
        <DuetArenaModeToggle
          mode={activeArenaMode}
          onChange={setArenaMode}
        />
        {activeArenaMode === "artist" ? (
              <EntityHeadToHeadPanel
                searchPlaceholder={t("artistSearchPlaceholder")}
                clearLabel={t("artistClear")}
                loadingLabel={t("artistLoading")}
                errorLabel={t("artistError")}
                chartTitle={t("artistChartTitle", { artistName: selectedArtistName, friendName })}
                chartDescription={t("artistChartDescription")}
                chartDescriptionCumulative={t("chartDescriptionCumulative")}
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
                suggestions={(artistResults?.artists ?? []).map((artist) => ({
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
                entityImageUrl={
                  artistCompare?.type === "artist" ? artistCompare.imageUrl : undefined
                }
                arenaMode="artist"
                viewerName={viewer?.name ?? t("seriesSelf")}
                friendName={friendName}
                viewerAvatarUrl={viewer?.avatarUrl}
                friendAvatarUrl={friendUser?.avatarUrl}
                locale={locale}
                period={period}
                t={t}
                chartView={chartView}
                onChartViewChange={setChartView}
              />
            ) : (
              <EntityHeadToHeadPanel
                searchPlaceholder={t("trackSearchPlaceholder")}
                clearLabel={t("trackClear")}
                loadingLabel={t("trackLoading")}
                errorLabel={t("trackError")}
                chartTitle={t("trackChartTitle", { trackName: selectedTrackName, friendName })}
                chartDescription={t("trackChartDescription")}
                chartDescriptionCumulative={t("chartDescriptionCumulative")}
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
                suggestions={(trackResults?.tracks ?? []).map((track) => ({
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
                viewerAvatarUrl={viewer?.avatarUrl}
                friendAvatarUrl={friendUser?.avatarUrl}
                locale={locale}
                period={period}
                t={t}
                chartView={chartView}
                onChartViewChange={setChartView}
              />
            )}
      </div>
    </section>
    );
  };

  const renderOverviewSection = () => (
    <>
      {timeline?.rangeClamped ? (
        <p className="text-sm text-muted">{t("rangeClamped")}</p>
      ) : null}

      <section>
        <CanvasSectionHeader
          title={t("chartTitle", { friendName })}
          action={
            chartData.length > 0 ? (
              <DuetChartViewToggle value={chartView} onChange={setChartView} />
            ) : undefined
          }
        />
        <div className="space-y-4">
          {chartData.length === 0 ? (
            <EmptyState variant="startup" message={t("noDataTitle")} description={t("noDataDescription")} />
          ) : (
            <>
              <div>
                <DuetDualLineChart
                  data={timelineDisplayChartData}
                  period={period}
                  locale={locale}
                  selfLabel={t("seriesSelf")}
                  friendLabel={t("seriesFriend", { friendName })}
                />
              </div>
              {timelineShareActions ? (
                <div className="flex justify-center sm:justify-end">{timelineShareActions}</div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );

  const renderSectionContent = (section: DuetCompareSection) => {
    if (section === "shared") {
      return (
        <DuetSharedArtistsPanel
          friendName={friendName}
          data={sharedArtists}
          isLoading={isSharedArtistsLoading}
          error={sharedArtistsError}
          onRetry={() => void refetchSharedArtists()}
          onCompareArtist={handleCompareArtist}
        />
      );
    }

    if (section === "target") {
      return renderTargetSection();
    }

    return renderOverviewSection();
  };

  if (authUserId === undefined) {
    return (
      <CompareSplit
        mobile={<DuetCompareMobileSkeleton locale={locale} />}
        desktop={
          <div className="space-y-8">
            <DuetSubNav />
            <DuetCompareHero mode="picker" viewerName={t("seriesSelf")} locale={locale} />
            <DuetComparePickerSkeleton />
          </div>
        }
      />
    );
  }

  if (isPublicDemoViewer) {
    return (
      <CompareSplit
        mobile={<DuetCompareMobileGated locale={locale} withFilters={withFilters} />}
        desktop={
          <div className="space-y-8">
            <DuetSubNav />
            <EmptyState
              variant="startup"
              message={t("selectFriendTitle")}
              description={t("selectFriendDescription")}
              actions={[{ label: t("mobile.gatedCta"), href: "/sign-in" }]}
            />
          </div>
        }
      />
    );
  }

  if (!friendUserId) {
    if (friendsLoading || viewer === null) {
      return (
        <CompareSplit
          mobile={<DuetCompareMobileSkeleton locale={locale} />}
          desktop={
            <div className="space-y-8">
              <DuetSubNav />
              <DuetCompareHero mode="picker" viewerName={t("seriesSelf")} locale={locale} />
              <DuetComparePickerSkeleton />
            </div>
          }
        />
      );
    }

    const acceptedFriends = friendsData?.friends ?? [];

    return (
      <CompareSplit
        mobile={
          <DuetCompareMobilePicker
            locale={locale}
            viewerId={viewer.id}
            friends={acceptedFriends}
            hrefForFriend={hrefForFriend}
            withFilters={withFilters}
          />
        }
        desktop={
          <div className="space-y-8">
            <DuetSubNav />
            <DuetCompareHero
              mode="picker"
              viewerName={viewer.name}
              viewerAvatar={viewer.avatarUrl}
              locale={locale}
            />

            {acceptedFriends.length === 0 ? (
              <EmptyState
                variant="startup"
                message={t("selectFriendTitle")}
                description={t("selectFriendDescription")}
                actions={[{ label: t("goToFriends"), href: "/dashboard/duet/friends" }]}
              />
            ) : (
              <section className="space-y-3" aria-label={t("selectFriendTitle")}>
                <ul>
                  {acceptedFriends.map((friendship) => {
                    const peer =
                      friendship.requester.id === viewer.id
                        ? friendship.addressee
                        : friendship.requester;
                    const displayName = getDuetDisplayName(peer);
                    return (
                      <li key={friendship.id}>
                        <Link
                          href={`/dashboard/duet/compare?friendUserId=${encodeURIComponent(peer.id)}&section=overview`}
                          className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} ${DASHBOARD_LIST_ROW_INTERACTIVE} no-underline text-foreground`}
                        >
                          <UserAvatar name={displayName} src={peer.avatarUrl} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {displayName}
                          </span>
                          <span className="shrink-0 text-[13px] font-medium text-muted">
                            {t("challengeCta")}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        }
      />
    );
  }

  if ((isLoading && !timeline) || (!isAll && isRangeLoading && !timeline)) {
    return (
      <CompareSplit
        mobile={<DuetCompareMobileSkeleton locale={locale} />}
        desktop={
          <div className="space-y-8">
            <DuetSubNav />
            <DuetCompareHero
              mode="battle"
              viewerName={viewer?.name ?? t("seriesSelf")}
              viewerAvatar={viewer?.avatarUrl}
              friendName={friendName}
              friendAvatar={friendUser?.avatarUrl}
              locale={locale}
            />
            <DuetCompareBattleSkeleton />
          </div>
        }
      />
    );
  }

  if (error) {
    if (error instanceof ApiError && (error.statusCode === 403 || error.statusCode === 404)) {
      return (
        <CompareSplit
          mobile={
            <DuetCompareMobileUnavailable
              locale={locale}
              withFilters={withFilters}
              title={error.statusCode === 403 ? t("scopeInsufficientTitle") : t("notFoundTitle")}
              description={
                error.statusCode === 403
                  ? t("scopeInsufficientDescription")
                  : t("notFoundDescription")
              }
            />
          }
          desktop={
            <div className="space-y-6">
              <DuetSubNav />
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
          }
        />
      );
    }
    return (
      <CompareSplit
        mobile={
          <DuetCompareMobileError
            locale={locale}
            withFilters={withFilters}
            onRetry={() => refetch()}
          />
        }
        desktop={
          <div className="space-y-6">
            <DuetSubNav />
            <DuetCompareHero mode="picker" viewerName={viewer?.name ?? t("seriesSelf")} locale={locale} />
            <ErrorState variant="startup" error={error} message={t("error")} onRetry={() => refetch()} />
          </div>
        }
      />
    );
  }

  return (
    <CompareSplit
      mobile={
        <DuetCompareMobileExperience
          locale={locale}
          viewer={{
            id: viewer?.id ?? authUserId ?? "",
            name: viewer?.name ?? t("seriesSelf"),
            avatarUrl: viewer?.avatarUrl ?? null,
          }}
          friendName={friendName}
          friendAvatarUrl={friendUser?.avatarUrl ?? null}
          friends={friendsData?.friends ?? []}
          hrefForFriend={hrefForFriend}
          withFilters={withFilters}
          seeMusicHref={seeMusicHref}
          onSelectFriend={handleSelectFriend}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          selfTotal={periodTotals.selfTotal}
          friendTotal={periodTotals.friendTotal}
          rangeClamped={Boolean(timeline?.rangeClamped)}
          chartData={chartData}
          period={period}
          resolvedTheme={resolvedTheme}
          chartView={chartView}
          onChartViewChange={setChartView}
          shareActions={timelineShareActions}
          sharedArtists={sharedArtists?.artists}
          sharedLoading={isSharedArtistsLoading}
          sharedError={Boolean(sharedArtistsError)}
          onRetryShared={() => void refetchSharedArtists()}
          onCompareArtist={handleCompareArtist}
          arenaMode={arenaMode}
          onArenaModeChange={setArenaMode}
          searchQuery={mobileTarget.query}
          onSearchQueryChange={mobileTarget.onQueryChange}
          suggestions={mobileTarget.suggestions}
          showSuggestions={mobileTarget.showSuggestions}
          selectedEntityLabel={mobileTarget.selectedLabel}
          selectedEntitySubtitle={mobileTarget.subtitle}
          onSelectEntity={mobileTarget.select}
          onClearEntity={mobileTarget.clear}
          entityCompare={mobileTarget.compare}
          entityChartData={mobileTarget.chartData}
          entityLoading={mobileTarget.loading}
          entityError={mobileTarget.error}
          onRetryEntity={mobileTarget.retry}
        />
      }
      desktop={
        <div className="space-y-8">
          <DuetSubNav />
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

          <DuetCompareContextBar
            id="duet-compare-context-bar"
            dateRangeLabel={dateRangeLabel}
            seeMusicHref={seeMusicHref}
          />

          <DuetCompareSectionTabs activeSection={activeSection} />

          <div className="space-y-8">{renderSectionContent(activeSection)}</div>
        </div>
      }
    />
  );
}

export function DuetCompareClient() {
  return (
    <Suspense fallback={<DuetComparePageFallback />}>
      <CompareContent />
    </Suspense>
  );
}
