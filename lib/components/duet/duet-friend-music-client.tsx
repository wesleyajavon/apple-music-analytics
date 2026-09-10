"use client";

import { Suspense, useCallback, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { ErrorState } from "@/lib/components/error-state";
import { UserAvatar } from "@/lib/components/user-avatar";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_LIST_ROW_INTERACTIVE,
} from "@/lib/components/dashboard-ui";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
import { DuetFriendMusicDesktopExperience } from "@/lib/components/duet/duet-friend-music-desktop";
import {
  DuetFriendMusicMobileError,
  DuetFriendMusicMobileExperience,
  DuetFriendMusicMobileGated,
  DuetFriendMusicMobilePicker,
  DuetFriendMusicMobileSkeleton,
  DuetFriendMusicMobileUnavailable,
  type FriendMusicChartPoint,
  type FriendMusicLeaderItem,
} from "@/lib/components/duet/duet-friend-music-mobile";
import {
  getDuetDisplayName,
  getDuetFriendFromFriendship,
  resolveAcceptedFriendName,
} from "@/lib/components/duet/duet-utils";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { useDuetFriendOverview, useDuetFriends } from "@/lib/hooks/use-duet";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { usePublicDemoViewer, useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import { ApiError } from "@/lib/api-client";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { buildCompareFriendHref, buildFriendMusicHref } from "@/lib/utils/duet-compare-href";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

function MusicSplit({ mobile, desktop }: { mobile: ReactNode; desktop: ReactNode }) {
  return (
    <>
      <div className="lg:hidden">{mobile}</div>
      <div className="hidden lg:block">{desktop}</div>
    </>
  );
}

function ShimmerBar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-200/90 dark:bg-white/10 ${className}`} />;
}

function DesktopSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <DuetSubNav />
      <OverviewHeroFrame title=" " description=" ">
        <div className="space-y-4" aria-hidden>
          <ShimmerBar className="h-9 w-72 max-w-full" />
          <ShimmerBar className="h-4 w-full max-w-xl" />
          <ShimmerBar className="mt-2 h-11 w-40 rounded-2xl" />
        </div>
      </OverviewHeroFrame>
      <ul aria-hidden>
        {[0, 1, 2, 3].map((item) => (
          <li key={item} className={`flex items-center gap-3 py-3 ${DASHBOARD_LIST_SEPARATOR}`}>
            <ShimmerBar className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <ShimmerBar className="h-4 w-36" />
              <ShimmerBar className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DesktopMastheadMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <OverviewHeroFrame title={title} description={description}>
      {action ? <div className="mt-6">{action}</div> : null}
    </OverviewHeroFrame>
  );
}

function formatTimelineChart(
  timeline: { date: string; listens: number }[],
  locale: string
): FriendMusicChartPoint[] {
  return timeline.map((point) => {
    const raw = point.date;
    const d =
      raw.length === 7 && raw[4] === "-" ? new Date(`${raw}-01T12:00:00`) : new Date(raw);
    return {
      formattedDate: d.toLocaleDateString(locale, { month: "short", year: "numeric" }),
      listens: point.listens,
    };
  });
}

function FriendMusicContent() {
  const t = useTranslations("duet.friendMusic");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const friendUserId = searchParams.get("friendUserId") ?? undefined;
  const authUserId = useSupabaseAuthUserId();
  const userIdFromUrl = searchParams.get("userId");
  const isPublicDemoViewer = usePublicDemoViewer(userIdFromUrl);
  const [artistInsightsTarget, setArtistInsightsTarget] = useState<{
    artist: ArtistStatsDto;
    avatarColorIndex: number;
  } | null>(null);
  const handleOpenArtistInsights = useCallback(
    (artist: ArtistStatsDto, avatarColorIndex: number) => {
      setArtistInsightsTarget({ artist, avatarColorIndex });
    },
    []
  );
  const withFilters = useCallback(
    (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams]
  );
  const hrefForFriend = useCallback(
    (friendId: string) => buildFriendMusicHref(searchParams, friendId),
    [searchParams]
  );
  const compareHref = friendUserId
    ? buildCompareFriendHref("/dashboard/duet/compare", searchParams, friendUserId)
    : withFilters("/dashboard/duet/compare");

  const { startDate: filterStartDate, endDate: filterEndDate, isAll, isLoading: isRangeLoading } =
    useListenDateRange();
  const startDate = isAll ? undefined : filterStartDate;
  const endDate = isAll ? undefined : filterEndDate;

  const { data: friendsData, isLoading: friendsLoading } = useDuetFriends({
    enabled: Boolean(authUserId) && !isPublicDemoViewer,
  });

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useDuetFriendOverview({
    friendUserId,
    startDate,
    endDate,
    enabled: !!friendUserId && !isPublicDemoViewer && !!authUserId,
  });

  if (authUserId === undefined) {
    return (
      <MusicSplit
        mobile={<DuetFriendMusicMobileSkeleton locale={locale} />}
        desktop={<DesktopSkeleton />}
      />
    );
  }

  if (isPublicDemoViewer || authUserId === null) {
    return (
      <MusicSplit
        mobile={<DuetFriendMusicMobileGated locale={locale} withFilters={withFilters} />}
        desktop={
          <div className="space-y-8">
            <DuetSubNav />
            <DesktopMastheadMessage
              title={t("gatedTitle")}
              description={t("gatedDescription")}
              action={
                <Link
                  href="/sign-in"
                  className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline text-foreground`}
                >
                  {t("gatedCta")}
                </Link>
              }
            />
          </div>
        }
      />
    );
  }

  if (!friendUserId) {
    if (friendsLoading) {
      return (
        <MusicSplit
          mobile={<DuetFriendMusicMobileSkeleton locale={locale} />}
          desktop={<DesktopSkeleton />}
        />
      );
    }

    const acceptedFriends = friendsData?.friends ?? [];

    return (
      <MusicSplit
        mobile={
          <DuetFriendMusicMobilePicker
            locale={locale}
            viewerId={authUserId}
            friends={acceptedFriends}
            hrefForFriend={hrefForFriend}
            withFilters={withFilters}
          />
        }
        desktop={
          <div className="space-y-8">
            <DuetSubNav />
            <OverviewHeroFrame title={t("pickerTitle")} description={t("pickerDescription")} />

            {acceptedFriends.length === 0 ? (
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-foreground">{t("emptyFriendsTitle")}</p>
                <p className="max-w-xl text-[13px] leading-6 text-muted">
                  {t("emptyFriendsDescription")}
                </p>
                <Link
                  href={withFilters("/dashboard/duet/friends")}
                  className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline text-foreground`}
                >
                  {t("goToFriends")}
                </Link>
              </div>
            ) : (
              <section className="space-y-3" aria-label={t("selectFriendTitle")}>
                <div>
                  <p className="text-[13px] font-medium text-muted">{t("pickerEyebrow")}</p>
                  <h2 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
                    {t("selectFriendTitle")}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">
                    {t("selectFriendDescription")}
                  </p>
                </div>
                <ul>
                  {acceptedFriends.map((friendship) => {
                    const peer = getDuetFriendFromFriendship(friendship, authUserId);
                    const displayName = getDuetDisplayName(peer);
                    return (
                      <li key={friendship.id}>
                        <Link
                          href={hrefForFriend(peer.id)}
                          className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} ${DASHBOARD_LIST_ROW_INTERACTIVE} no-underline text-foreground`}
                        >
                          <UserAvatar name={displayName} src={peer.avatarUrl} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                            {displayName}
                          </span>
                          <span className="shrink-0 text-[13px] font-medium text-muted">
                            {t("openMusicCta")}
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

  if ((isLoading && !data) || (!isAll && isRangeLoading && !data)) {
    return (
      <MusicSplit
        mobile={<DuetFriendMusicMobileSkeleton locale={locale} />}
        desktop={<DesktopSkeleton />}
      />
    );
  }

  if (error) {
    if (error instanceof ApiError && (error.statusCode === 403 || error.statusCode === 404)) {
      if (error.statusCode === 403 && friendsLoading) {
        return (
          <MusicSplit
            mobile={<DuetFriendMusicMobileSkeleton locale={locale} />}
            desktop={<DesktopSkeleton />}
          />
        );
      }

      const title = error.statusCode === 403 ? t("scopeInsufficientTitle") : t("notFoundTitle");
      const scopeFriendName =
        error.statusCode === 403 && authUserId && friendUserId
          ? resolveAcceptedFriendName(friendsData?.friends, authUserId, friendUserId, t("friendFallback"))
          : t("friendFallback");
      const description =
        error.statusCode === 403
          ? t("scopeInsufficientDescription", { name: scopeFriendName })
          : t("notFoundDescription");
      return (
        <MusicSplit
          mobile={
            <DuetFriendMusicMobileUnavailable
              locale={locale}
              withFilters={withFilters}
              title={title}
              description={description}
            />
          }
          desktop={
            <div className="space-y-8">
              <DuetSubNav />
              <DesktopMastheadMessage
                title={title}
                description={description}
                action={
                  <Link
                    href={withFilters("/dashboard/duet/friends")}
                    className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline text-foreground`}
                  >
                    {t("goToFriends")}
                  </Link>
                }
              />
            </div>
          }
        />
      );
    }

    return (
      <MusicSplit
        mobile={
          <DuetFriendMusicMobileError
            locale={locale}
            withFilters={withFilters}
            onRetry={() => void refetch()}
          />
        }
        desktop={
          <div className="space-y-6">
            <DuetSubNav />
            <ErrorState variant="startup" error={error} message={t("error")} onRetry={() => void refetch()} />
          </div>
        }
      />
    );
  }

  if (!data) {
    return (
      <MusicSplit
        mobile={<DuetFriendMusicMobileSkeleton locale={locale} />}
        desktop={<DesktopSkeleton />}
      />
    );
  }

  const subjectName = data.subject.name?.trim() || t("friendFallback");
  const subjectAvatar = data.subject.avatarUrl;
  const bannerLead = t("bannerLead", { name: subjectName });
  const emptyStats = data.stats.totalListens === 0;
  const chartData = formatTimelineChart(data.timeline, locale);
  const topArtists: FriendMusicLeaderItem[] = data.topArtists.map((artist) => ({
    id: artist.artistId,
    title: artist.artistName,
    count: artist.listenCount,
    imageUrl: artist.imageUrl,
    percentage:
      data.stats.totalListens > 0 ? (artist.listenCount / data.stats.totalListens) * 100 : 0,
  }));
  const topGenres: FriendMusicLeaderItem[] = data.topGenres.map((genre) => ({
    id: genre.genre,
    title: genre.genre,
    count: genre.count,
    percentage: genre.percentage,
  }));
  const topTracks: FriendMusicLeaderItem[] | null =
    data.shareScope === "full"
      ? (data.topTracks ?? []).map((track) => ({
          id: track.trackId,
          title: track.trackTitle,
          subtitle: track.artistName,
          artistId: track.artistId,
          count: track.listenCount,
          percentage:
            data.stats.totalListens > 0 ? (track.listenCount / data.stats.totalListens) * 100 : 0,
        }))
      : null;

  const topTrackLeader = topTracks?.[0];
  const topArtistLeader = topArtists[0];
  const insight: OverviewPrimaryInsight | undefined = emptyStats
    ? undefined
    : topTrackLeader
      ? {
          eyebrow: t("insight.topTrackEyebrow"),
          title: topTrackLeader.title,
          subtitle: t("insight.topTrackBody", {
            artist: topTrackLeader.subtitle ?? "",
          }),
          metric: topTrackLeader.count.toLocaleString(locale),
          metricLabel: t("listens"),
        }
      : topArtistLeader
        ? {
            eyebrow: t("insight.topArtistEyebrow"),
            title: topArtistLeader.title,
            subtitle: t("insight.topArtistBody"),
            metric: topArtistLeader.count.toLocaleString(locale),
            metricLabel: t("listens"),
          }
        : {
            eyebrow: t("insight.libraryEyebrow"),
            title: subjectName,
            subtitle: t("insight.libraryBody"),
            metric: data.stats.totalListens.toLocaleString(locale),
            metricLabel: t("listens"),
          };

  const emptyNode = (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-foreground">{t("emptyStatsTitle")}</p>
      <p className="max-w-xl text-[13px] leading-6 text-muted">
        {t("emptyStatsDescription", { name: subjectName })}
      </p>
    </div>
  );

  return (
    <>
      <MusicSplit
        mobile={
          <DuetFriendMusicMobileExperience
            locale={locale}
            withFilters={withFilters}
            compareHref={compareHref}
            subjectName={subjectName}
            subjectAvatar={subjectAvatar}
            bannerLead={bannerLead}
            insight={insight}
            genreName={topGenres[0]?.title}
            topArtists={topArtists}
            topGenres={topGenres}
            topTracks={topTracks}
            chartData={chartData}
            emptyStats={emptyStats}
            showAggregatesHint={!emptyStats && data.shareScope === "aggregates"}
            onOpenArtistInsights={handleOpenArtistInsights}
          />
        }
        desktop={
          <DuetFriendMusicDesktopExperience
            locale={locale}
            compareHref={compareHref}
            subjectName={subjectName}
            subjectAvatar={subjectAvatar}
            bannerLead={bannerLead}
            insight={insight}
            topArtists={topArtists}
            topGenres={topGenres}
            topTracks={topTracks}
            chartData={chartData}
            emptyStats={emptyStats}
            showAggregatesHint={!emptyStats && data.shareScope === "aggregates"}
            emptyNode={emptyNode}
            onOpenArtistInsights={handleOpenArtistInsights}
          />
        }
      />
      <ArtistUserInsightsPanel
        open={artistInsightsTarget != null}
        artistId={artistInsightsTarget?.artist.artistId ?? null}
        previewArtist={artistInsightsTarget?.artist ?? null}
        startDate={startDate}
        endDate={endDate}
        userId={friendUserId}
        locale={locale}
        colorIndex={artistInsightsTarget?.avatarColorIndex ?? 0}
        subjectName={subjectName}
        onClose={() => setArtistInsightsTarget(null)}
      />
    </>
  );
}

export function DuetFriendMusicClient() {
  return (
    <Suspense
      fallback={
        <MusicSplit
          mobile={<DuetFriendMusicMobileSkeleton locale="en" />}
          desktop={<DesktopSkeleton />}
        />
      }
    >
      <FriendMusicContent />
    </Suspense>
  );
}
