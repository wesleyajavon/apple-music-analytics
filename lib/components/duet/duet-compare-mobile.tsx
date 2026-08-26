"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { UserAvatar } from "@/lib/components/user-avatar";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { DuetMobileSubNav } from "@/lib/components/duet/duet-mobile-sub-nav";
import {
  DuetDualLineChart,
  EntityBattleShareActions,
  applyDuetChartView,
  type DualLineChartPoint,
  type DuetChartViewMode,
} from "@/lib/components/duet/duet-entity-duel-blocks";
import { DuetChartViewToggle } from "@/lib/components/duet/duet-chart-view-toggle";
import type { DuetArenaMode } from "@/lib/components/duet/duet-battle-arena-ui";
import type { PeriodType } from "@/lib/components/period-selector";
import type { DuetCompareSection } from "@/lib/components/duet/duet-compare-section-tabs";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import { duetShareHeadlineKey } from "@/lib/utils/duet-share-headline";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { DASHBOARD_CHART_THEME } from "@/lib/constants/dashboard-spotlight";
import type {
  CompareEntityResponse,
  CompareSharedArtistItem,
  FriendshipDto,
} from "@/lib/dto/duet";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 lg:hidden max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+5.75rem))]";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const ROW_CLASS =
  "flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3 py-2 text-left no-underline";
const SEGMENT_SHELL =
  "flex gap-1 overflow-x-auto rounded-2xl border border-card-border bg-card-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

type Suggestion = { id: string; label: string; subtitle?: string };

type ViewerLite = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getPeer(friendship: FriendshipDto, viewerId: string) {
  return friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
}

function formatCount(value: number, locale: string) {
  return value.toLocaleString(locale);
}

function HeroFrame({
  locale,
  heading,
  children,
}: {
  locale: string;
  heading: string;
  children?: ReactNode;
}) {
  const tm = useTranslations("duet.compare.mobile");
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

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[9.75rem] snap-start rounded-3xl border border-white/15 bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className={SEGMENT_SHELL}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold ${
              selected ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950" : "text-muted"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FaceOffRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{leftLabel}</p>
        <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{leftValue}</p>
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{rightLabel}</p>
        <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{rightValue}</p>
      </div>
    </div>
  );
}

