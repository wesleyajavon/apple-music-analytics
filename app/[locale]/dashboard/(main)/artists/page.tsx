"use client";

import { memo, useMemo, Suspense, useState, useCallback, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import {
  getDateRangePresetFromSearchParams,
  type DateRangePreset,
} from "@/lib/components/date-range-filter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { artistKeys, fetchArtistStats, useArtistStats } from "@/lib/hooks/use-artists";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import type { ArtistOverviewDto, ArtistStatsDto } from "@/lib/dto/artist";
import {
  getAvatarUrl,
  getArtistImageUrl,
  TopThreeArtists,
} from "@/lib/components/top-three-artists-cards";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { Mic2 } from "lucide-react";

/**
 * Couleurs pour avatars et graphiques (sans # pour UI Avatars)
 */
const CHART_COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
  "#38bdf8",
];
const ARTIST_RAIL_CLASS = "bg-gradient-to-r from-violet-400 via-cyan-300 to-lime-300";

const ARTISTS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.34),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#111827_48%,_#164e63_100%)] px-6 py-8 shadow-2xl shadow-cyan-950/40 sm:px-8 sm:py-10";

const TRENDS_CTA_CLASS =
  "inline-flex min-h-[44px] w-fit shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-white/95 px-5 py-2.5 text-sm font-semibold text-cyan-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

function ArtistsHeroFrame({
  trendsHref,
  stats,
  periodLine,
}: {
  trendsHref: string;
  stats: ReactNode;
  periodLine?: string;
}) {
  const t = useTranslations("artists");
  return (
    <div className={ARTISTS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(132,204,22,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-lime-300/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ARTIST_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <Mic2 className="h-9 w-9 shrink-0 text-cyan-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${ARTIST_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(139,92,246,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-cyan-100/90 sm:text-lg">{t("subtitle")}</p>
          {periodLine ? (
            <p className="mt-2 text-sm font-medium tracking-wide text-lime-100/85" aria-live="polite">
              {periodLine}
            </p>
          ) : null}
          {stats}
        </div>
        <Link href={trendsHref} className={TRENDS_CTA_CLASS}>
          {t("viewTrends")}
        </Link>
      </div>
    </div>
  );
}

function ArtistsHeroStats({ overview, locale }: { overview: ArtistOverviewDto; locale: string }) {
  const t = useTranslations("artists");
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      <div className="rounded-xl border border-violet-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-violet-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-violet-100/85">{t("artists")}</p>
        <p className="text-2xl font-bold text-white">{overview.totalArtists.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-cyan-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-cyan-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-cyan-100/85">{t("listens")}</p>
        <p className="text-2xl font-bold text-white">{overview.totalListens.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-lime-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-lime-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-lime-100/85">{t("topArtist")}</p>
        <p className="text-2xl font-bold text-white">{overview.topArtistListenCount.toLocaleString(locale)}</p>
      </div>
    </div>
  );
}

function ArtistsHeroStatsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[140px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-initial"
        >
          <div className="mb-2 h-3 w-20 rounded bg-white/15" />
          <div className="h-8 w-24 rounded bg-white/20" />
        </div>
      ))}
    </div>
  );
}

function ArtistCardSkeleton() {
  return (
    <div className="min-h-[168px] rounded-3xl border border-cyan-300/15 bg-card-surface p-5 shadow-lg shadow-violet-950/5">
      <div className="flex items-start gap-4">
        <div className="h-[76px] w-[76px] shrink-0 rounded-[1.15rem] bg-gray-200 animate-shimmer dark:bg-gray-700" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
          <div className="mt-3 h-6 w-40 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
          <div className="mt-4 flex gap-2">
            <div className="h-7 w-24 rounded-full bg-gray-200 animate-shimmer dark:bg-gray-700" />
            <div className="h-7 w-28 rounded-full bg-gray-200 animate-shimmer dark:bg-gray-700" />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-14 rounded-2xl bg-gray-100 animate-shimmer dark:bg-gray-800" />
        <div className="h-14 rounded-2xl bg-gray-100 animate-shimmer dark:bg-gray-800" />
      </div>
    </div>
  );
}

function ArtistsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <ArtistCardSkeleton key={index} />
      ))}
    </div>
  );
}

