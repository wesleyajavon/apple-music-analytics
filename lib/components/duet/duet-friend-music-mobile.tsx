"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ListMusic, TrendingUp, type LucideIcon } from "lucide-react";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { OverviewMobileHero } from "@/lib/components/overview-hero";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DuetMobileSubNav } from "@/lib/components/duet/duet-mobile-sub-nav";
import { SpotlightRankBubble } from "@/lib/components/overview-library-rankings";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { getDuetDisplayName, getDuetFriendFromFriendship } from "@/lib/components/duet/duet-utils";
import {
  DashboardSectionPanel,
  DashboardSectionSwitcher,
  useDashboardSectionView,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import { TimelineMobileSpark } from "@/lib/components/timeline-mobile-spark";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { DUET_SHARE_SETTINGS_PATH } from "@/lib/constants/duet-settings";
import type { FriendshipDto } from "@/lib/dto/duet";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 lg:hidden max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+5.75rem))]";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const ROW_CLASS =
  "flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3 py-2 text-left";

const FRIEND_MUSIC_VIEWS = ["tops", "trends"] as const;
type FriendMusicView = (typeof FRIEND_MUSIC_VIEWS)[number];

const VIEW_ICONS: Record<FriendMusicView, LucideIcon> = {
  tops: ListMusic,
  trends: TrendingUp,
};

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

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </article>
  );
}

