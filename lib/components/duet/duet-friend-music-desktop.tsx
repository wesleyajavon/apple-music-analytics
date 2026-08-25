"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Eye, Swords, BarChart3, ListMusic, TrendingUp, type LucideIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
import type { FriendMusicChartPoint, FriendMusicLeaderItem } from "@/lib/components/duet/duet-friend-music-mobile";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { OverviewSectionHeader } from "@/lib/components/overview-section";
import { OverviewStatsSection } from "@/lib/components/overview-stats-section";
import {
  LIBRARY_LEADER_ACCENTS,
  TopLibraryCard,
} from "@/lib/components/overview-library-rankings";
import {
  DashboardSectionPanel,
  DashboardSectionSwitcher,
  useDashboardSectionView,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { DUET_SHARE_SETTINGS_PATH } from "@/lib/constants/duet-settings";
import type { OverviewStatsDto } from "@/lib/dto/listening";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";
import {
  applyListenTrendChartViewSingle,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";

const FRIEND_MUSIC_VIEWS = ["summary", "tops", "trends"] as const;
type FriendMusicView = (typeof FRIEND_MUSIC_VIEWS)[number];

const VIEW_ICONS: Record<FriendMusicView, LucideIcon> = {
  summary: BarChart3,
  tops: ListMusic,
  trends: TrendingUp,
};

function FriendMusicTimelinePanel({
  eyebrow,
  title,
  description,
  chartData,
  locale,
  listensLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
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
    <section className="relative">
      <OverviewSectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="rounded-[1.75rem] border border-card-border bg-surface-glass/60 p-4 backdrop-blur-sm sm:p-6">
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

export function DuetFriendMusicDesktopExperience({
  locale,
  compareHref,
  subjectName,
  subjectAvatar,
  bannerLead,
  badgeLabel,
  showPeriodHint,
  insight,
  genreName,
  stats,
  topArtists,
  topGenres,
  topTracks,
  chartData,
  emptyStats,
  showAggregatesHint,
  emptyNode,
}: {
  locale: string;
  compareHref: string;
  subjectName: string;
  subjectAvatar: string | null;
  bannerLead: string;
  badgeLabel: string;
  showPeriodHint: boolean;
  insight?: OverviewPrimaryInsight;
  genreName?: string;
  stats: OverviewStatsDto;
  topArtists: FriendMusicLeaderItem[];
  topGenres: FriendMusicLeaderItem[];
  topTracks: FriendMusicLeaderItem[] | null;
  chartData: FriendMusicChartPoint[];
  emptyStats: boolean;
  showAggregatesHint: boolean;
  emptyNode: ReactNode;
}) {
  const t = useTranslations("duet.friendMusic");
  const hasTops =
    topArtists.length > 0 || topGenres.length > 0 || (topTracks !== null && topTracks.length > 0);
  const hasTrends = chartData.length > 0;

  const availableViews = useMemo((): FriendMusicView[] => {
    const views: FriendMusicView[] = [];
    if (hasTops) views.push("tops");
    views.push("summary");
    if (hasTrends) views.push("trends");
    return views;
  }, [hasTops, hasTrends]);

  const fallbackView = availableViews.includes("tops")
    ? "tops"
    : (availableViews[0] ?? "summary");
  const { activeView, setView } = useDashboardSectionView(availableViews, fallbackView);
  const switcherItems: DashboardSectionItem<FriendMusicView>[] = availableViews.map((id) => ({
    id,
    label: t(`viewSwitcher.views.${id}`),
    icon: VIEW_ICONS[id],
  }));

  const libraryItems = {
    tracks: (topTracks ?? []).map((track) => ({
      id: track.id,
      title: track.title,
      subtitle: track.subtitle,
      count: track.count,
      percentage: track.percentage ?? 0,
    })),
    artists: topArtists.map((artist) => ({
      id: artist.id,
      title: artist.title,
      count: artist.count,
      percentage: artist.percentage ?? 0,
      imageUrl: artist.imageUrl,
    })),
    genres: topGenres.map((genre) => ({
      id: genre.id,
      title: genre.title,
      count: genre.count,
      percentage: genre.percentage ?? 0,
    })),
  };

  return (
    <div className="space-y-8">
      <DuetSubNav />
      <OverviewHeroFrame
        title={t("bannerTitle", { name: subjectName })}
        description={bannerLead}
        badgeLabel={badgeLabel}
        showPeriodHint={showPeriodHint}
        avatarUrl={subjectAvatar}
        insight={insight}
        genreName={genreName}
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {t("readOnlyBadge")}
          </span>
          <Link
            href={compareHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 no-underline transition-all hover:-translate-y-0.5 hover:bg-gray-100"
          >
            <Swords className="h-4 w-4" aria-hidden />
            {t("compareCta")}
          </Link>
        </div>
      </OverviewHeroFrame>

      {emptyStats ? (
        emptyNode
      ) : (
        <>
          <DashboardSectionSwitcher
            items={switcherItems}
            activeView={activeView}
            onChange={setView}
            idPrefix="friend-music-desktop"
            navLabel={t("viewSwitcher.navLabel")}
          />

          <DashboardSectionPanel
            view="summary"
            activeView={activeView}
            idPrefix="friend-music-desktop"
          >
            <section className="relative">
              <OverviewSectionHeader
                eyebrow={t("sections.summary.eyebrow")}
                title={t("sections.summary.title")}
                description={t("sections.summary.description", { name: subjectName })}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
                <OverviewStatsSection
                  totalListens={stats.totalListens}
                  uniqueArtists={stats.uniqueArtists}
                  uniqueTracks={stats.uniqueTracks}
                  totalPlayTime={stats.totalPlayTime}
                  changes={null}
                  showComparison={false}
                />
              </div>
            </section>
          </DashboardSectionPanel>

          {hasTops ? (
            <DashboardSectionPanel
              view="tops"
              activeView={activeView}
              idPrefix="friend-music-desktop"
            >
              <section className="relative">
                <OverviewSectionHeader
                  eyebrow={t("sections.tops.eyebrow")}
                  title={t("sections.tops.title")}
                  description={t("sections.tops.description", { name: subjectName })}
                />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  {libraryItems.tracks.length > 0 ? (
                    <div data-testid="duet-friend-music-top-tracks">
                      <TopLibraryCard
                        title={t("topTracksTitle")}
                        description={t("topTracksDescription", { name: subjectName })}
                        accent={LIBRARY_LEADER_ACCENTS.tracks}
                        items={libraryItems.tracks}
                        locale={locale}
                        listensLabel={t("listens")}
                      />
                    </div>
                  ) : null}
                  {libraryItems.artists.length > 0 ? (
                    <TopLibraryCard
                      title={t("topArtistsTitle")}
                      description={t("topArtistsDescription", { name: subjectName })}
                      accent={LIBRARY_LEADER_ACCENTS.artists}
                      items={libraryItems.artists}
                      locale={locale}
                      listensLabel={t("listens")}
                      showArtistAvatars
                    />
                  ) : null}
                  {libraryItems.genres.length > 0 ? (
                    <TopLibraryCard
                      title={t("topGenresTitle")}
                      description={t("topGenresDescription", { name: subjectName })}
                      accent={LIBRARY_LEADER_ACCENTS.genres}
                      items={libraryItems.genres}
                      locale={locale}
                      listensLabel={t("listens")}
                      showPercentage
                    />
                  ) : null}
                </div>
                {showAggregatesHint ? (
                  <p
                    role="status"
                    className="mt-5 rounded-[1.35rem] border border-slate-200/80 bg-white px-5 py-4 text-sm leading-6 text-muted dark:border-white/10 dark:bg-slate-950/60"
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
                {topTracks !== null && topTracks.length === 0 ? (
                  <p
                    className="mt-5 rounded-[1.35rem] border border-slate-200/80 bg-white px-5 py-4 text-sm text-muted dark:border-white/10 dark:bg-slate-950/60"
                    data-testid="duet-friend-music-top-tracks"
                  >
                    {t("emptyStatsDescription", { name: subjectName })}
                  </p>
                ) : null}
              </section>
            </DashboardSectionPanel>
          ) : null}

          {hasTrends ? (
            <DashboardSectionPanel
              view="trends"
              activeView={activeView}
              idPrefix="friend-music-desktop"
            >
              <FriendMusicTimelinePanel
                eyebrow={t("sections.trends.eyebrow")}
                title={t("sections.trends.title")}
                description={t("sections.trends.description", { name: subjectName })}
                chartData={chartData}
                locale={locale}
                listensLabel={t("listens")}
              />
            </DashboardSectionPanel>
          ) : null}
        </>
      )}
    </div>
  );
}
