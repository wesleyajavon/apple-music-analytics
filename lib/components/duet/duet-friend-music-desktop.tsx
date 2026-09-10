"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Eye, Swords } from "lucide-react";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
import type { FriendMusicChartPoint, FriendMusicLeaderItem } from "@/lib/components/duet/duet-friend-music-mobile";
import { FriendMusicReplayTopsSections } from "@/lib/components/duet/duet-friend-music-replay-tops";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  DashboardSectionPanel,
  DashboardSectionSwitcher,
  useDashboardSectionView,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import { DASHBOARD_BTN_GHOST } from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useTheme } from "@/lib/providers/theme-provider";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";
import {
  applyListenTrendChartViewSingle,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";

const FRIEND_MUSIC_VIEWS = ["tops", "trends"] as const;
type FriendMusicView = (typeof FRIEND_MUSIC_VIEWS)[number];

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
  const { resolvedTheme } = useTheme();
  const chartThemeMode = resolvedTheme === "dark" ? "dark" : "light";
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewSingle(chartData, chartView, "listens"),
    [chartData, chartView]
  );

  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${listensLabel}`,
    [locale, listensLabel]
  );

  const series = useMemo(
    () => [
      {
        dataKey: "listens",
        name: listensLabel,
        color: getCrystalSeriesColor(2, chartThemeMode),
      },
    ],
    [chartThemeMode, listensLabel]
  );

  if (chartData.length === 0) return null;

  return (
    <section className="relative min-h-[240px] w-full min-w-0 sm:min-h-[280px] lg:min-h-[320px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">{eyebrow}</p>
          <h2 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
        </div>
        <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
      </div>
      <div className="mt-6">
        <OverviewTrendsChart
          data={displayChartData}
          series={series}
          formatValue={formatValue}
          heightToken="overviewArea"
          minWidth={chartData.length > 8 ? Math.max(300, chartData.length * 28) : undefined}
        />
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
  insight,
  topArtists,
  topGenres,
  topTracks,
  chartData,
  emptyStats,
  showAggregatesHint,
  emptyNode,
  onOpenArtistInsights,
}: {
  locale: string;
  compareHref: string;
  subjectName: string;
  subjectAvatar: string | null;
  bannerLead: string;
  insight?: OverviewPrimaryInsight;
  topArtists: FriendMusicLeaderItem[];
  topGenres: FriendMusicLeaderItem[];
  topTracks: FriendMusicLeaderItem[] | null;
  chartData: FriendMusicChartPoint[];
  emptyStats: boolean;
  showAggregatesHint: boolean;
  emptyNode: ReactNode;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("duet.friendMusic");
  const hasTops =
    topArtists.length > 0 || topGenres.length > 0 || (topTracks !== null && topTracks.length > 0);
  const hasTrends = chartData.length > 0;

  const availableViews = useMemo((): FriendMusicView[] => {
    const views: FriendMusicView[] = [];
    if (hasTops) views.push("tops");
    if (hasTrends) views.push("trends");
    return views;
  }, [hasTops, hasTrends]);

  const fallbackView = availableViews.includes("tops")
    ? "tops"
    : (availableViews[0] ?? "tops");
  const { activeView, setView } = useDashboardSectionView(availableViews, fallbackView);
  const switcherItems: DashboardSectionItem<FriendMusicView>[] = availableViews.map((id) => ({
    id,
    label: t(`viewSwitcher.views.${id}`),
  }));

  return (
    <div className="space-y-8">
      <DuetSubNav />
      <OverviewHeroFrame
        title={t("bannerTitle", { name: subjectName })}
        description={bannerLead}
        avatarUrl={subjectAvatar}
        insight={
          insight
            ? {
                ...insight,
                subtitle:
                  topTracks?.[0] && insight.title === topTracks[0].title
                    ? (topTracks[0].subtitle ?? "")
                    : "",
              }
            : undefined
        }
      >
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-muted">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {t("readOnlyBadge")}
          </span>
          <Link href={compareHref} className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline`}>
            <Swords className="h-4 w-4" aria-hidden />
            {t("compareCta")}
          </Link>
        </div>
      </OverviewHeroFrame>

      {emptyStats ? (
        emptyNode
      ) : (
        <>
          {switcherItems.length > 0 ? (
            <DashboardSectionSwitcher
              items={switcherItems}
              activeView={activeView}
              onChange={setView}
              idPrefix="friend-music-desktop"
              navLabel={t("viewSwitcher.navLabel")}
            />
          ) : null}

          {hasTops ? (
            <DashboardSectionPanel
              view="tops"
              activeView={activeView}
              idPrefix="friend-music-desktop"
            >
              <FriendMusicReplayTopsSections
                locale={locale}
                subjectName={subjectName}
                topArtists={topArtists}
                topGenres={topGenres}
                topTracks={topTracks}
                showAggregatesHint={showAggregatesHint}
                emptyTracksMessage={t("emptyStatsDescription", { name: subjectName })}
                onOpenArtistInsights={onOpenArtistInsights}
              />
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