function ArtistsBarChartSkeleton() {
  return (
    <div className="h-[360px] rounded-2xl border border-cyan-200/20 bg-white/40 p-6 shadow-inner dark:border-cyan-300/10 dark:bg-slate-950/20" aria-busy="true">
      <div className="flex h-full flex-col justify-between">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="h-3 w-24 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
            <div
              className="h-5 rounded-r-lg bg-cyan-200 animate-shimmer dark:bg-cyan-900/70"
              style={{ width: `${35 + ((index * 13) % 55)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtistsPieChartSkeleton() {
  return (
    <div className="flex h-[360px] items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/40 p-6 shadow-inner dark:border-cyan-300/10 dark:bg-slate-950/20" aria-busy="true">
      <div className="h-56 w-56 rounded-full border-[34px] border-cyan-100 bg-gray-100 animate-shimmer dark:border-cyan-900/50 dark:bg-gray-800" />
    </div>
  );
}

function useArtistsTrendsHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("pageSize");
    const qs = params.toString();
    return qs ? `/dashboard/artists/trends?${qs}` : "/dashboard/artists/trends";
  }, [searchParams]);
}

function ArtistsPageFallback() {
  const trendsHref = useArtistsTrendsHref();
  return (
    <div className="space-y-8">
      <ArtistsHeroFrame trendsHref={trendsHref} stats={<ArtistsHeroStatsSkeleton />} />
      <OverviewSkeleton />
    </div>
  );
}

/**
 * Carte artiste style Replay – avatar, nom et signaux d'écoute
 */
const ArtistCard = memo(({
  artist,
  rank,
  t,
  locale,
  onOpenInsights,
}: {
  artist: ArtistStatsDto;
  rank: number;
  t: (k: string, v?: Record<string, string | number>) => string;
  locale: string;
  onOpenInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) => {
  const isTop3 = rank <= 3;
  const rankStyles = ["from-amber-400 to-amber-600", "from-slate-300 to-slate-500", "from-amber-700 to-amber-800"];
  const rankLabel = rank === 1 ? t("rank1st") : (t as (k: string, v?: Record<string, number>) => string)("rankNth", { n: rank });
  const avatarSize = isTop3 ? 76 : 64;
  const listensPerTrack = artist.uniqueTracks > 0 ? artist.listenCount / artist.uniqueTracks : artist.listenCount;
  const lastListen = new Date(artist.lastListenDate).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });

  const cardClass =
    `group relative min-h-[168px] overflow-hidden rounded-3xl border border-cyan-300/15
        bg-[radial-gradient(circle_at_15%_15%,_rgba(139,92,246,0.16),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(132,204,22,0.12),_transparent_32%),linear-gradient(135deg,_rgb(var(--card-rgb)/0.98),_rgb(var(--card-rgb)/0.86))]
        shadow-lg shadow-violet-950/5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-xl hover:shadow-cyan-950/10
        dark:border-cyan-300/12 dark:bg-[radial-gradient(circle_at_15%_15%,_rgba(139,92,246,0.24),_transparent_34%),radial-gradient(circle_at_88%_78%,_rgba(6,182,212,0.18),_transparent_32%),linear-gradient(135deg,_rgb(var(--card-rgb)/0.96),_rgb(var(--card-rgb)/0.82))]`;

  const interactiveRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--background-rgb))] dark:focus-visible:ring-offset-slate-950";

  const interactiveExtras = onOpenInsights
    ? `w-full cursor-pointer text-left ${interactiveRing}`
    : "";

  const statsRow = (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-2xl border border-violet-300/15 bg-white/45 px-3 py-2 shadow-inner dark:border-violet-200/10 dark:bg-slate-950/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t("listens")} / {t("tracks").toLowerCase()}
        </p>
        <p className="mt-0.5 text-lg font-black tabular-nums text-violet-700 dark:text-violet-100">
          {listensPerTrack.toLocaleString(locale, { maximumFractionDigits: 1 })}x
        </p>
      </div>
      <div className="rounded-2xl border border-cyan-300/15 bg-white/45 px-3 py-2 shadow-inner dark:border-cyan-200/10 dark:bg-slate-950/20">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("last")}</p>
        <p className="mt-0.5 truncate text-lg font-black tabular-nums text-cyan-700 dark:text-cyan-100">
          {lastListen}
        </p>
      </div>
    </div>
  );

  const body = (
    <>
      <div className="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-cyan-300/15" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-full w-1 bg-gradient-to-b from-violet-400 via-cyan-300 to-lime-300 opacity-70" />
      <div className="relative flex h-full flex-col justify-between gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 rounded-2xl bg-gradient-to-br from-violet-400/25 via-cyan-300/20 to-lime-300/20 p-1 shadow-lg shadow-violet-950/10">
            <div
              className="overflow-hidden rounded-[1.15rem] ring-1 ring-white/70 dark:ring-white/10"
              style={{
                width: avatarSize,
                height: avatarSize,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getArtistImageUrl(artist, avatarSize * 2, rank - 1)}
                alt={artist.artistName}
                width={avatarSize}
                height={avatarSize}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = getAvatarUrl(artist.artistName, avatarSize * 2, rank - 1);
                }}
              />
            </div>
            <span
              className={`absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white shadow-lg ring-2 ring-white/70 dark:ring-slate-950
                ${isTop3 ? `bg-gradient-to-br ${rankStyles[rank - 1]}` : "bg-slate-900 dark:bg-white dark:text-slate-950"}`}
            >
              {rank}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700/80 dark:text-cyan-100/75">
              {rankLabel}
            </p>
            <h3 className="mt-1 truncate text-lg font-bold text-gray-900 dark:text-white">
              {artist.artistName}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-300/10 dark:text-violet-100">
                {artist.listenCount.toLocaleString(locale)} {t("listensCount")}
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-100">
                {artist.uniqueTracks.toLocaleString(locale)} {t("uniqueTracks")}
              </span>
            </div>
          </div>
        </div>
        {statsRow}
      </div>
    </>
  );

  if (onOpenInsights) {
    return (
      <button
        type="button"
        className={`${cardClass} ${interactiveExtras}`}
        onClick={() => onOpenInsights(artist, rank - 1)}
        aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
      >
        {body}
      </button>
    );
  }

  return <div className={cardClass}>{body}</div>;
});

ArtistCard.displayName = "ArtistCard";

const VISIBLE_ARTISTS_COUNT = 8;

/**
 * Grille "All your artists" : top 8 visibles, toggle en 9e position, reste togglable
 */
const AllArtistsGrid = memo(({
  topArtists,
  t,
  locale,
  onOpenArtistInsights,
}: {
  topArtists: ArtistStatsDto[];
  t: (k: string, v?: Record<string, string | number>) => string;
  locale: string;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const visibleArtists = topArtists.slice(0, VISIBLE_ARTISTS_COUNT);
  const restArtists = topArtists.slice(VISIBLE_ARTISTS_COUNT);
  const hasMore = restArtists.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleArtists.map((artist, index) => (
        <ArtistCard
          key={artist.artistId}
          artist={artist}
          rank={index + 1}
          t={t}
          locale={locale}
          onOpenInsights={onOpenArtistInsights}
        />
      ))}
      {hasMore && (
        <div
          className="group relative flex min-h-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-cyan-300/35 dark:border-cyan-300/20
            bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.12),_transparent_36%),rgb(var(--card-rgb)/0.78)] transition-all duration-300
            hover:border-lime-400/50 hover:bg-lime-500/5 dark:hover:bg-lime-500/10"
          onClick={() => setExpanded((e) => !e)}
          onKeyDown={(ev) => ev.key === "Enter" && setExpanded((e) => !e)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? t("showLessArtists") : t("showMoreArtists", { count: restArtists.length })}
        >
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-200">
            {expanded ? t("showLessArtists") : t("showMoreArtists", { count: restArtists.length })}
          </span>
        </div>
      )}
      {expanded && restArtists.map((artist, index) => (
        <ArtistCard
          key={artist.artistId}
          artist={artist}
          rank={VISIBLE_ARTISTS_COUNT + index + 1}
          t={t}
          locale={locale}
          onOpenInsights={onOpenArtistInsights}
        />
      ))}
    </div>
  );
});

AllArtistsGrid.displayName = "AllArtistsGrid";

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className="h-4 w-4 shrink-0 transition-transform"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      {direction === "down" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      )}
    </svg>
  );
}

/**
 * Tableau détaillé – header cliquable pour expand/collapse
 */
const DetailedViewSection = memo(({
  artists,
  page,
  pageSize,
  totalPages,
  total,
  hasMore,
  offset,
  isFetching,
  onPageChange,
  onPageSizeChange,
  t,
  locale,
}: {
  artists: ArtistStatsDto[];
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  offset: number;
  isFetching: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  t: (k: string, v?: Record<string, string | number>) => string;
  locale: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + artists.length, total);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.08),_transparent_34%),rgb(var(--card-rgb)/0.94)] shadow-lg shadow-violet-950/5 dark:border-cyan-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_34%),rgb(var(--card-rgb)/0.9)]">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ARTIST_RAIL_CLASS} opacity-75`} />
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start justify-between gap-4 border-b border-violet-200/20 px-6 py-4 text-left transition-colors hover:bg-cyan-500/5 dark:border-cyan-300/10 dark:hover:bg-cyan-300/5"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("detailedView")}</h3>
          <p className="mt-0.5 text-sm text-cyan-700/75 dark:text-cyan-100/70">{t("datesAndTracks")}</p>
        </div>
        <ChevronIcon direction={expanded ? "up" : "down"} />
      </button>
      {expanded && (
        <>
        <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="sticky top-0 z-10 bg-cyan-50/95 backdrop-blur supports-[backdrop-filter]:bg-cyan-50/80 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/80">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("rank")}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("artist")}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("listensLabel")}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("tracks")}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("first")}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("last")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isFetching
                ? Array.from({ length: Math.min(pageSize, 10) }).map((_, index) => (
                    <tr key={`artist-skeleton-${index}`}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="ml-auto h-4 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  ))
                : artists.map((artist, index) => {
                const rankStyles = ["text-amber-500", "text-slate-400", "text-amber-700"];
                const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                const rankStyle = index < 3 ? rankStyles[index] : "text-gray-400 dark:text-gray-500";
                const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-700/50";
                return (
                  <tr key={artist.artistId} className="hover:bg-cyan-50/70 dark:hover:bg-cyan-300/5 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${rankStyle} ${rankBgStyle}`}>
                        {offset + index + 1}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getArtistImageUrl(artist, 72, index)}
                            alt=""
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = getAvatarUrl(artist.artistName, 72, index);
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{artist.artistName}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                      {artist.listenCount.toLocaleString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                      {artist.uniqueTracks}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {new Date(artist.firstListenDate).toLocaleDateString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                      {new Date(artist.lastListenDate).toLocaleDateString(locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-violet-200/30 bg-violet-50/25 px-6 py-4 dark:border-violet-400/15 dark:bg-violet-950/15 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-violet-900/75 dark:text-violet-100/75">
            {t("paginationSummary", {
              start: pageStart,
              end: pageEnd,
              total,
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-violet-200/70 bg-white/90 px-3 py-1.5 text-sm font-medium text-violet-950 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/30 dark:bg-slate-900/60 dark:text-violet-50 dark:hover:bg-violet-950/35"
            >
              {t("paginationPrevious")}
            </button>
            <label className="ml-2 inline-flex items-center gap-2 text-sm text-violet-900/85 dark:text-violet-100/80">
              <span>{t("pageSizeLabel")}</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-violet-200/70 bg-white px-2 py-1 text-sm text-violet-950 dark:border-violet-500/30 dark:bg-slate-900 dark:text-violet-50"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <span className="px-2 text-sm text-violet-900/85 dark:text-violet-100/80">
              {t("paginationPage", { page, totalPages })}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-violet-200/70 bg-white/90 px-3 py-1.5 text-sm font-medium text-violet-950 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-500/30 dark:bg-slate-900/60 dark:text-violet-50 dark:hover:bg-violet-950/35"
            >
              {t("paginationNext")}
            </button>
          </div>
        </div>
        {isFetching ? (
          <div className="px-6 pb-4 text-xs text-violet-800/70 dark:text-violet-200/60">{t("paginationLoading")}</div>
        ) : null}
        </>
      )}
    </div>
  );
});

DetailedViewSection.displayName = "DetailedViewSection";

function formatDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  locale: string
): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}

function ArtistsContent() {
  const DEFAULT_PAGE_SIZE = 20;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("artists");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = [20, 50, 100].includes(
    Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)
  )
    ? Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const [artistInsightsTarget, setArtistInsightsTarget] = useState<{
    artist: ArtistStatsDto;
    avatarColorIndex: number;
  } | null>(null);

  const handleOpenArtistInsights = useCallback((artist: ArtistStatsDto, avatarColorIndex: number) => {
    setArtistInsightsTarget({ artist, avatarColorIndex });
  }, []);

  const updatePaginationParams = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(Math.max(1, nextPage)));
      params.set("pageSize", String(nextPageSize));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const preset = getDateRangePresetFromSearchParams(searchParams);
  const {
    startDate: rangeStart,
    endDate: rangeEnd,
    isLoading: rangeLoading,
  } = useListenDateRange();

  const periodLine = useMemo(() => {
    const presetLabel: Record<DateRangePreset, string> = {
      "7d": t("periodLast7Days"),
      "30d": t("periodLast30Days"),
      ytd: t("periodYearToDate"),
      all: t("periodAllTime"),
      custom: t("periodCustom"),
    };
    const name = presetLabel[preset];
    const dates = formatDateRange(rangeStart, rangeEnd, locale);
    if (dates) {
      return `${name} · ${dates}`;
    }
    if (preset === "all" && rangeLoading) {
      return name;
    }
    return name;
  }, [preset, rangeStart, rangeEnd, rangeLoading, locale, t]);

  const {
    data: topData,
    isLoading: isTopLoading,
    error: topError,
    refetch: refetchTop,
  } = useArtistStats(
    startDate,
    endDate,
    userId,
    20
  );
  const {
    data: pagedData,
    isLoading: isPagedLoading,
    isFetching: isPagedFetching,
    error: pagedError,
    refetch: refetchPaged,
  } = useArtistStats(
    startDate,
    endDate,
    userId,
    pageSize,
    offset
  );

  const topArtists = useMemo(() => topData?.topArtists ?? [], [topData?.topArtists]);
  const pagedArtists = useMemo(() => pagedData?.topArtists ?? [], [pagedData?.topArtists]);
  const pagination = pagedData?.pagination;
  const totalArtistsInRange = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalArtistsInRange / pageSize));
  const maxListens = topArtists[0]?.listenCount ?? 1;
  const trendsHref = useArtistsTrendsHref();

  useEffect(() => {
    if (page > totalPages) {
      updatePaginationParams(totalPages, pageSize);
    }
  }, [page, pageSize, totalPages, updatePaginationParams]);

  useEffect(() => {
    if (!pagination?.hasMore) return;
    const nextOffset = offset + pageSize;
    void queryClient.prefetchQuery({
      queryKey: artistKeys.stats({
        startDate,
        endDate,
        userId,
        limit: pageSize,
        offset: nextOffset,
      }),
      queryFn: () => fetchArtistStats(startDate, endDate, userId, pageSize, nextOffset),
    });
  }, [
    endDate,
    offset,
    pageSize,
    pagination?.hasMore,
    queryClient,
    startDate,
    userId,
  ]);

  const barChartData = useMemo(() => {
    return topArtists.slice(0, 10).map((artist) => ({
      name: artist.artistName.length > 20 ? artist.artistName.substring(0, 20) + "..." : artist.artistName,
      fullName: artist.artistName,
      listens: artist.listenCount,
      titres: artist.uniqueTracks,
    }));
  }, [topArtists]);

  const pieChartData = useMemo(() => {
    return topArtists.slice(0, 6).map((artist, index) => ({
      name: artist.artistName,
      value: artist.listenCount,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [topArtists]);

  if (!isTopLoading && topError && !topData) {
    return (
      <div className="space-y-8">
        <ArtistsHeroFrame trendsHref={trendsHref} stats={null} periodLine={periodLine} />
        <ErrorState error={topError} message={t("errorLoading")} onRetry={refetchTop} />
      </div>
    );
  }
  if (!isTopLoading && (!topData || topData.topArtists.length === 0)) {
    return (
      <div className="space-y-8">
        <ArtistsHeroFrame trendsHref={trendsHref} stats={null} periodLine={periodLine} />
        <EmptyState {...emptyStatePresets.importData} />
      </div>
    );
  }
  if (!isPagedLoading && pagedError && !pagedData) {
    return (
      <div className="space-y-8">
        <ArtistsHeroFrame
          trendsHref={trendsHref}
          stats={
            topData ? (
              <ArtistsHeroStats overview={topData.overview} locale={locale} />
            ) : (
              <ArtistsHeroStatsSkeleton />
            )
          }
          periodLine={periodLine}
        />
        <ErrorState error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
      </div>
    );
  }
  const overview = topData?.overview;

  return (
    <div className="space-y-8">
      <ArtistsHeroFrame
        trendsHref={trendsHref}
        stats={
          overview ? (
            <ArtistsHeroStats overview={overview} locale={locale} />
          ) : (
            <ArtistsHeroStatsSkeleton />
          )
        }
        periodLine={periodLine}
      />

      {/* Top 3 – grandes cartes style Replay */}
      <section className="animate-fade-in-up">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("top3Title")}</h3>
        {isTopLoading ? (
          <ArtistsGridSkeleton count={3} />
        ) : (
          <TopThreeArtists artists={topArtists} maxListens={maxListens} t={t} locale={locale} />
        )}
      </section>

      {/* Graphiques – Top 10 listens + Distribution Top 6 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 border-l-4 border-l-violet-400 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card transition-shadow duration-300 hover:shadow-card-hover dark:border-cyan-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.1),_transparent_30%),rgb(var(--card-rgb)/0.9)]">
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ARTIST_RAIL_CLASS} opacity-80`} />
          <div className="border-b border-cyan-200/20 px-6 py-4 dark:border-cyan-300/10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("top10Listens")}</h3>
          </div>
          <div className="relative p-6">
            <div className="pointer-events-none absolute left-1/3 top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/15" />
            {isTopLoading ? (
              <ArtistsBarChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#84cc16" />
                    </linearGradient>
                    <filter id="artistBarGlow" x="-20%" y="-20%" width="140%" height="150%">
                      <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#06b6d4" floodOpacity="0.2" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#67e8f9" strokeOpacity={0.28} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "rgb(var(--muted-rgb))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "rgb(var(--muted-rgb))", fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                    labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                    itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                    formatter={(value: number, name: string, props: { payload?: { fullName?: string } }) => {
                      const fullName = props?.payload?.fullName;
                      if (name === "listens") return [`${value.toLocaleString(locale)} ${t("listensCount")}`, fullName || t("artistTooltip")];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="listens" fill="url(#barGradient)" filter="url(#artistBarGlow)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 border-l-4 border-l-lime-400 bg-[radial-gradient(circle_at_top_left,_rgba(132,204,22,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card transition-shadow duration-300 hover:shadow-card-hover dark:border-cyan-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(132,204,22,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(139,92,246,0.12),_transparent_30%),rgb(var(--card-rgb)/0.9)]">
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ARTIST_RAIL_CLASS} opacity-80`} />
          <div className="border-b border-cyan-200/20 px-6 py-4 dark:border-cyan-300/10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("distributionTop6")}</h3>
          </div>
          <div className="relative p-6">
            <div className="pointer-events-none absolute left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-lime-300/10 blur-3xl dark:bg-lime-300/15" />
            {isTopLoading ? (
              <ArtistsPieChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <defs>
                    <filter id="artistPieGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#8b5cf6" floodOpacity="0.18" />
                    </filter>
                  </defs>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name.length > 12 ? name.substring(0, 12) + "…" : name} (${(percent * 100).toFixed(1)}%)`
                    }
                    innerRadius={58}
                    outerRadius={116}
                    paddingAngle={2}
                    fill="#a855f7"
                    dataKey="value"
                    filter="url(#artistPieGlow)"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="rgb(var(--card-rgb) / 0.95)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                    labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                    itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                    formatter={(value: number) => [`${value.toLocaleString(locale)} ${t("listensCount")}`, t("listens")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Grille d'artistes – top 8 visibles, reste togglable (toggle en 9e position) */}
      <section className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("allArtists")}</h3>
        {isTopLoading ? (
          <ArtistsGridSkeleton />
        ) : (
          <AllArtistsGrid
            topArtists={topArtists}
            t={t}
            locale={locale}
            onOpenArtistInsights={handleOpenArtistInsights}
          />
        )}
      </section>

      {/* Tableau détaillé – togglable */}
      <DetailedViewSection
        artists={pagedArtists}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        total={totalArtistsInRange}
        hasMore={pagination?.hasMore ?? false}
        offset={offset}
        isFetching={isPagedFetching || !pagedData}
        onPageChange={(nextPage) => updatePaginationParams(nextPage, pageSize)}
        onPageSizeChange={(nextPageSize) => updatePaginationParams(1, nextPageSize)}
        t={t}
        locale={locale}
      />

      <ArtistUserInsightsPanel
        open={artistInsightsTarget != null}
        artistId={artistInsightsTarget?.artist.artistId ?? null}
        previewArtist={artistInsightsTarget?.artist ?? null}
        startDate={startDate}
        endDate={endDate}
        userId={userId}
        locale={locale}
        colorIndex={artistInsightsTarget?.avatarColorIndex ?? 0}
        onClose={() => setArtistInsightsTarget(null)}
      />
    </div>
  );
}

export default function ArtistsPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<ArtistsPageFallback />}>
        <ArtistsContent />
      </Suspense>
    </div>
  );
}
