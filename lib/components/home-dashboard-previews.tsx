"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { DashboardPreviewShell } from "@/lib/components/dashboard-preview-shell";
import { HOME_PREVIEW_ALBUMS } from "@/lib/constants/home-album-preview";
import {
  HomeDashboardPreviewsParallax,
  HomeDashboardPreviewsParallaxGrid,
} from "@/lib/components/home-dashboard-previews-parallax";

const PREVIEW_GENRES = [
  { name: "Indie Rock", color: "#818cf8", active: true },
  { name: "Synth-pop", color: "#f472b6", active: true },
  { name: "R&B", color: "#06b6d4", active: true },
  { name: "Electronic", color: "#84cc16", active: false },
] as const;

const CHART_MONTHS = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"] as const;

const GENRE_LINE_PATHS = [
  "M0 52 L40 46 L80 50 L120 34 L160 38 L200 24 L240 28",
  "M0 58 L40 54 L80 48 L120 52 L160 40 L200 44 L240 36",
  "M0 64 L40 60 L80 56 L120 48 L160 52 L200 46 L240 50",
] as const;

const PREVIEW_TOP_ARTISTS = [
  { name: "Radiohead", initials: "RH", listens: 842, share: 100, color: "#818cf8" },
  { name: "Bon Iver", initials: "BV", listens: 611, share: 72, color: "#f472b6" },
  { name: "Frank Ocean", initials: "FO", listens: 488, share: 58, color: "#06b6d4" },
] as const;

const TIMELINE_AREA_PATH =
  "M0 64 L28 58 L56 52 L84 44 L112 48 L140 36 L168 40 L196 28 L224 32 L252 24 L280 18 L280 80 L0 80 Z";

const TIMELINE_LINE_PATH =
  "M0 64 L28 58 L56 52 L84 44 L112 48 L140 36 L168 40 L196 28 L224 32 L252 24 L280 18";

const TIMELINE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const;

/**
 * GitHub-style heatmap: 7 rows (days) × week columns (left → right).
 * Each inner array is one week, Mon → Sun.
 */
const HEATMAP_WEEKS: readonly number[][] = [
  [0, 1, 0, 2, 1, 0, 1],
  [1, 2, 3, 2, 1, 2, 0],
  [0, 1, 2, 3, 4, 2, 1],
  [2, 3, 4, 3, 2, 3, 1],
  [1, 2, 3, 4, 3, 2, 2],
  [0, 1, 2, 3, 2, 1, 0],
  [1, 2, 1, 2, 3, 2, 1],
  [2, 3, 2, 4, 3, 2, 1],
  [1, 2, 3, 3, 2, 1, 0],
  [0, 1, 2, 2, 3, 2, 1],
  [1, 2, 3, 4, 3, 2, 2],
  [2, 1, 2, 3, 2, 1, 0],
  [0, 1, 1, 2, 3, 2, 1],
  [1, 2, 2, 3, 4, 3, 2],
  [2, 3, 3, 4, 3, 2, 1],
  [1, 1, 2, 2, 3, 1, 0],
  [0, 2, 1, 3, 2, 1, 2],
  [1, 2, 3, 2, 4, 3, 1],
];

const HEATMAP_MONTH_LABELS = [
  { weekIndex: 0, label: "Jan" },
  { weekIndex: 5, label: "Mar" },
  { weekIndex: 9, label: "May" },
  { weekIndex: 13, label: "Jul" },
  { weekIndex: 16, label: "Sep" },
] as const;

const HEATMAP_INTENSITY_COLORS = [
  "#1a1d2a",
  "#0e3d4a",
  "#0f766e",
  "#0891b2",
  "#8b5cf6",
] as const;

const SQUARE_SIZE = 9;
const SQUARE_GAP = 2;

