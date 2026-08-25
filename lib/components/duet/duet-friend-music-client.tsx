"use client";

import { Suspense, useCallback, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "motion/react";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { UserAvatar } from "@/lib/components/user-avatar";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
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
import { useDuetFriendOverview, useDuetFriends } from "@/lib/hooks/use-duet";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { usePublicDemoViewer, useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import { ApiError } from "@/lib/api-client";
import {
  DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_SHELL,
} from "@/lib/constants/dashboard-spotlight";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { buildCompareFriendHref, buildFriendMusicHref } from "@/lib/utils/duet-compare-href";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

const MUSIC_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-8";

function MusicSplit({ mobile, desktop }: { mobile: ReactNode; desktop: ReactNode }) {
  return (
    <>
      <div className="lg:hidden">{mobile}</div>
      <div className="hidden lg:block">{desktop}</div>
    </>
  );
}

function SpotlightSectionHeader({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className={`relative px-5 pb-5 pt-6 sm:px-8 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{description}</p>
        </div>
        <span className={DASHBOARD_SPOTLIGHT_BADGE_VIOLET}>
          <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET} aria-hidden />
          {badge}
        </span>
      </div>
    </div>
  );
}

function DesktopSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <DuetSubNav />
      <div className={MUSIC_HERO_SHELL} aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_30%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88))]" />
        <div className="relative space-y-4">
          <div className="h-7 w-28 animate-pulse rounded-full bg-white/15" />
          <div className="h-12 w-3/4 max-w-lg animate-pulse rounded bg-white/15" />
          <div className="h-11 w-40 animate-pulse rounded-2xl bg-white/15" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-[1.35rem] border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-white/5"
          />
        ))}
      </div>
    </div>
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
  const dateRangeLabel = formatOverviewDateRangeLabel(filterStartDate, filterEndDate, locale);

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
            <EmptyState
              variant="startup"
              message={t("gatedTitle")}
              description={t("gatedDescription")}
              actions={[{ label: t("gatedCta"), href: "/sign-in" }]}
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
            <div className={MUSIC_HERO_SHELL}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.16),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.65))]" />
              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
                  <LiveStatusDot tone="cyan" />
                  {t("pickerEyebrow")}
                </div>
                <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                  {t("pickerTitle")}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">{t("pickerDescription")}</p>
              </div>
            </div>

            {acceptedFriends.length === 0 ? (
              <EmptyState
                variant="startup"
                message={t("emptyFriendsTitle")}
                description={t("emptyFriendsDescription")}
                actions={[{ label: t("goToFriends"), href: withFilters("/dashboard/duet/friends") }]}
              />
            ) : (
              <section className={DASHBOARD_SPOTLIGHT_SHELL}>
                <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
                <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
                <SpotlightSectionHeader
                  eyebrow={t("pickerEyebrow")}
                  title={t("selectFriendTitle")}
                  description={t("selectFriendDescription")}
                  badge={t("pickerReadyCount", { count: acceptedFriends.length })}
                />
                <div className="grid gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
                  {acceptedFriends.map((friendship, index) => {
                    const peer = getDuetFriendFromFriendship(friendship, authUserId);
                    const displayName = getDuetDisplayName(peer);
                    return (
                      <motion.div
                        key={friendship.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Link
                          href={hrefForFriend(peer.id)}
                          className="group relative flex min-h-[9.5rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/60 hover:shadow-lg hover:shadow-violet-500/10 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-violet-400/30"
                        >
                          <UserAvatar name={displayName} src={peer.avatarUrl} size="lg" />
                          <div>
                            <p className="truncate font-semibold text-slate-900 dark:text-white">{displayName}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">
                              {t("openMusicCta")}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
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
            <div className="space-y-6">
              <DuetSubNav />
              <EmptyState
                variant="startup"
                message={title}
                description={description}
                actions={[{ label: t("goToFriends"), href: withFilters("/dashboard/duet/friends") }]}
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
    <EmptyState
      variant="startup"
      message={t("emptyStatsTitle")}
      description={t("emptyStatsDescription", { name: subjectName })}
    />
  );

  return (
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
        />
      }
      desktop={
        <DuetFriendMusicDesktopExperience
          locale={locale}
          compareHref={compareHref}
          subjectName={subjectName}
          subjectAvatar={subjectAvatar}
          bannerLead={bannerLead}
          badgeLabel={dateRangeLabel || t("pickerBadge")}
          showPeriodHint={isAll}
          insight={insight}
          genreName={topGenres[0]?.title}
          topArtists={topArtists}
          topGenres={topGenres}
          topTracks={topTracks}
          chartData={chartData}
          emptyStats={emptyStats}
          showAggregatesHint={!emptyStats && data.shareScope === "aggregates"}
          emptyNode={emptyNode}
        />
      }
    />
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
