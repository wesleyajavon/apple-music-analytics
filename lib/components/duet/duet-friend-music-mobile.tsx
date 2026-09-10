"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
} from "@/lib/components/dashboard-ui";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { OverviewHeroFrame, OverviewMobileHero } from "@/lib/components/overview-hero";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DuetMobileSubNav } from "@/lib/components/duet/duet-mobile-sub-nav";
import { FriendMusicReplayTopsSections } from "@/lib/components/duet/duet-friend-music-replay-tops";
import { getDuetDisplayName, getDuetFriendFromFriendship } from "@/lib/components/duet/duet-utils";
import {
  DashboardSectionPanel,
  DashboardSectionSwitcher,
  useDashboardSectionView,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import { TimelineMobileSpark } from "@/lib/components/timeline-mobile-spark";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { FriendshipDto } from "@/lib/dto/duet";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 lg:hidden max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+5.75rem))]";
const ROW_CLASS = `${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} no-underline text-foreground`;

const FRIEND_MUSIC_VIEWS = ["tops", "trends"] as const;
type FriendMusicView = (typeof FRIEND_MUSIC_VIEWS)[number];

type FriendMusicTrendSummary = {
  total: number;
  peak: FriendMusicChartPoint;
  average: number;
  trendDirection: "up" | "down" | "flat";
  topBuckets: FriendMusicChartPoint[];
};

function getFriendMusicTrendSummary(data: FriendMusicChartPoint[]): FriendMusicTrendSummary | null {
  if (data.length === 0) return null;

  const total = data.reduce((sum, point) => sum + point.listens, 0);
  const peak = data.reduce((current, point) =>
    point.listens > current.listens ? point : current,
  );
  const first = data[0]?.listens ?? 0;
  const last = data[data.length - 1]?.listens ?? 0;
  const trendDelta = last - first;
  const trendDirection: FriendMusicTrendSummary["trendDirection"] =
    Math.abs(trendDelta) < 1 ? "flat" : trendDelta > 0 ? "up" : "down";

  return {
    total,
    peak,
    average: total / data.length,
    trendDirection,
    topBuckets: [...data].sort((a, b) => b.listens - a.listens).slice(0, 5),
  };
}