function MiniGenreTrendsChart() {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#0c0e18] p-3 ring-1 ring-white/[0.05]">
      <div className="mb-3 flex flex-wrap gap-2">
        {PREVIEW_GENRES.map((genre) => (
          <span
            key={genre.name}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold ${
              genre.active
                ? "border-white/15 bg-white/[0.08] text-white"
                : "border-white/[0.06] bg-transparent text-slate-500"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: genre.color }}
              aria-hidden
            />
            {genre.name}
          </span>
        ))}
      </div>

      <svg viewBox="0 0 240 72" className="h-36 w-full sm:h-44" aria-hidden>
        <defs>
          {PREVIEW_GENRES.slice(0, 3).map((genre, index) => (
            <linearGradient
              key={genre.name}
              id={`genre-line-${index}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={genre.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={genre.color} stopOpacity="1" />
            </linearGradient>
          ))}
        </defs>
        {[0, 1, 2, 3].map((tick) => (
          <line
            key={tick}
            x1="0"
            y1={18 + tick * 16}
            x2="240"
            y2={18 + tick * 16}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}
        {GENRE_LINE_PATHS.map((path, index) => (
          <path
            key={path}
            d={path}
            fill="none"
            stroke={`url(#genre-line-${index})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <div className="mt-2 flex justify-between px-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {CHART_MONTHS.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

function MiniHeatmapCalendar() {
  const tHeatmap = useTranslations("heatmap");

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#0c0e18] p-3 ring-1 ring-white/[0.05]">
      <div className="flex items-start gap-2">
        <div
          className="flex shrink-0 flex-col justify-between text-[0.55rem] font-semibold text-slate-500"
          style={{
            width: "14px",
            paddingTop: "16px",
            height: `${7 * SQUARE_SIZE + 6 * SQUARE_GAP}px`,
          }}
        >
          {["M", "W", "F"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto pb-0.5">
          <div className="inline-block min-w-0">
            <div
              className="relative mb-1"
              style={{ height: "14px", minWidth: `${HEATMAP_WEEKS.length * (SQUARE_SIZE + SQUARE_GAP)}px` }}
            >
              {HEATMAP_MONTH_LABELS.map(({ weekIndex, label }) => (
                <span
                  key={label}
                  className="absolute top-0 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-slate-500"
                  style={{ left: `${weekIndex * (SQUARE_SIZE + SQUARE_GAP)}px` }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex" style={{ gap: `${SQUARE_GAP}px` }}>
              {HEATMAP_WEEKS.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  className="flex flex-col shrink-0"
                  style={{ gap: `${SQUARE_GAP}px` }}
                >
                  {week.map((intensity, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className="rounded-[2px]"
                      style={{
                        width: `${SQUARE_SIZE}px`,
                        height: `${SQUARE_SIZE}px`,
                        backgroundColor: HEATMAP_INTENSITY_COLORS[intensity],
                        outline: "1px solid rgba(255,255,255,0.06)",
                        outlineOffset: "-1px",
                      }}
                      aria-hidden
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.6rem] font-medium text-slate-500">
            {tHeatmap("legendLess")}
          </span>
          <div className="flex gap-[3px]">
            {HEATMAP_INTENSITY_COLORS.map((color) => (
              <div
                key={color}
                className="rounded-[2px]"
                style={{
                  width: "9px",
                  height: "9px",
                  backgroundColor: color,
                  outline: "1px solid rgba(255,255,255,0.06)",
                  outlineOffset: "-1px",
                }}
                aria-hidden
              />
            ))}
          </div>
          <span className="text-[0.6rem] font-medium text-slate-500">
            {tHeatmap("legendMore")}
          </span>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[0.6rem] font-semibold text-emerald-200">
          142 {tHeatmap("listensCount")}
        </span>
      </div>
    </div>
  );
}

function MiniTopArtistsChart() {
  const tArtists = useTranslations("artists");

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#0c0e18] p-3 ring-1 ring-white/[0.05]">
      <div className="space-y-3">
        {PREVIEW_TOP_ARTISTS.map((artist, index) => (
          <div
            key={artist.name}
            className="rounded-2xl border border-white/[0.06] bg-black/20 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] text-xs font-black text-white shadow-lg shadow-black/30">
                <span
                  className="absolute inset-0 rounded-full opacity-70"
                  style={{
                    background: `radial-gradient(circle at 30% 25%, ${artist.color}, transparent 68%)`,
                  }}
                  aria-hidden
                />
                <span className="relative">{artist.initials}</span>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-950 text-[0.55rem] font-black text-white">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{artist.name}</p>
                  <p className="shrink-0 text-xs font-semibold text-cyan-200">
                    {artist.listens.toLocaleString()}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-violet via-accent-cyan to-white/80"
                    style={{ width: `${artist.share}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {tArtists("sections.roster.top3Badge")}
      </p>
    </div>
  );
}

function MiniTimelineChart() {
  const tTimeline = useTranslations("timeline");

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#0c0e18] p-3 ring-1 ring-white/[0.05]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {tTimeline("chartTitle")}
        </p>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[0.6rem] font-semibold text-cyan-100">
          +18%
        </span>
      </div>

      <svg viewBox="0 0 280 80" className="h-36 w-full sm:h-44" aria-hidden>
        <defs>
          <linearGradient id="home-preview-timeline-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.38" />
            <stop offset="60%" stopColor="#a78bfa" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((tick) => (
          <line
            key={tick}
            x1="0"
            y1={18 + tick * 16}
            x2="280"
            y2={18 + tick * 16}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}
        <path d={TIMELINE_AREA_PATH} fill="url(#home-preview-timeline-fill)" />
        <path
          d={TIMELINE_LINE_PATH}
          fill="none"
          stroke="#67e8f9"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mt-2 flex justify-between px-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {TIMELINE_MONTHS.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

function MiniAlbumSpotlightGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:gap-4">
      {HOME_PREVIEW_ALBUMS.map((album, index) => (
        <div
          key={album.name}
          className="overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#0c0e18] p-1.5 shadow-xl shadow-black/40 ring-1 ring-white/[0.05]"
        >
          <div className="relative aspect-square overflow-hidden rounded-[1.1rem] bg-slate-900">
            <Image
              src={album.imageSrc}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1280px) 140px, (min-width: 1024px) 18vw, (min-width: 640px) 28vw, 44vw"
              priority={index < 2}
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10"
              aria-hidden
            />
            <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/90 text-sm font-black text-white shadow-lg shadow-black/40">
              {index + 1}
            </span>
            <div className="absolute inset-x-2 bottom-2 rounded-2xl border border-white/10 bg-slate-950/85 px-2.5 py-2 backdrop-blur-sm">
              <p className="truncate text-center text-xs font-semibold tracking-[-0.03em] text-white">
                {album.name}
              </p>
              <p className="truncate text-center text-[0.65rem] text-slate-400">
                {album.artist}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeGenreTrendsPreview() {
  const tGenre = useTranslations("genreTrends");
  const tHome = useTranslations("home.dashboardPreviews.genreTrends");

  return (
    <DashboardPreviewShell
      badge={tGenre("title")}
      badgeAccent="rose"
      title={tGenre("evolution")}
      description={tHome("description")}
    >
      <MiniGenreTrendsChart />
    </DashboardPreviewShell>
  );
}

export function HomeHeatmapPreview() {
  const tHeatmap = useTranslations("heatmap");
  const tHome = useTranslations("home.dashboardPreviews.heatmap");

  return (
    <DashboardPreviewShell
      badge={tHeatmap("heroEyebrow")}
      badgeAccent="emerald"
      title={tHeatmap("calendarTitle")}
      description={tHome("description")}
    >
      <MiniHeatmapCalendar />
    </DashboardPreviewShell>
  );
}

export function HomeAlbumSpotlightPreview() {
  const tOverview = useTranslations("overview");
  const tHome = useTranslations("home.dashboardPreviews.albumSpotlight");

  return (
    <DashboardPreviewShell
      badge={tOverview("topTracks")}
      badgeAccent="violet"
      title={tHome("title")}
      description={tHome("description")}
    >
      <MiniAlbumSpotlightGrid />
    </DashboardPreviewShell>
  );
}

export function HomeTopArtistsPreview() {
  const tArtists = useTranslations("artists");
  const tHome = useTranslations("home.dashboardPreviews.topArtists");

  return (
    <DashboardPreviewShell
      badge={tArtists("sections.roster.top3Badge")}
      badgeAccent="rose"
      title={tArtists("sections.roster.title")}
      description={tHome("description")}
    >
      <MiniTopArtistsChart />
    </DashboardPreviewShell>
  );
}

export function HomeTimelinePreview() {
  const tTimeline = useTranslations("timeline");
  const tHome = useTranslations("home.dashboardPreviews.timeline");

  return (
    <DashboardPreviewShell
      badge={tTimeline("heroEyebrow")}
      badgeAccent="cyan"
      title={tTimeline("title")}
      description={tHome("description")}
    >
      <MiniTimelineChart />
    </DashboardPreviewShell>
  );
}

export function HomeDashboardPreviewsSection() {
  const t = useTranslations("home.dashboardPreviews");

  return (
    <section id="dashboard-widgets" className="relative scroll-mt-24 pb-10 sm:pb-20">
      <HomeDashboardPreviewsParallax>
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center md:mb-12">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {t("eyebrow")}
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              {t("title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              {t("subtitle")}
            </p>
          </div>

          <HomeDashboardPreviewsParallaxGrid
            items={[
              <HomeGenreTrendsPreview key="genre-trends" />,
              <HomeHeatmapPreview key="heatmap" />,
              <HomeTopArtistsPreview key="top-artists" />,
              <HomeTimelinePreview key="timeline" />,
              <HomeAlbumSpotlightPreview key="album-spotlight" />,
            ]}
          />
        </div>
      </HomeDashboardPreviewsParallax>
    </section>
  );
}
