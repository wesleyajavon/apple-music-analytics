"use client";

import { Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "motion/react";
import { Eye, Swords } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { UserAvatar } from "@/lib/components/user-avatar";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { OverviewStatsSection } from "@/lib/components/overview-stats-section";
import { SpotlightRankBubble } from "@/lib/components/overview-library-rankings";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
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
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import {
  DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_SHELL,
} from "@/lib/constants/dashboard-spotlight";
import { DUET_SHARE_SETTINGS_PATH } from "@/lib/constants/duet-settings";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { buildCompareFriendHref, buildFriendMusicHref } from "@/lib/utils/duet-compare-href";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import {
  applyListenTrendChartViewSingle,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";

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

function LeaderList({
  items,
  locale,
  listensLabel,
}: {
  items: FriendMusicLeaderItem[];
  locale: string;
  listensLabel: string;
}) {
  return (
    <ul className="space-y-2 px-5 pb-6 sm:px-8">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-[1.2rem] border border-slate-200/80 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950/60"
        >
          <SpotlightRankBubble rank={index + 1} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{item.title}</p>
            {item.subtitle ? (
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{item.subtitle}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
              {item.count.toLocaleString(locale)}
            </p>
            <p className="text-[11px] text-slate-500">{listensLabel}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FriendMusicTimelineCard({
  title,
  description,
  badge,
  chartData,
  locale,
  listensLabel,
}: {
  title: string;
  description: string;
  badge: string;
  chartData: FriendMusicChartPoint[];
  locale: string;
  listensLabel: string;
}) {
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewSingle(chartData, chartView, "listens"),
    [chartData, chartView]
  );

  if (chartData.length === 0) return null;

  return (
    <section className={DASHBOARD_SPOTLIGHT_SHELL}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
      <SpotlightSectionHeader eyebrow={badge} title={title} description={description} badge={badge} />
      <div className="px-5 pb-6 sm:px-8">
        <div className="mb-4 flex justify-end">
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-black/20 sm:p-5">
          <ChartResponsiveContainer
            token="overviewArea"
            minWidth={chartData.length > 8 ? Math.max(300, chartData.length * 28) : undefined}
          >
            <AreaChart data={displayChartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="friendMusicDesktopArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.34} />
                  <stop offset="48%" stopColor="#a78bfa" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#67e8f9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis
                dataKey="formattedDate"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                formatter={(value: number) => [
                  `${value.toLocaleString(locale)} ${listensLabel}`,
                  listensLabel,
                ]}
              />
              <Area
                type="monotone"
                dataKey="listens"
                stroke="#67e8f9"
                strokeWidth={3}
                fill="url(#friendMusicDesktopArea)"
                animationDuration={600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ChartResponsiveContainer>
        </div>
      </div>
    </section>
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
          stats={data.stats}
          topArtists={topArtists}
          topGenres={topGenres}
          topTracks={topTracks}
          chartData={chartData}
          emptyStats={emptyStats}
          showAggregatesHint={!emptyStats && data.shareScope === "aggregates"}
        />
      }
      desktop={
        <div className="space-y-8">
          <DuetSubNav />
          <div className={MUSIC_HERO_SHELL}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.16),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.65))]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <UserAvatar name={subjectName} src={subjectAvatar} size="lg" />
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {t("readOnlyBadge")}
                  </div>
                  <h1 className="text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl">
                    {t("bannerTitle", { name: subjectName })}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">{bannerLead}</p>
                  {dateRangeLabel ? (
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                      {dateRangeLabel}
                    </p>
                  ) : null}
                </div>
              </div>
              <Link
                href={compareHref}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 no-underline transition-all hover:-translate-y-0.5 hover:bg-gray-100"
              >
                <Swords className="h-4 w-4" aria-hidden />
                {t("compareCta")}
              </Link>
            </div>
          </div>

          {emptyStats ? (
            <EmptyState
              variant="startup"
              message={t("emptyStatsTitle")}
              description={t("emptyStatsDescription", { name: subjectName })}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                <OverviewStatsSection
                  totalListens={data.stats.totalListens}
                  uniqueArtists={data.stats.uniqueArtists}
                  uniqueTracks={data.stats.uniqueTracks}
                  totalPlayTime={data.stats.totalPlayTime}
                  changes={null}
                  showComparison={false}
                />
              </div>

              <FriendMusicTimelineCard
                title={t("timelineTitle")}
                description={t("timelineDescription", { name: subjectName })}
                badge={t("timelineBadge")}
                chartData={chartData}
                locale={locale}
                listensLabel={t("listens")}
              />

              {topArtists.length > 0 ? (
                <section className={DASHBOARD_SPOTLIGHT_SHELL}>
                  <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
                  <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
                  <SpotlightSectionHeader
                    eyebrow={t("topArtistsTitle")}
                    title={t("topArtistsTitle")}
                    description={t("topArtistsDescription", { name: subjectName })}
                    badge={t("pickerBadge")}
                  />
                  <LeaderList items={topArtists} locale={locale} listensLabel={t("listens")} />
                </section>
              ) : null}

              {topGenres.length > 0 ? (
                <section className={DASHBOARD_SPOTLIGHT_SHELL}>
                  <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} />
                  <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} />
                  <SpotlightSectionHeader
                    eyebrow={t("topGenresTitle")}
                    title={t("topGenresTitle")}
                    description={t("topGenresDescription", { name: subjectName })}
                    badge={t("pickerBadge")}
                  />
                  <LeaderList items={topGenres} locale={locale} listensLabel={t("listens")} />
                </section>
              ) : null}

              {data.shareScope === "aggregates" ? (
                <p
                  role="status"
                  className={`rounded-[1.35rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-6 dark:border-white/10 dark:bg-slate-950/60 ${DASHBOARD_SPOTLIGHT_MUTED}`}
                >
                  {t("aggregatesTracksHint")}{" "}
                  <Link
                    href={DUET_SHARE_SETTINGS_PATH}
                    className="font-semibold text-violet-600 no-underline underline-offset-2 hover:underline dark:text-violet-300"
                  >
                    {t("aggregatesTracksHintCta")}
                  </Link>
                </p>
              ) : null}

              {topTracks ? (
                <section className={DASHBOARD_SPOTLIGHT_SHELL} data-testid="duet-friend-music-top-tracks">
                  <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} />
                  <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} />
                  <SpotlightSectionHeader
                    eyebrow={t("topTracksTitle")}
                    title={t("topTracksTitle")}
                    description={t("topTracksDescription", { name: subjectName })}
                    badge={t("pickerBadge")}
                  />
                  {topTracks.length > 0 ? (
                    <LeaderList items={topTracks} locale={locale} listensLabel={t("listens")} />
                  ) : (
                    <p className={`px-5 pb-6 text-sm sm:px-8 ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                      {t("emptyStatsDescription", { name: subjectName })}
                    </p>
                  )}
                </section>
              ) : null}
            </>
          )}
        </div>
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