function SignalCell({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${DASHBOARD_METRIC_CELL} min-w-[6.5rem] shrink-0`}>
      <p className={`${DASHBOARD_METRIC_VALUE} text-xl`}>{value}</p>
      <p className={DASHBOARD_METRIC_LABEL}>{label}</p>
    </div>
  );
}

export type FriendMusicLeaderItem = {
  id: string;
  title: string;
  subtitle?: string;
  /** Present on track leaders so Replay tiles can open artist insights. */
  artistId?: string;
  count: number;
  percentage?: number;
  imageUrl?: string | null;
};

export type FriendMusicChartPoint = {
  formattedDate: string;
  listens: number;
};

function HeroFrame({
  locale,
  heading,
  description,
  children,
}: {
  locale: string;
  heading: string;
  description?: string;
  children?: ReactNode;
}) {
  const { startDate, endDate } = useListenDateRange();

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="flex justify-end">
        <MusicalProfilePeriodBadge
          startDate={startDate}
          endDate={endDate}
          locale={locale}
          variant="mobile"
          className="min-w-0"
        />
      </div>
      <OverviewHeroFrame compact title={heading} description={description}>
        {children}
      </OverviewHeroFrame>
    </div>
  );
}

function FriendPickerList({
  friends,
  viewerId,
  hrefForFriend,
  trailing,
  empty,
}: {
  friends: FriendshipDto[];
  viewerId: string;
  hrefForFriend: (friendId: string) => string;
  trailing: string;
  empty: ReactNode;
}) {
  if (friends.length === 0) return <>{empty}</>;

  return (
    <ul>
      {friends.map((friendship) => {
        const peer = getDuetFriendFromFriendship(friendship, viewerId);
        const name = getDuetDisplayName(peer);
        return (
          <li key={friendship.id}>
            <Link href={hrefForFriend(peer.id)} className={ROW_CLASS}>
              <UserAvatar name={name} src={peer.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</span>
              <span className="text-[13px] font-medium text-muted">{trailing}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DuetFriendMusicMobileSkeleton({ locale }: { locale: string }) {
  const tm = useTranslations("duet.friendMusic.mobile");

  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <HeroFrame locale={locale} heading={tm("title")}>
        <div className="h-11 animate-pulse rounded-xl bg-slate-200/90 dark:bg-white/10" />
      </HeroFrame>
      <section className="space-y-0 px-4" aria-hidden>
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className={`flex items-center gap-3 py-3 ${DASHBOARD_LIST_SEPARATOR}`}>
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200/90 dark:bg-white/10" />
            <div className="h-4 flex-1 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
          </div>
        ))}
      </section>
    </div>
  );
}

export function DuetFriendMusicMobileGated({
  locale,
  withFilters,
}: {
  locale: string;
  withFilters: (href: string) => string;
}) {
  const tm = useTranslations("duet.friendMusic.mobile");
  const t = useTranslations("duet.friendMusic");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("gatedTitle")} description={tm("gatedLead")}>
        <div className="mt-4 space-y-3">
          <DuetMobileSubNav current="music" withFilters={withFilters} />
          <Link
            href="/sign-in"
            className={`${DASHBOARD_BTN_GHOST} w-full no-underline text-foreground`}
          >
            {t("gatedCta")}
          </Link>
        </div>
      </HeroFrame>
    </div>
  );
}

export function DuetFriendMusicMobileError({
  locale,
  withFilters,
  onRetry,
}: {
  locale: string;
  withFilters: (href: string) => string;
  onRetry: () => void;
}) {
  const tm = useTranslations("duet.friendMusic.mobile");
  const tCommon = useTranslations("common");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("title")} description={tm("errorLead")}>
        <div className="mt-4 space-y-3">
          <DuetMobileSubNav current="music" withFilters={withFilters} />
          <button
            type="button"
            onClick={onRetry}
            className={`${DASHBOARD_BTN_GHOST} w-full text-foreground`}
          >
            {tCommon("retry")}
          </button>
        </div>
      </HeroFrame>
    </div>
  );
}

export function DuetFriendMusicMobileUnavailable({
  locale,
  withFilters,
  title,
  description,
}: {
  locale: string;
  withFilters: (href: string) => string;
  title: string;
  description: string;
}) {
  const t = useTranslations("duet.friendMusic");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={title} description={description}>
        <div className="mt-4 space-y-3">
          <DuetMobileSubNav current="music" withFilters={withFilters} />
          <Link
            href={withFilters("/dashboard/duet/friends")}
            className={`${DASHBOARD_BTN_GHOST} w-full no-underline text-foreground`}
          >
            {t("goToFriends")}
          </Link>
        </div>
      </HeroFrame>
    </div>
  );
}

export function DuetFriendMusicMobilePicker({
  locale,
  viewerId,
  friends,
  hrefForFriend,
  withFilters,
}: {
  locale: string;
  viewerId: string;
  friends: FriendshipDto[];
  hrefForFriend: (friendId: string) => string;
  withFilters: (href: string) => string;
}) {
  const tm = useTranslations("duet.friendMusic.mobile");
  const t = useTranslations("duet.friendMusic");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame
        locale={locale}
        heading={t("selectFriendTitle")}
        description={t("pickerDescription")}
      >
        <div className="mt-4">
          <DuetMobileSubNav current="music" withFilters={withFilters} />
        </div>
      </HeroFrame>
      <section className="space-y-2 px-4" aria-label={tm("friendsListLabel")}>
        <h2 className="text-[13px] font-medium text-muted">{tm("pickFriendTitle")}</h2>
        <FriendPickerList
          friends={friends}
          viewerId={viewerId}
          hrefForFriend={hrefForFriend}
          trailing={t("openMusicCta")}
          empty={
            <div className="space-y-3 py-2">
              <p className="text-[13px] leading-6 text-muted">{tm("emptyLead")}</p>
              <Link
                href={withFilters("/dashboard/duet/friends")}
                className={`${DASHBOARD_BTN_GHOST} w-full no-underline text-foreground`}
              >
                {t("goToFriends")}
              </Link>
            </div>
          }
        />
      </section>
    </div>
  );
}

export function DuetFriendMusicMobileExperience({
  locale,
  withFilters,
  compareHref,
  subjectName,
  subjectAvatar,
  bannerLead,
  insight,
  genreName,
  topArtists,
  topGenres,
  topTracks,
  chartData,
  emptyStats,
  showAggregatesHint,
  onOpenArtistInsights,
}: {
  locale: string;
  withFilters: (href: string) => string;
  compareHref: string;
  subjectName: string;
  subjectAvatar: string | null;
  bannerLead: string;
  insight?: OverviewPrimaryInsight;
  genreName?: string;
  topArtists: FriendMusicLeaderItem[];
  topGenres: FriendMusicLeaderItem[];
  topTracks: FriendMusicLeaderItem[] | null;
  chartData: FriendMusicChartPoint[];
  emptyStats: boolean;
  showAggregatesHint: boolean;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("duet.friendMusic");
  const tm = useTranslations("duet.friendMusic.mobile");
  const trendSummary = useMemo(() => getFriendMusicTrendSummary(chartData), [chartData]);

  const hasTops =
    topArtists.length > 0 || topGenres.length > 0 || (topTracks !== null && topTracks.length > 0);
  const hasTrends = chartData.length > 0 && trendSummary != null;
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

  const trendLabel =
    trendSummary?.trendDirection === "up"
      ? tm("trendUp")
      : trendSummary?.trendDirection === "down"
        ? tm("trendDown")
        : tm("trendFlat");

  return (
    <div className={MOBILE_BLEED}>
      <OverviewMobileHero
        title={subjectName}
        avatarUrl={subjectAvatar}
        insight={insight}
        genreName={genreName}
      >
        <div className="mt-3 space-y-3">
          <DuetMobileSubNav current="music" withFilters={withFilters} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {t("readOnlyBadge")}
          </p>
          <p className="text-sm leading-5 text-muted">{bannerLead}</p>
          <Link
            href={compareHref}
            className={`${DASHBOARD_BTN_OUTLINE} w-full no-underline`}
          >
            {tm("compareCta")}
          </Link>
        </div>
      </OverviewMobileHero>

      {emptyStats ? (
        <p className="mx-4 text-[13px] leading-6 text-muted">
          {t("emptyStatsDescription", { name: subjectName })}
        </p>
      ) : (
        <>
          {switcherItems.length > 0 ? (
            <div className="px-4">
              <DashboardSectionSwitcher
                items={switcherItems}
                activeView={activeView}
                onChange={setView}
                idPrefix="friend-music-mobile"
                navLabel={t("viewSwitcher.navLabel")}
              />
            </div>
          ) : null}

          {hasTops ? (
            <DashboardSectionPanel
              view="tops"
              activeView={activeView}
              idPrefix="friend-music-mobile"
            >
              <div className="px-4">
                <FriendMusicReplayTopsSections
                  locale={locale}
                  subjectName={subjectName}
                  topArtists={topArtists}
                  topGenres={topGenres}
                  topTracks={topTracks}
                  showAggregatesHint={showAggregatesHint}
                  emptyTracksMessage={t("emptyStatsDescription", { name: subjectName })}
                  onOpenArtistInsights={onOpenArtistInsights}
                  className="space-y-8"
                />
              </div>
            </DashboardSectionPanel>
          ) : null}

          {hasTrends && trendSummary ? (
            <DashboardSectionPanel
              view="trends"
              activeView={activeView}
              idPrefix="friend-music-mobile"
            >
              <div className="space-y-6">
                <section className="px-4" aria-label={tm("signalsLabel")}>
                  <p className="mb-3 text-[13px] font-medium text-muted">{tm("signalsLabel")}</p>
                  <div
                    className={`${DASHBOARD_METRIC_STRIP} -mx-4 gap-0 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
                  >
                    <SignalCell
                      label={tm("railTotal")}
                      value={trendSummary.total.toLocaleString(locale)}
                    />
                    <SignalCell
                      label={tm("railPeak")}
                      value={trendSummary.peak.listens.toLocaleString(locale)}
                    />
                    <SignalCell
                      label={tm("average")}
                      value={Math.round(trendSummary.average).toLocaleString(locale)}
                    />
                    <SignalCell label={tm("trend")} value={trendLabel} />
                  </div>
                </section>

                <section className="space-y-2 px-4">
                  <h2 className="text-[13px] font-medium text-muted">{tm("sparkTitle")}</h2>
                  <TimelineMobileSpark
                    data={chartData}
                    ariaLabel={tm("sparkAria")}
                    startLabel={chartData[0]?.formattedDate ?? ""}
                    peakCaption={tm("sparkPeakCaption", {
                      date: trendSummary.peak.formattedDate,
                    })}
                    endLabel={chartData[chartData.length - 1]?.formattedDate ?? ""}
                    gradientId="friendMusicMobileSparkline"
                  />
                </section>

                <section className="px-4">
                  <h2 className="mb-1 text-[13px] font-medium text-muted">{tm("bucketsTitle")}</h2>
                  <ul>
                    {trendSummary.topBuckets.map((bucket, index) => (
                      <li
                        key={`${bucket.formattedDate}-${index}`}
                        className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}
                      >
                        <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {bucket.formattedDate}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {bucket.listens.toLocaleString(locale)}
                        </span>
                        <span className="sr-only">{t("listens")}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </DashboardSectionPanel>
          ) : null}
        </>
      )}
    </div>
  );
}
