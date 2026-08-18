"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HeatmapCalendarOverviewWidget } from "@/lib/components/heatmap-calendar-overview-widget";
import { AiInsightsSummaryWidget } from "@/lib/components/ai-insights-summary-widget";
import { OverviewMomentumTabs, type OverviewMomentumSlide } from "@/lib/components/overview-momentum-tabs";
import { OverviewGoFurtherSection } from "@/lib/components/overview-go-further";
import { OverviewTasteTeaser } from "@/lib/components/overview-taste-teaser";
import { OverviewMobileHero } from "@/lib/components/overview-hero";
import { SpotlightRankBubble, type LibraryLeaderItem } from "@/lib/components/overview-library-rankings";
import { TopThreeArtistsOverviewWidget } from "@/lib/components/top-three-artists-overview-widget";
import {
  OverviewSectionSwitcher,
  OverviewViewPanel,
  useOverviewView,
  type OverviewView,
} from "@/lib/components/overview-section-switcher";
import type { OverviewStatsChanges } from "@/lib/components/overview-stats-section";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";
import {
  buildOverviewPrimaryInsight,
  formatListeningTime,
  type OverviewArtistLeader,
  type OverviewGenreLeader,
  type OverviewTrackLeader,
} from "@/lib/utils/overview-page";

type MobileOverviewStat = {
  label: string;
  value: string;
  change?: {
    displayValue: string;
    isPositive: boolean;
  } | null;
};

type MobileLeaderItem = LibraryLeaderItem & {
  href?: string;
};