export type FriendMusicLeaderItem = {
  id: string;
  title: string;
  subtitle?: string;
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
  children,
}: {
  locale: string;
  heading: string;
  children?: ReactNode;
}) {
  const tm = useTranslations("duet.friendMusic.mobile");
  const { startDate, endDate } = useListenDateRange();

  return (
    <section className={HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-4">
        <div className="flex justify-end">
          <MusicalProfilePeriodBadge
            startDate={startDate}
            endDate={endDate}
            locale={locale}
            variant="mobile"
            className="min-w-0"
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {tm("eyebrow")}
          </p>
          <h1 className="mt-1 max-w-[18rem] text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {heading}
          </h1>
        </div>
        {children}
      </div>
    </section>
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
    <ul className="space-y-2">
      {friends.map((friendship) => {
        const peer = getDuetFriendFromFriendship(friendship, viewerId);
        const name = getDuetDisplayName(peer);
        return (
          <li key={friendship.id}>
            <Link href={hrefForFriend(peer.id)} className={`${ROW_CLASS} no-underline`}>
              <UserAvatar name={name} src={peer.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</span>
              <span className="text-xs font-semibold text-muted">{trailing}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LeaderRows({
  items,
  locale,
  listensLabel,
  showArtistAvatars = false,
}: {
  items: FriendMusicLeaderItem[];
  locale: string;
  listensLabel: string;
  showArtistAvatars?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={item.id} className={ROW_CLASS}>
          <SpotlightRankBubble rank={index + 1} />
          {showArtistAvatars ? (
            <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-card-border">
              <ArtistAvatarHydrated
                artistId={item.id}
                artistName={item.title}
                imageUrl={item.imageUrl}
                avatarApiSize={80}
                colorIndex={index}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
            {item.subtitle ? (
              <p className="truncate text-xs text-muted">{item.subtitle}</p>
            ) : null}
          </div>
          <p className="shrink-0 text-xs font-semibold tabular-nums text-muted">
            {item.count.toLocaleString(locale)} {listensLabel}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function DuetFriendMusicMobileSkeleton({ locale }: { locale: string }) {
  const tm = useTranslations("duet.friendMusic.mobile");

  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <HeroFrame locale={locale} heading={tm("title")}>
        <div className="h-11 animate-pulse rounded-xl bg-white/15" />
      </HeroFrame>
      <section className="space-y-2 px-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
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
      <HeroFrame locale={locale} heading={tm("gatedTitle")}>
        <DuetMobileSubNav current="music" withFilters={withFilters} />
        <p className="max-w-sm text-sm leading-6 text-white/70">{tm("gatedLead")}</p>
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 no-underline"
        >
          {t("gatedCta")}
        </Link>
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
      <HeroFrame locale={locale} heading={tm("title")}>
        <DuetMobileSubNav current="music" withFilters={withFilters} />
        <p className="text-sm leading-6 text-white/70">{tm("errorLead")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
        >
          {tCommon("retry")}
        </button>
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
  const tm = useTranslations("duet.friendMusic.mobile");
  const t = useTranslations("duet.friendMusic");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("title")}>
        <DuetMobileSubNav current="music" withFilters={withFilters} />
        <p className="text-sm font-semibold leading-6 text-white">{title}</p>
        <p className="text-sm leading-6 text-white/70">{description}</p>
        <Link
          href={withFilters("/dashboard/duet/friends")}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 no-underline"
        >
          {t("goToFriends")}
        </Link>
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
      <HeroFrame locale={locale} heading={t("selectFriendTitle")}>
        <DuetMobileSubNav current="music" withFilters={withFilters} />
      </HeroFrame>
      <section className="space-y-2 px-4" aria-label={tm("friendsListLabel")}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {tm("pickFriendTitle")}
        </h2>
        <FriendPickerList
          friends={friends}
          viewerId={viewerId}
          hrefForFriend={hrefForFriend}
          trailing={t("openMusicCta")}
          empty={
            <div className="space-y-3">
              <p className="rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
                {tm("emptyLead")}
              </p>
              <Link
                href={withFilters("/dashboard/duet/friends")}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-gray-950 px-4 text-sm font-bold text-white no-underline dark:bg-white dark:text-gray-950"
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
    icon: VIEW_ICONS[id],
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {t("readOnlyBadge")}
          </p>
          <p className="text-sm leading-5 text-white/75">{bannerLead}</p>
          <Link
            href={compareHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 no-underline"
          >
            {tm("compareCta")}
          </Link>
        </div>
      </OverviewMobileHero>

      {emptyStats ? (
        <p className="mx-4 rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
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
              <div className="space-y-4 px-4">
                {topArtists.length > 0 ? (
                  <section className="space-y-2">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {tm("artistsLabel")}
                    </h2>
                    <LeaderRows
                      items={topArtists}
                      locale={locale}
                      listensLabel={t("listens")}
                      showArtistAvatars
                    />
                  </section>
                ) : null}
                {showAggregatesHint ? (
                  <div className="space-y-3">
                    <p className="rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
                      {t("aggregatesTracksHint")}
                    </p>
                    <Link
                      href={DUET_SHARE_SETTINGS_PATH}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-card-border bg-card-surface px-4 text-sm font-bold text-foreground no-underline"
                    >
                      {t("aggregatesTracksHintCta")}
                    </Link>
                  </div>
                ) : null}
                {topTracks ? (
                  <section className="space-y-2" data-testid="duet-friend-music-top-tracks">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {tm("tracksLabel")}
                    </h2>
                    {topTracks.length > 0 ? (
                      <LeaderRows items={topTracks} locale={locale} listensLabel={t("listens")} />
                    ) : (
                      <p className="rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
                        {t("emptyStatsDescription", { name: subjectName })}
                      </p>
                    )}
                  </section>
                ) : null}
                {topGenres.length > 0 ? (
                  <section className="space-y-2">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {tm("genresLabel")}
                    </h2>
                    <LeaderRows items={topGenres} locale={locale} listensLabel={t("listens")} />
                  </section>
                ) : null}
              </div>
            </DashboardSectionPanel>
          ) : null}

          {hasTrends && trendSummary ? (
            <DashboardSectionPanel
              view="trends"
              activeView={activeView}
              idPrefix="friend-music-mobile"
            >
              <div className="space-y-4">
                <section className="px-4" aria-label={tm("signalsLabel")}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {tm("signalsLabel")}
                  </p>
                  <div className={SNAP_RAIL}>
                    <SignalTile
                      label={tm("railTotal")}
                      value={trendSummary.total.toLocaleString(locale)}
                    />
                    <SignalTile
                      label={tm("railPeak")}
                      value={trendSummary.peak.listens.toLocaleString(locale)}
                    />
                    <SignalTile
                      label={tm("average")}
                      value={Math.round(trendSummary.average).toLocaleString(locale)}
                    />
                    <SignalTile label={tm("trend")} value={trendLabel} />
                  </div>
                </section>

                <section className="space-y-2 px-4">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {tm("sparkTitle")}
                  </h2>
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

                <section className="space-y-2 px-4">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {tm("bucketsTitle")}
                  </h2>
                  {trendSummary.topBuckets.map((bucket, index) => (
                    <div
                      key={`${bucket.formattedDate}-${index}`}
                      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
                    >
                      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {bucket.formattedDate}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {bucket.listens.toLocaleString(locale)}
                      </span>
                      <span className="sr-only">{t("listens")}</span>
                    </div>
                  ))}
                </section>
              </div>
            </DashboardSectionPanel>
          ) : null}
        </>
      )}
    </div>
  );
}