function FriendList({
  friends,
  viewerId,
  hrefForFriend,
  onSelect,
  empty,
  trailing,
}: {
  friends: FriendshipDto[];
  viewerId: string;
  hrefForFriend?: (friendId: string) => string;
  onSelect?: (friendId: string) => void;
  empty: ReactNode;
  trailing?: string;
}) {
  if (friends.length === 0) return <>{empty}</>;

  return (
    <ul className="space-y-2">
      {friends.map((friendship) => {
        const peer = getPeer(friendship, viewerId);
        const name = getDuetDisplayName(peer);
        const body = (
          <>
            <UserAvatar name={name} src={peer.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</span>
            {trailing ? <span className="text-xs font-semibold text-muted">{trailing}</span> : null}
            <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
          </>
        );
        return (
          <li key={friendship.id}>
            {onSelect ? (
              <button type="button" className={ROW_CLASS} onClick={() => onSelect(peer.id)}>
                {body}
              </button>
            ) : (
              <Link href={hrefForFriend?.(peer.id) ?? "#"} className={ROW_CLASS}>
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MobileChart({
  data,
  chartView,
  period,
  locale,
  resolvedTheme,
  selfLabel,
  friendLabel,
}: {
  data: DualLineChartPoint[];
  chartView: DuetChartViewMode;
  period: PeriodType;
  locale: string;
  resolvedTheme: string;
  selfLabel: string;
  friendLabel: string;
}) {
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const displayed = useMemo(() => applyDuetChartView(data, chartView), [data, chartView]);

  return (
    <div className="h-56 overflow-hidden rounded-2xl border border-card-border bg-card-surface p-2">
      <DuetDualLineChart
        data={displayed}
        period={period}
        locale={locale}
        chartTheme={chartTheme}
        resolvedTheme={resolvedTheme}
        selfLabel={selfLabel}
        friendLabel={friendLabel}
      />
    </div>
  );
}

export function DuetCompareMobileSkeleton({ locale }: { locale: string }) {
  const tm = useTranslations("duet.compare.mobile");

  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <HeroFrame locale={locale} heading={tm("title")}>
        <div className="h-11 animate-pulse rounded-xl bg-white/15" />
      </HeroFrame>
      <section className="space-y-2 px-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </section>
    </div>
  );
}

export function DuetCompareMobileGated({
  locale,
  withFilters,
}: {
  locale: string;
  withFilters: (href: string) => string;
}) {
  const tm = useTranslations("duet.compare.mobile");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("gatedTitle")}>
        <DuetMobileSubNav current="compare" withFilters={withFilters} />
        <p className="max-w-sm text-sm leading-6 text-white/70">{tm("gatedLead")}</p>
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 no-underline"
        >
          {tm("gatedCta")}
        </Link>
      </HeroFrame>
    </div>
  );
}

export function DuetCompareMobileError({
  locale,
  withFilters,
  onRetry,
}: {
  locale: string;
  withFilters: (href: string) => string;
  onRetry: () => void;
}) {
  const tm = useTranslations("duet.compare.mobile");
  const tCommon = useTranslations("common");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("title")}>
        <DuetMobileSubNav current="compare" withFilters={withFilters} />
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

export function DuetCompareMobileUnavailable({
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
  const tm = useTranslations("duet.compare.mobile");
  const t = useTranslations("duet.compare");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("title")}>
        <DuetMobileSubNav current="compare" withFilters={withFilters} />
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

export function DuetCompareMobilePicker({
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
  const tm = useTranslations("duet.compare.mobile");
  const t = useTranslations("duet.compare");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("title")}>
        <DuetMobileSubNav current="compare" withFilters={withFilters} />
      </HeroFrame>
      <section className="space-y-2 px-4" aria-label={tm("friendsListLabel")}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {tm("pickFriendTitle")}
        </h2>
        <FriendList
          friends={friends}
          viewerId={viewerId}
          hrefForFriend={hrefForFriend}
          trailing={t("challengeCta")}
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

export function DuetCompareMobileExperience({
  locale,
  viewer,
  friendName,
  friendAvatarUrl,
  friends,
  hrefForFriend,
  withFilters,
  seeMusicHref,
  onSelectFriend,
  activeSection,
  onSectionChange,
  selfTotal,
  friendTotal,
  rangeClamped,
  metadataBanner,
  chartData,
  period,
  resolvedTheme,
  chartView,
  onChartViewChange,
  shareActions,
  sharedArtists,
  sharedLoading,
  sharedError,
  onRetryShared,
  onCompareArtist,
  arenaMode,
  onArenaModeChange,
  searchQuery,
  onSearchQueryChange,
  suggestions,
  showSuggestions,
  selectedEntityLabel,
  selectedEntitySubtitle,
  onSelectEntity,
  onClearEntity,
  entityCompare,
  entityChartData,
  entityLoading,
  entityError,
  onRetryEntity,
}: {
  locale: string;
  viewer: ViewerLite;
  friendName: string;
  friendAvatarUrl: string | null;
  friends: FriendshipDto[];
  hrefForFriend: (friendId: string) => string;
  withFilters: (href: string) => string;
  seeMusicHref?: string | null;
  onSelectFriend: (friendId: string) => void;
  activeSection: DuetCompareSection;
  onSectionChange: (section: DuetCompareSection) => void;
  selfTotal: number;
  friendTotal: number;
  rangeClamped: boolean;
  metadataBanner?: ReactNode;
  chartData: DualLineChartPoint[];
  period: PeriodType;
  resolvedTheme: string;
  chartView: DuetChartViewMode;
  onChartViewChange: (mode: DuetChartViewMode) => void;
  shareActions?: ReactNode;
  sharedArtists?: CompareSharedArtistItem[];
  sharedLoading: boolean;
  sharedError: boolean;
  onRetryShared: () => void;
  onCompareArtist: (artistId: string, artistName: string) => void;
  arenaMode: DuetArenaMode | null;
  onArenaModeChange: (mode: DuetArenaMode) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  suggestions: Suggestion[];
  showSuggestions: boolean;
  selectedEntityLabel: string;
  selectedEntitySubtitle?: string;
  onSelectEntity: (id: string, label: string) => void;
  onClearEntity: () => void;
  entityCompare?: CompareEntityResponse;
  entityChartData: DualLineChartPoint[];
  entityLoading: boolean;
  entityError: boolean;
  onRetryEntity: () => void;
}) {
  const t = useTranslations("duet.compare");
  const tm = useTranslations("duet.compare.mobile");
  const tCommon = useTranslations("common");
  const friendSheetTitleId = useId();
  const entitySheetTitleId = useId();
  const [friendSheetOpen, setFriendSheetOpen] = useState(false);
  const [entitySheetOpen, setEntitySheetOpen] = useState(false);

  const youLabel = t("seriesSelf");
  const friendSeries = t("seriesFriend", { friendName });
  const leader = selfTotal === friendTotal ? "tie" : selfTotal > friendTotal ? "self" : "friend";
  const leaderLabel =
    leader === "tie"
      ? t("scoreboardTie")
      : leader === "self"
        ? t("scoreboardLeadsSelf")
        : t("scoreboardLeadsFriend", { name: friendName });

  const entityPlaceholder =
    arenaMode === "track" ? t("trackSearchPlaceholder") : t("artistSearchPlaceholder");
  const entitySheetTitle =
    arenaMode === "track" ? tm("entitySheetTitleTrack") : tm("entitySheetTitleArtist");
  const entityClearLabel = arenaMode === "track" ? t("trackClear") : t("artistClear");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("titleBattle", { friendName })}>
        <DuetMobileSubNav current="compare" withFilters={withFilters} />
        <div className="flex items-center gap-3">
          <UserAvatar name={viewer.name} src={viewer.avatarUrl} size="md" />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">vs</span>
          <UserAvatar name={friendName} src={friendAvatarUrl} size="md" />
        </div>
      </HeroFrame>

      <section className="px-4" aria-label={tm("railLabel")}>
        <div className={SNAP_RAIL}>
          <SignalTile label={youLabel} value={formatCount(selfTotal, locale)} />
          <SignalTile label={friendName} value={formatCount(friendTotal, locale)} />
        </div>
      </section>

      <div className="space-y-2 px-4">
        <button
          type="button"
          onClick={() => setFriendSheetOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-card-border bg-card-surface text-sm font-semibold text-foreground"
        >
          {t("changeFriend")}
        </button>
        {seeMusicHref ? (
          <Link
            href={seeMusicHref}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-card-border bg-card-surface text-sm font-semibold text-foreground no-underline"
          >
            {t("seeMusic")}
          </Link>
        ) : null}
      </div>

      <div className="px-4">
        <SegmentedControl
          label={tm("sectionNavLabel")}
          value={activeSection}
          options={[
            { value: "overview", label: tm("sectionOverview") },
            { value: "shared", label: tm("sectionShared") },
            { value: "target", label: tm("sectionTarget") },
          ]}
          onChange={onSectionChange}
        />
      </div>

      <div className="space-y-3 px-4">
        {activeSection === "overview" ? (
          <>
            <p className="text-sm font-semibold text-foreground">{leaderLabel}</p>
            {rangeClamped ? <p className="text-sm leading-6 text-muted">{t("rangeClamped")}</p> : null}
            {metadataBanner}
            {chartData.length === 0 ? (
              <p className="rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
                {t("noDataTitle")}
              </p>
            ) : (
              <>
                <DuetChartViewToggle
                  value={chartView}
                  onChange={onChartViewChange}
                  className="inline-flex w-full gap-1 rounded-2xl border border-card-border bg-card-surface p-1"
                />
                <MobileChart
                  data={chartData}
                  chartView={chartView}
                  period={period}
                  locale={locale}
                  resolvedTheme={resolvedTheme}
                  selfLabel={youLabel}
                  friendLabel={friendSeries}
                />
                {shareActions}
              </>
            )}
          </>
        ) : null}

        {activeSection === "shared" ? (
          sharedLoading ? (
            <p className="text-sm text-muted">{t("sharedArtistsLoading")}</p>
          ) : sharedError ? (
            <button
              type="button"
              onClick={onRetryShared}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-card-border text-sm font-semibold"
            >
              {tCommon("retry")}
            </button>
          ) : !sharedArtists?.length ? (
            <p className="rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
              {t("sharedArtistsEmptyTitle")}
            </p>
          ) : (
            <ul className="space-y-2">
              {sharedArtists.map((artist) => (
                <li key={artist.artistId}>
                  <button
                    type="button"
                    onClick={() => onCompareArtist(artist.artistId, artist.artistName)}
                    className={ROW_CLASS}
                  >
                    <ArtistAvatarHydrated
                      artistId={artist.artistId}
                      artistName={artist.artistName}
                      imageUrl={artist.imageUrl}
                      avatarApiSize={88}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {artist.artistName}
                      </span>
                      <span className="mt-0.5 block text-xs tabular-nums text-muted">
                        {formatCount(artist.selfCount, locale)} · {formatCount(artist.friendCount, locale)}
                      </span>
                    </span>
                    <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {activeSection === "target" ? (
          <>
            <SegmentedControl
              label={t("arenaToggleLabel")}
              value={arenaMode ?? "artist"}
              options={[
                { value: "artist", label: tm("arenaArtist") },
                { value: "track", label: tm("arenaTrack") },
              ]}
              onChange={onArenaModeChange}
            />
            <button
              type="button"
              onClick={() => {
                if (!arenaMode) onArenaModeChange("artist");
                setEntitySheetOpen(true);
              }}
              className={ROW_CLASS}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {selectedEntityLabel || tm("chooseEntity")}
              </span>
              <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
            </button>
            {selectedEntitySubtitle ? <p className="text-xs text-muted">{selectedEntitySubtitle}</p> : null}
            {entityError ? (
              <button
                type="button"
                onClick={onRetryEntity}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-card-border text-sm font-semibold"
              >
                {tCommon("retry")}
              </button>
            ) : entityLoading ? (
              <p className="text-sm text-muted">{t("loading")}</p>
            ) : entityCompare ? (
              <>
                <FaceOffRow
                  leftLabel={youLabel}
                  leftValue={formatCount(entityCompare.selfCount, locale)}
                  rightLabel={friendName}
                  rightValue={formatCount(entityCompare.friendCount, locale)}
                />
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {t(duetShareHeadlineKey(arenaMode ?? "artist", entityCompare.winner), {
                    friendName,
                    entityName: selectedEntityLabel,
                  })}
                </p>
                {entityCompare.selfCount + entityCompare.friendCount > 0 ? (
                  <EntityBattleShareActions
                    selfCount={entityCompare.selfCount}
                    friendCount={entityCompare.friendCount}
                    viewerName={viewer.name}
                    friendName={friendName}
                    viewerAvatarUrl={viewer.avatarUrl}
                    friendAvatarUrl={friendAvatarUrl}
                    winner={entityCompare.winner}
                    entityName={selectedEntityLabel}
                    entitySubtitle={selectedEntitySubtitle}
                    entityImageUrl={
                      entityCompare.type === "artist" ? entityCompare.imageUrl : undefined
                    }
                    arenaMode={arenaMode ?? "artist"}
                    locale={locale}
                    t={t}
                    variant="mobile"
                  />
                ) : null}
                {entityChartData.length > 0 ? (
                  <>
                    <DuetChartViewToggle
                      value={chartView}
                      onChange={onChartViewChange}
                      className="inline-flex w-full gap-1 rounded-2xl border border-card-border bg-card-surface p-1"
                    />
                    <MobileChart
                      data={entityChartData}
                      chartView={chartView}
                      period={period}
                      locale={locale}
                      resolvedTheme={resolvedTheme}
                      selfLabel={youLabel}
                      friendLabel={friendSeries}
                    />
                  </>
                ) : (
                  <p className="rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
                    {t("noDataTitle")}
                  </p>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </div>

      <MobileBottomSheet
        open={friendSheetOpen}
        onClose={() => setFriendSheetOpen(false)}
        ariaLabelledBy={friendSheetTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <h2 id={friendSheetTitleId} className="text-lg font-semibold tracking-tight text-foreground">
            {tm("friendsSheetTitle")}
          </h2>
          <div className="mt-4">
            <FriendList
              friends={friends}
              viewerId={viewer.id}
              hrefForFriend={hrefForFriend}
              onSelect={(friendId) => {
                onSelectFriend(friendId);
                setFriendSheetOpen(false);
              }}
              empty={
                <Link
                  href={withFilters("/dashboard/duet/friends")}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-card-border text-sm font-semibold no-underline"
                >
                  {t("goToFriends")}
                </Link>
              }
            />
          </div>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={entitySheetOpen}
        onClose={() => setEntitySheetOpen(false)}
        ariaLabelledBy={entitySheetTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <h2 id={entitySheetTitleId} className="text-lg font-semibold tracking-tight text-foreground">
            {entitySheetTitle}
          </h2>
          <div className="mt-4 space-y-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={entityPlaceholder}
              className="min-h-11 w-full rounded-xl border border-card-border bg-card-surface px-3 text-sm text-foreground"
            />
            {selectedEntityLabel ? (
              <button type="button" onClick={onClearEntity} className="text-sm font-semibold text-muted">
                {entityClearLabel}
              </button>
            ) : null}
            {showSuggestions ? (
              <ul className="space-y-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      className={ROW_CLASS}
                      onClick={() => {
                        onSelectEntity(suggestion.id, suggestion.label);
                        setEntitySheetOpen(false);
                      }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {suggestion.label}
                        </span>
                        {suggestion.subtitle ? (
                          <span className="mt-0.5 block truncate text-xs text-muted">{suggestion.subtitle}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchQuery.trim().length >= 2 ? (
              <p className="text-sm text-muted">{tm("noResults")}</p>
            ) : null}
          </div>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