function MobileChangePill({
  change,
  label,
}: {
  change?: MobileOverviewStat["change"];
  label: string;
}) {
  if (!change) return null;

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-[11px] font-semibold tabular-nums ${
        change.isPositive
          ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
          : "border border-rose-300/20 bg-rose-400/10 text-rose-100"
      }`}
    >
      {change.isPositive ? "+" : "-"}
      {change.displayValue}% {label}
    </span>
  );
}

function MobileMetricRail({
  stats,
  comparisonLabel,
}: {
  stats: MobileOverviewStat[];
  comparisonLabel: string;
}) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="min-w-[9.75rem] snap-start rounded-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-lg shadow-black/10 backdrop-blur"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em]">
            {stat.value}
          </p>
          <div className="mt-3 min-h-8">
            <MobileChangePill change={stat.change} label={comparisonLabel} />
          </div>
        </article>
      ))}
    </div>
  );
}

function MobileLeaderRow({
  item,
  index,
  locale,
  listensLabel,
  showPercentage = false,
}: {
  item: MobileLeaderItem;
  index: number;
  locale: string;
  listensLabel: string;
  showPercentage?: boolean;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <SpotlightRankBubble rank={index + 1} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white" title={item.title}>
            {item.title}
          </p>
          {item.subtitle ? (
            <p className="mt-0.5 truncate text-xs text-slate-400" title={item.subtitle}>
              {item.subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-white">
          {item.count.toLocaleString(locale)}
        </p>
        <p className="text-[11px] text-slate-400">
          {showPercentage ? `${item.percentage.toFixed(1)}% · ${listensLabel}` : listensLabel}
        </p>
      </div>
    </>
  );

  const className =
    "flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5";

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function MobileOverviewFlow({
  title,
  badgeLabel,
  hasComparison,
  showPeriodHint = false,
  data,
  changes,
  momentumSlides,
  topTracks,
  topArtists,
  topGenres,
  locale,
  tracksHref,
  artistsHref,
  genresHref,
  musicalProfileHref,
  musicAgentHref,
  duetHref,
  startDate,
  endDate,
  avatarUrl,
  onOpenArtistInsights,
}: {
  title: string;
  badgeLabel: string;
  hasComparison: boolean;
  showPeriodHint?: boolean;
  data: OverviewStatsWithTopArtists;
  changes: OverviewStatsChanges;
  momentumSlides: OverviewMomentumSlide[];
  topTracks: OverviewTrackLeader[];
  topArtists: OverviewArtistLeader[];
  topGenres: OverviewGenreLeader[];
  locale: string;
  tracksHref: string;
  artistsHref: string;
  genresHref: string;
  musicalProfileHref: string;
  musicAgentHref: string;
  duetHref: string;
  startDate?: string;
  endDate?: string;
  avatarUrl?: string | null;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("overview");
  const topTrack = topTracks[0];
  const topArtist = topArtists[0];
  const topGenre = topGenres[0];
  const primaryInsight = buildOverviewPrimaryInsight({
    pageTitle: title,
    locale,
    data,
    topTrack,
    topArtist,
    labels: {
      topTrackEyebrow: t("mobile.primaryInsight.topTrackEyebrow"),
      topTrackBody: t("mobile.primaryInsight.topTrackBody", {
        artist: topTrack?.artistName ?? "",
      }),
      topArtistEyebrow: t("mobile.primaryInsight.topArtistEyebrow"),
      topArtistBody: t("mobile.primaryInsight.topArtistBody"),
      libraryEyebrow: t("mobile.primaryInsight.libraryEyebrow"),
      libraryBody: t("mobile.primaryInsight.libraryBody"),
      listens: t("listens"),
      totalListens: t("stats.totalListens"),
    },
  });

  const stats: MobileOverviewStat[] = [
    {
      label: t("stats.totalListens"),
      value: data.totalListens.toLocaleString(locale),
      change: changes?.totalListens,
    },
    {
      label: t("stats.uniqueArtists"),
      value: data.uniqueArtists.toLocaleString(locale),
      change: changes?.uniqueArtists,
    },
    {
      label: t("stats.totalTime"),
      value: formatListeningTime(data.totalPlayTime, t("notAvailable")),
      change: changes?.totalPlayTime,
    },
  ];

  const leaderSections = [
    {
      key: "tracks",
      title: t("topTracks"),
      description: t("yourTopTracks"),
      href: tracksHref,
      showPercentage: false,
      items: topTracks.slice(0, 3).map((track) => ({
        id: track.trackId,
        title: track.name,
        subtitle: track.artistName,
        count: track.count,
        percentage: track.percentage,
      })),
    },
    {
      key: "artists",
      title: t("topArtists"),
      description: t("yourTopArtists"),
      href: artistsHref,
      showPercentage: false,
      items: topArtists.slice(0, 3).map((artist) => ({
        id: artist.artistId,
        title: artist.name,
        count: artist.count,
        percentage: artist.percentage,
      })),
    },
    {
      key: "genres",
      title: t("topGenres"),
      description: t("yourTopGenres"),
      href: genresHref,
      showPercentage: true,
      items: topGenres.slice(0, 3).map((genre) => ({
        id: genre.genre,
        title: genre.genre,
        count: genre.count,
        percentage: genre.percentage,
      })),
    },
  ].filter((section) => section.items.length > 0);

  const hasLeaders = leaderSections.length > 0;
  const availableViews = useMemo((): OverviewView[] => {
    const views: OverviewView[] = ["spotlight"];
    if (hasLeaders) views.push("tops");
    if (momentumSlides.length > 0) views.push("trends");
    views.push("context", "summary", "further");
    return views;
  }, [hasLeaders, momentumSlides.length]);
  const { activeView, setView } = useOverviewView(availableViews);

  return (
    <div className="space-y-5">
      <OverviewMobileHero
        title={title}
        description={t("subtitle")}
        badgeLabel={badgeLabel}
        showPeriodHint={showPeriodHint}
        avatarUrl={avatarUrl}
        insight={primaryInsight}
        genreName={topGenre?.genre}
      />

      <OverviewSectionSwitcher
        idPrefix="overview-mobile"
        available={availableViews}
        activeView={activeView}
        onChange={setView}
      />

      <OverviewViewPanel idPrefix="overview-mobile" view="summary" activeView={activeView}>
        <div className="space-y-3">
          <MobileMetricRail stats={stats} comparisonLabel={t("mobile.vsShort")} />
          {hasComparison ? (
            <p className="text-center text-xs font-medium text-muted">
              {t("mobile.comparisonHint")}
            </p>
          ) : null}
        </div>
      </OverviewViewPanel>

      <OverviewViewPanel idPrefix="overview-mobile" view="spotlight" activeView={activeView}>
        <TopThreeArtistsOverviewWidget
          startDate={startDate}
          endDate={endDate}
          onOpenArtistInsights={onOpenArtistInsights}
        />
      </OverviewViewPanel>

      {hasLeaders ? (
        <OverviewViewPanel idPrefix="overview-mobile" view="tops" activeView={activeView}>
          <div className="space-y-4">
            {leaderSections.map((section) => (
              <section key={section.key} className="rounded-3xl bg-slate-950 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">{section.description}</p>
                  </div>
                  <Link
                    href={section.href}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-xs font-semibold text-white"
                  >
                    {t("seeAll")}
                  </Link>
                </div>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <MobileLeaderRow
                      key={item.id}
                      item={item}
                      index={index}
                      locale={locale}
                      listensLabel={t("listens")}
                      showPercentage={section.showPercentage}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </OverviewViewPanel>
      ) : null}

      {momentumSlides.length > 0 ? (
        <OverviewViewPanel idPrefix="overview-mobile" view="trends" activeView={activeView}>
          <section className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("sections.momentum.eyebrow")}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-foreground dark:text-white">
                {t("sections.momentum.title")}
              </h2>
            </div>
            <OverviewMomentumTabs slides={momentumSlides} />
          </section>
        </OverviewViewPanel>
      ) : null}

      <OverviewViewPanel idPrefix="overview-mobile" view="context" activeView={activeView}>
        <div className="space-y-4">
          <AiInsightsSummaryWidget />
          <HeatmapCalendarOverviewWidget startDate={startDate} endDate={endDate} />
          <OverviewTasteTeaser href={musicalProfileHref} />
        </div>
      </OverviewViewPanel>

      <OverviewViewPanel idPrefix="overview-mobile" view="further" activeView={activeView}>
        <OverviewGoFurtherSection
          soundprintChatHref={musicAgentHref}
          duetHref={duetHref}
          compact
        />
      </OverviewViewPanel>
    </div>
  );
}
