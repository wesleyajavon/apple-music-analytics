"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarDays,
  ListMusic,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { HomeHubArtistDeepDiveOverlay } from "@/lib/components/home-hub-artist-deep-dive";
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
  getHomeHubArtistDeepDive,
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

const DEMO_RESUME_MS = 10_000;

type HubDemoStep = {
  page: HomeHubPage;
  tab?: HomeHubOverviewTab;
  period: HomeHubPeriod;
  trendView?: HomeHubTrendView;
  artistIndex?: number;
  albumIndex?: number;
  durationMs: number;
};

/** Cinematic autoplay tour — pauses on user interaction, resumes after idle. */
const HUB_DEMO_TOUR: readonly HubDemoStep[] = [
  { page: "overview", tab: "spotlight", period: "30d", artistIndex: 0, durationMs: 2600 },
  { page: "overview", tab: "spotlight", period: "30d", artistIndex: 1, durationMs: 2000 },
  { page: "overview", tab: "tops", period: "30d", albumIndex: 0, durationMs: 2400 },
  { page: "overview", tab: "trends", period: "30d", trendView: "genres", durationMs: 2600 },
  { page: "overview", tab: "trends", period: "7d", trendView: "pulse", durationMs: 2400 },
  { page: "overview", tab: "context", period: "7d", durationMs: 2400 },
  { page: "artists", period: "ytd", artistIndex: 0, durationMs: 2400 },
  { page: "genres", period: "ytd", durationMs: 2200 },
  { page: "timeline", period: "all", durationMs: 2400 },
  { page: "heatmap", period: "all", durationMs: 2600 },
];

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
  const tPreviews = useTranslations("home.dashboardPreviews");
  const locale = useLocale();
  const reducedMotion = useReducedMotion();
  const tabsId = useId();
  const periodId = useId();
  const trendsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inView = useInView(rootRef, { amount: 0.28, margin: "0px 0px -10% 0px" });

  const [page, setPage] = useState<HomeHubPage>("overview");
  const [tab, setTab] = useState<HomeHubOverviewTab>("spotlight");
  const [period, setPeriod] = useState<HomeHubPeriod>("30d");
  const [trendView, setTrendView] = useState<HomeHubTrendView>("genres");
  const [activeGenres, setActiveGenres] = useState<Set<HubPreviewGenreName>>(
    () => new Set(["Rap", "R&B", "Reggaeton"]),
  );
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [deepDiveArtist, setDeepDiveArtist] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);

  const snapshot = useMemo(() => getHomeHubSnapshot(period), [period]);
  const deepDive = useMemo(
    () => (deepDiveArtist ? getHomeHubArtistDeepDive(deepDiveArtist, period) : null),
    [deepDiveArtist, period],
  );
  const autoDemoActive = !reducedMotion && inView && !demoPaused && !deepDiveArtist;

  const pauseDemo = useCallback(() => {
    if (reducedMotion) return;
    setDemoPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setDemoPaused(false);
    }, DEMO_RESUME_MS);
  }, [reducedMotion]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !autoDemoActive) return;

    const step = HUB_DEMO_TOUR[demoStep] ?? HUB_DEMO_TOUR[0]!;
    const snap = getHomeHubSnapshot(step.period);

    setPeriod(step.period);
    setPage(step.page);
    if (step.tab) setTab(step.tab);
    if (step.trendView) setTrendView(step.trendView);
    if (step.artistIndex != null) {
      setSelectedArtist(snap.artists[step.artistIndex]?.name ?? null);
    }
    if (step.albumIndex != null) {
      setSelectedAlbum(snap.albums[step.albumIndex]?.name ?? null);
    }
  }, [autoDemoActive, demoStep, reducedMotion]);

  useEffect(() => {
    if (!autoDemoActive) return;

    const step = HUB_DEMO_TOUR[demoStep] ?? HUB_DEMO_TOUR[0]!;
    const timer = setTimeout(() => {
      setDemoStep((current) => (current + 1) % HUB_DEMO_TOUR.length);
    }, step.durationMs);

    return () => clearTimeout(timer);
  }, [autoDemoActive, demoStep]);
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

  const openArtistDeepDive = useCallback(
    (name: string) => {
      setSelectedArtist(name);
      setDeepDiveArtist(name);
      pauseDemo();
    },
    [pauseDemo],
  );

  const closeArtistDeepDive = useCallback(() => {
    setDeepDiveArtist(null);
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
        title={tPreviews("topArtists.title")}
        description={tPreviews("topArtists.description")}
      />
      <MiniTopArtistsChart
        artists={snapshot.artists}
        selectedName={selectedArtistData.name}
        onSelect={openArtistDeepDive}
        selectAria={(name) => t("deepDive.openAria", { name })}
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
      ref={rootRef}
      className="relative w-full"
      role="region"
      aria-label={t("label")}
      onPointerDown={pauseDemo}
      onFocusCapture={pauseDemo}
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

        <AnimatePresence>
          {deepDive ? (
            <HomeHubArtistDeepDiveOverlay
              key={deepDive.name}
              deepDive={deepDive}
              locale={locale}
              onClose={closeArtistDeepDive}
            />
          ) : null}
        </AnimatePresence>

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
            <LiveStatusDot tone={autoDemoActive ? "violet" : "emerald"} />
            {autoDemoActive ? t("autoDemoBadge") : t("liveBadge")}
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
                <div className="mb-8 space-y-8">
                  <header className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                        {tOverview("title")}
                      </h2>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
                        {tPeriod(`mobile.presets.${period}`)}
                      </span>
                    </div>

                    <div className="mt-6 max-w-2xl">
                      <p className="mb-2 text-[13px] font-medium text-white/50">
                        {insightIsArtist
                          ? tOverview("mobile.primaryInsight.topArtistEyebrow")
                          : tOverview("mobile.primaryInsight.topTrackEyebrow")}
                      </p>
                      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-2xl font-semibold tracking-tight tabular-nums text-white">
                          {(insightIsArtist
                            ? selectedArtistData.listens
                            : selectedAlbumData.listens
                          ).toLocaleString(locale)}
                        </span>
                        <span className="text-[13px] font-medium text-white/45">
                          {tOverview("listens")}
                        </span>
                      </p>
                      <p className="mt-2 truncate text-sm font-semibold text-white">
                        {insightIsArtist ? selectedArtistData.name : selectedAlbumData.name}
                      </p>
                      <p className="mt-1 truncate text-[13px] text-white/45">
                        {insightIsArtist
                          ? `${tOverview("libraryLeaders.topGenre")} · ${topGenreName}`
                          : selectedAlbumData.artist}
                      </p>
                    </div>
                  </header>

                  <section aria-labelledby={`${tabsId}-stats-heading`}>
                    <p className="text-[13px] font-medium text-white/50">
                      {tOverview("statsSectionBadge")}
                    </p>
                    <h3
                      id={`${tabsId}-stats-heading`}
                      className="mt-1 text-[1.35rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.75rem]"
                    >
                      {tOverview("statsSectionTitle")}
                    </h3>
                    <p className="mt-2 max-w-2xl text-[13px] leading-6 text-white/45">
                      {tOverview("statsSectionDescription")}
                    </p>

                    <div className="mt-6 flex w-full flex-wrap border-y border-white/[0.08] py-3">
                      {(
                        [
                          {
                            key: "listens",
                            label: tOverview("stats.totalListens"),
                            value: kpiValues.listens,
                          },
                          {
                            key: "artists",
                            label: tOverview("stats.uniqueArtists"),
                            value: kpiValues.artists,
                          },
                          {
                            key: "tracks",
                            label: tOverview("stats.uniqueTracks"),
                            value: kpiValues.tracks,
                          },
                          {
                            key: "time",
                            label: tOverview("statsSectionTimeLabel"),
                            value: kpiValues.time,
                          },
                        ] as const
                      ).map((metric) => (
                        <div
                          key={metric.key}
                          className="flex min-w-[7.5rem] flex-1 flex-col gap-1 border-r border-white/[0.08] px-4 py-1 first:pl-0 last:border-r-0 last:pr-0 sm:min-w-0 sm:px-5"
                        >
                          <span className="text-[13px] font-medium text-white/45">{metric.label}</span>
                          <span className="text-2xl font-semibold tracking-tight tabular-nums text-white">
                            {metric.value}
                          </span>
                          <span className="text-[13px] tabular-nums text-white/40">
                            +{snapshot.delta}% · {tOverview("vsPreviousPeriod")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
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
