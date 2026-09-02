"use client";

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  Clock3,
  Disc3,
  Headphones,
  ListMusic,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import {
  HUB_PREVIEW_GENRES,
  MiniAlbumSpotlightGrid,
  MiniGenreTrendsChart,
  MiniHeatmapCalendar,
  MiniTimelineChart,
  MiniTopArtistsChart,
  type HubPreviewGenreName,
} from "@/lib/components/home-dashboard-preview-widgets";
import {
  HOME_HUB_OVERVIEW_TABS,
  HOME_HUB_PERIODS,
  formatHubDuration,
  getHomeHubSnapshot,
  type HomeHubOverviewTab,
  type HomeHubPage,
  type HomeHubPeriod,
  type HomeHubTrendView,
} from "@/lib/utils/home-music-hub";

const PANEL_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.85,
};

const sidebarIcons = {
  overview: (props: SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  ),
  artists: (props: SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  ),
  tracks: (props: SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 1 1 0 3.75H5.625a1.875 1.875 0 1 1 0-3.75Z"
      />
    </svg>
  ),
  genres: (props: SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.331-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  ),
  timeline: (props: SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18 9 11.25l4.5 4.5L21.75 7M21.75 7h-5.25M21.75 7v5.25"
      />
    </svg>
  ),
  heatmap: (props: SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-1.333-2.532 3.75 3.75 0 0 0 2.763 6.453Z"
      />
    </svg>
  ),
};

type SidebarItem = {
  id: HomeHubPage;
  labelKey: "overview" | "artists" | "tracks" | "genres" | "timeline" | "heatmap";
  icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
  featured?: boolean;
};

const SIDEBAR_GROUPS: { labelKey: "home" | "library" | "patterns"; items: SidebarItem[] }[] = [
  {
    labelKey: "home",
    items: [{ id: "overview", labelKey: "overview", icon: sidebarIcons.overview, featured: true }],
  },
  {
    labelKey: "library",
    items: [
      { id: "artists", labelKey: "artists", icon: sidebarIcons.artists },
      { id: "tracks", labelKey: "tracks", icon: sidebarIcons.tracks },
      { id: "genres", labelKey: "genres", icon: sidebarIcons.genres },
    ],
  },
  {
    labelKey: "patterns",
    items: [
      { id: "timeline", labelKey: "timeline", icon: sidebarIcons.timeline },
      { id: "heatmap", labelKey: "heatmap", icon: sidebarIcons.heatmap },
    ],
  },
];

const MOBILE_NAV: SidebarItem[] = [
  { id: "overview", labelKey: "overview", icon: sidebarIcons.overview },
  { id: "artists", labelKey: "artists", icon: sidebarIcons.artists },
  { id: "tracks", labelKey: "tracks", icon: sidebarIcons.tracks },
  { id: "genres", labelKey: "genres", icon: sidebarIcons.genres },
];

const TAB_ICONS: Record<HomeHubOverviewTab, LucideIcon> = {
  spotlight: Users,
  tops: ListMusic,
  trends: TrendingUp,
  context: CalendarDays,
};

const KPI_META = [
  {
    id: "listens" as const,
    tab: "trends" as const,
    icon: Headphones,
    accent: "from-rose-400/20 to-transparent",
    iconClass: "text-rose-100",
  },
  {
    id: "artists" as const,
    tab: "spotlight" as const,
    icon: Users,
    accent: "from-violet-400/20 to-transparent",
    iconClass: "text-violet-100",
  },
  {
    id: "tracks" as const,
    tab: "tops" as const,
    icon: Disc3,
    accent: "from-cyan-400/20 to-transparent",
    iconClass: "text-cyan-100",
  },
  {
    id: "time" as const,
    tab: "context" as const,
    icon: Clock3,
    accent: "from-emerald-400/20 to-transparent",
    iconClass: "text-emerald-100",
  },
];

function useTabListKeyDown<T extends string>(
  items: readonly T[],
  active: T,
  onChange: (next: T) => void,
) {
  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const index = items.indexOf(active);
      if (index < 0 || items.length <= 1) return;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onChange(items[(index + 1) % items.length]);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onChange(items[(index - 1 + items.length) % items.length]);
      } else if (event.key === "Home") {
        event.preventDefault();
        onChange(items[0]);
      } else if (event.key === "End") {
        event.preventDefault();
        onChange(items[items.length - 1]);
      }
    },
    [active, items, onChange],
  );
}

function HubSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/55">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">
          {title}
        </h3>
      </div>
      <p className="max-w-lg text-sm leading-6 text-white/45">{description}</p>
    </div>
  );
}

export function HomeMusicHubPreview() {
  const t = useTranslations("home.musicHub");
  const tOverview = useTranslations("overview");
  const tNav = useTranslations("sidebar");
  const tPeriod = useTranslations("components.dateRangeFilter");
  const tHomeStats = useTranslations("home.heroDashboardPreview.screen.stats");
  const tPreviews = useTranslations("home.dashboardPreviews");
  const locale = useLocale();
  const reducedMotion = useReducedMotion();
  const tabsId = useId();
  const periodId = useId();
  const trendsId = useId();

  const [page, setPage] = useState<HomeHubPage>("overview");
  const [tab, setTab] = useState<HomeHubOverviewTab>("spotlight");
  const [period, setPeriod] = useState<HomeHubPeriod>("30d");
  const [trendView, setTrendView] = useState<HomeHubTrendView>("genres");
  const [activeGenres, setActiveGenres] = useState<Set<HubPreviewGenreName>>(
    () => new Set(["Rap", "R&B", "Reggaeton"]),
  );
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  const snapshot = useMemo(() => getHomeHubSnapshot(period), [period]);
  const selectedArtistData =
    snapshot.artists.find((artist) => artist.name === selectedArtist) ?? snapshot.artists[0];
  const selectedAlbumData =
    snapshot.albums.find((album) => album.name === selectedAlbum) ?? snapshot.albums[0];
  const topGenreName =
    HUB_PREVIEW_GENRES.find((genre) => activeGenres.has(genre.name))?.name ??
    HUB_PREVIEW_GENRES[0].name;

  const insightIsArtist = page === "artists" || (page === "overview" && tab === "spotlight");

  const goToOverviewTab = useCallback((nextTab: HomeHubOverviewTab) => {
    setPage("overview");
    setTab(nextTab);
  }, []);

  const onTabKeyDown = useTabListKeyDown(HOME_HUB_OVERVIEW_TABS, tab, goToOverviewTab);
  const onPeriodKeyDown = useTabListKeyDown(HOME_HUB_PERIODS, period, setPeriod);
  const onTrendKeyDown = useTabListKeyDown(
    ["genres", "pulse"] as const,
    trendView,
    setTrendView,
  );

  const toggleGenre = useCallback((name: HubPreviewGenreName) => {
    setActiveGenres((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        if (next.size === 1) return current;
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const panelKey =
    page === "overview"
      ? `overview-${tab}${tab === "trends" ? `-${trendView}` : ""}`
      : page;

  const artistsPanel = (
    <>
      <HubSectionHeader
        eyebrow={tOverview("viewSwitcher.views.spotlight")}
        title={tOverview("sections.library.title")}
        description={tPreviews("topArtists.description")}
      />
      <MiniTopArtistsChart
        artists={snapshot.artists}
        selectedName={selectedArtistData.name}
        onSelect={setSelectedArtist}
        selectAria={(name) => t("selectArtistAria", { name })}
        locale={locale}
      />
    </>
  );

  const albumsPanel = (
    <>
      <HubSectionHeader
        eyebrow={tOverview("viewSwitcher.views.tops")}
        title={tOverview("topTracks")}
        description={tPreviews("albumSpotlight.description")}
      />
      <MiniAlbumSpotlightGrid
        albums={snapshot.albums}
        selectedName={selectedAlbumData.name}
        onSelect={setSelectedAlbum}
        selectAria={(name) => t("selectAlbumAria", { name })}
        locale={locale}
        listensLabel={tOverview("listens")}
      />
    </>
  );

  const genresPanel = (
    <>
      <HubSectionHeader
        eyebrow={tOverview("viewSwitcher.views.trends")}
        title={tNav("items.genreTrends")}
        description={tPreviews("genreTrends.description")}
      />
      <MiniGenreTrendsChart
        activeGenres={activeGenres}
        onToggleGenre={toggleGenre}
        toggleAria={(name) => t("genreToggleAria", { genre: name })}
      />
    </>
  );

  const timelinePanel = (
    <>
      <HubSectionHeader
        eyebrow={tOverview("viewSwitcher.views.trends")}
        title={tNav("items.timeline")}
        description={tPreviews("timeline.description")}
      />
      <MiniTimelineChart delta={snapshot.delta} />
    </>
  );

  const heatmapPanel = (
    <>
      <HubSectionHeader
        eyebrow={tOverview("viewSwitcher.views.context")}
        title={tNav("items.heatmap")}
        description={tPreviews("heatmap.description")}
      />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <MiniHeatmapCalendar
          totalListens={snapshot.heatmapTotal}
          cellLabel={(count) => t("heatmapCell", { count })}
        />
        <blockquote className="rounded-[1.35rem] border border-white/[0.08] bg-[#0c0e18] p-5 ring-1 ring-white/[0.05]">
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/45">
            {tOverview("viewSwitcher.views.context")}
          </p>
          <p className="mt-3 text-sm leading-7 text-white/70">{tPreviews("tasteProfile.quote")}</p>
        </blockquote>
      </div>
    </>
  );

  const trendsPanel = (
    <>
      <HubSectionHeader
        eyebrow={tOverview("sections.momentum.eyebrow")}
        title={tOverview("sections.momentum.title")}
        description={tOverview("sections.momentum.description")}
      />
      <div
        role="tablist"
        aria-label={t("trendsInnerAria")}
        onKeyDown={onTrendKeyDown}
        className="mb-4 flex gap-2"
      >
        {(["genres", "pulse"] as const).map((view) => {
          const isActive = trendView === view;
          return (
            <button
              key={view}
              type="button"
              role="tab"
              id={`${trendsId}-tab-${view}`}
              aria-selected={isActive}
              aria-controls={`${trendsId}-panel-${view}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setTrendView(view)}
              className={`rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "border-violet-400/25 bg-violet-500/15 text-violet-100"
                  : "border-transparent text-white/45 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {view === "genres" ? t("trendsGenres") : t("trendsPulse")}
            </button>
          );
        })}
      </div>
      {trendView === "genres" ? (
        <MiniGenreTrendsChart
          activeGenres={activeGenres}
          onToggleGenre={toggleGenre}
          toggleAria={(name) => t("genreToggleAria", { genre: name })}
        />
      ) : (
        <MiniTimelineChart delta={snapshot.delta} />
      )}
    </>
  );

  let panel: React.ReactNode = artistsPanel;
  if (page === "overview") {
    if (tab === "spotlight") panel = artistsPanel;
    else if (tab === "tops") panel = albumsPanel;
    else if (tab === "trends") panel = trendsPanel;
    else panel = heatmapPanel;
  } else if (page === "artists") panel = artistsPanel;
  else if (page === "tracks") panel = albumsPanel;
  else if (page === "genres") panel = genresPanel;
  else if (page === "timeline") panel = timelinePanel;
  else panel = heatmapPanel;

  const kpiValues = {
    listens: snapshot.listens.toLocaleString(locale),
    artists: snapshot.uniqueArtists.toLocaleString(locale),
    tracks: snapshot.uniqueTracks.toLocaleString(locale),
    time: formatHubDuration(snapshot.hours, snapshot.minutes),
  };

  return (
    <div
      className="relative w-full"
      role="region"
      aria-label={t("label")}
    >
      <div
        className="pointer-events-none absolute -inset-10 rounded-[2.4rem] bg-[radial-gradient(ellipse_at_center,rgb(152_80_208_/_0.2),transparent_68%)] blur-3xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080913] shadow-[0_32px_80px_-24px_rgb(0_0_0_/_0.75)] ring-1 ring-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.12),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(79,144,224,0.1),transparent_34%)]"
          aria-hidden
        />

        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
            </div>
            <SoundprintBrandMark
              size="sm"
              tone="onDark"
              showAiBadge={false}
              showWordmarkOnMobile={false}
              interactive={false}
            />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/70">
            <LiveStatusDot tone="emerald" />
            {t("liveBadge")}
          </span>
        </div>

        <div className="relative flex min-h-[36rem] lg:min-h-[40rem]">
          <aside className="hidden w-[13.5rem] shrink-0 flex-col border-r border-white/10 bg-[#090a12] px-3 py-4 lg:flex">
            <nav aria-label={t("navAria")} className="space-y-5">
              {SIDEBAR_GROUPS.map((group) => (
                <div key={group.labelKey}>
                  <p className="mb-2 px-2 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/35">
                    {tNav(`groups.${group.labelKey}`)}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = page === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPage(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                            isActive
                              ? item.featured
                                ? "bg-brand-gradient text-white shadow-brand-glow"
                                : "bg-white/10 text-white"
                              : "text-white/55 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{tNav(`items.${item.labelKey}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {tPeriod("period")}
              </span>
              <div
                role="tablist"
                aria-label={t("periodAria")}
                onKeyDown={onPeriodKeyDown}
                className="relative flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-white/[0.04] p-1"
              >
                {HOME_HUB_PERIODS.map((preset) => {
                  const isActive = period === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      role="tab"
                      id={`${periodId}-tab-${preset}`}
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setPeriod(preset)}
                      className={`relative z-10 min-h-9 flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-brand-gradient text-white shadow-sm"
                          : "text-white/50 hover:text-white"
                      }`}
                    >
                      {tPeriod(`presets.${preset}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {page === "overview" ? (
                <div className="mb-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                        {insightIsArtist
                          ? tOverview("mobile.primaryInsight.topArtistEyebrow")
                          : tOverview("mobile.primaryInsight.topTrackEyebrow")}
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl">
                        {tOverview("title")}
                      </h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                      {tPeriod(`mobile.presets.${period}`)}
                    </span>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.07] p-4 sm:p-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {tOverview("listens")}
                      </p>
                      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-[-0.06em] sm:text-4xl">
                        {(insightIsArtist
                          ? selectedArtistData.listens
                          : selectedAlbumData.listens
                        ).toLocaleString(locale)}
                      </p>
                      <p className="mt-2 truncate text-sm font-semibold text-white">
                        {insightIsArtist ? selectedArtistData.name : selectedAlbumData.name}
                      </p>
                      {!insightIsArtist ? (
                        <p className="truncate text-xs text-white/45">{selectedAlbumData.artist}</p>
                      ) : null}
                    </div>
                    <div className="max-w-[8.5rem] shrink-0 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {tOverview("libraryLeaders.topGenre")}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-cyan-100">
                        {topGenreName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {KPI_META.map((kpi) => {
                      const Icon = kpi.icon;
                      return (
                        <button
                          key={kpi.id}
                          type="button"
                          onClick={() => goToOverviewTab(kpi.tab)}
                          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          <div
                            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${kpi.accent}`}
                            aria-hidden
                          />
                          <div className="relative flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${kpi.iconClass}`} aria-hidden />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                              {tHomeStats(kpi.id)}
                            </p>
                          </div>
                          <p className="relative mt-2 text-lg font-semibold tabular-nums tracking-[-0.04em] text-white">
                            {kpiValues[kpi.id]}
                          </p>
                          <p className="relative mt-1 text-[10px] font-semibold text-emerald-200">
                            +{snapshot.delta}% {t("vsPrevious")}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {page === "overview" ? (
                <nav aria-label={tOverview("viewSwitcher.navLabel")} className="mb-5">
                  <div
                    role="tablist"
                    aria-label={t("tabsAria")}
                    onKeyDown={onTabKeyDown}
                    className="flex gap-2 overflow-x-auto rounded-[1.5rem] border border-white/[0.08] bg-[#0a0c14]/90 p-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {HOME_HUB_OVERVIEW_TABS.map((item) => {
                      const isActive = tab === item;
                      const Icon = TAB_ICONS[item];
                      return (
                        <button
                          key={item}
                          type="button"
                          role="tab"
                          id={`${tabsId}-tab-${item}`}
                          aria-selected={isActive}
                          aria-controls={`${tabsId}-panel-${item}`}
                          tabIndex={isActive ? 0 : -1}
                          onClick={() => setTab(item)}
                          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                            isActive
                              ? "border-violet-400/25 bg-violet-500/15 text-violet-100"
                              : "border-transparent text-white/45 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          {tOverview(`viewSwitcher.views.${item}`)}
                        </button>
                      );
                    })}
                  </div>
                </nav>
              ) : null}

              <div
                role={page === "overview" ? "tabpanel" : undefined}
                id={page === "overview" ? `${tabsId}-panel-${tab}` : undefined}
                aria-labelledby={page === "overview" ? `${tabsId}-tab-${tab}` : undefined}
                className="relative min-h-[280px] pb-16 lg:pb-0"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={panelKey}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={reducedMotion ? { duration: 0.15 } : PANEL_TRANSITION}
                    className="w-full min-w-0"
                  >
                    {panel}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <nav
          className="border-t border-white/10 bg-[#090a12]/95 lg:hidden"
          aria-label={tNav("mobileBottomNavLabel")}
        >
          <ul className="flex items-stretch justify-around px-1 pt-1">
            {MOBILE_NAV.map((item) => {
              const isActive = page === item.id;
              const Icon = item.icon;
              const label =
                item.labelKey === "overview"
                  ? tNav("items.overview")
                  : tNav(`items.${item.labelKey}`);
              return (
                <li key={item.id} className="flex min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setPage(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-[3.25rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                      isActive ? "text-white" : "text-white/45 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
