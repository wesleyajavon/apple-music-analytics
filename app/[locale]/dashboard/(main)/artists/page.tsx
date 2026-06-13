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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { artistKeys, fetchArtistStats, useArtistStats } from "@/lib/hooks/use-artists";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_GRADIENT_TABLE,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_LIME,
  DASHBOARD_SPOTLIGHT_BADGE_CYAN_COMPACT,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_TABLE_HEAD,
  DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL,
  DASHBOARD_SPOTLIGHT_TABLE_ROW_HOVER,
  DASHBOARD_SPOTLIGHT_FOOTER,
  DASHBOARD_SPOTLIGHT_FOOTER_TEXT,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_SELECT,
  DASHBOARD_SPOTLIGHT_LABEL,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { useTheme } from "@/lib/providers/theme-provider";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import type { ArtistOverviewDto, ArtistStatsDto } from "@/lib/dto/artist";
import { TopThreeArtists } from "@/lib/components/top-three-artists-cards";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { LineChart } from "lucide-react";

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
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

function ArtistsHeroFrame({ trendsHref, stats, badgeLabel }: { trendsHref: string; stats: ReactNode; badgeLabel: string }) {
  const t = useTranslations("artists");
  return (
    <div className={ARTISTS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={trendsHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <LineChart className="h-4 w-4" aria-hidden />
              {t("viewTrends")}
            </Link>
            <span className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur">{badgeLabel}</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
              </div>
              {stats}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistsHeroStats({ overview, locale }: { overview: ArtistOverviewDto; locale: string }) {
  const t = useTranslations("artists");
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{overview.totalArtists.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("artists")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{overview.totalListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("listens")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{overview.topArtistListenCount.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("topArtist")}</p>
      </div>
    </div>
  );
}

function ArtistsHeroStatsSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-20 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function ArtistsSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function formatDateRange(startDate: string | undefined, endDate: string | undefined, locale: string): string {
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

function useArtistsHeroBadge() {
  const locale = useLocale();
  const t = useTranslations("artists");
  const searchParams = useSearchParams();
  const preset = getDateRangePresetFromSearchParams(searchParams);
  const { startDate: rangeStart, endDate: rangeEnd, isLoading: rangeLoading } = useListenDateRange();
  return useMemo(() => {
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
    <div className="h-[360px] rounded-[1.35rem] border border-slate-200/80 bg-slate-100/50 p-5 dark:border-white/10 dark:bg-black/30" aria-busy="true">
      <div className="flex h-full flex-col justify-between">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="h-3 w-24 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
            <div
              className="h-5 rounded-r-lg bg-violet-200/60 animate-shimmer dark:bg-violet-400/20"
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
    <div className="flex h-[360px] items-center justify-center rounded-[1.35rem] border border-slate-200/80 bg-slate-100/50 p-6 dark:border-white/10 dark:bg-black/30" aria-busy="true">
      <div className="h-56 w-56 rounded-full border-[34px] border-violet-200/50 bg-slate-200/40 animate-shimmer dark:border-violet-400/25 dark:bg-white/10" />
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
  const badgeLabel = useArtistsHeroBadge();
  return (
    <>
      <div className="lg:hidden">
        <ArtistsMobileSkeleton />
      </div>
      <div className="hidden space-y-12 lg:block">
        <ArtistsHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={<ArtistsHeroStatsSkeleton />} />
        <OverviewSkeleton />
      </div>
    </>
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
              <ArtistAvatarHydrated
                artistId={artist.artistId}
                artistName={artist.artistName}
                imageUrl={artist.imageUrl}
                avatarApiSize={avatarSize * 2}
                colorIndex={rank - 1}
                alt={artist.artistName}
                width={avatarSize}
                height={avatarSize}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
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

function ArtistsMobileSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 shadow-xl shadow-violet-500/10">
        <div className="h-3 w-28 animate-shimmer rounded bg-white/15" />
        <div className="mt-5 h-8 w-48 animate-shimmer rounded bg-white/20" />
        <div className="mt-3 h-4 w-full animate-shimmer rounded bg-white/10" />
        <div className="mt-5 h-28 animate-shimmer rounded-[1.35rem] bg-white/10" />
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-24 min-w-[9.5rem] animate-shimmer rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </div>
      <div className="space-y-2 rounded-[1.5rem] border border-card-border bg-card-surface p-4">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-14 animate-shimmer rounded-2xl bg-surface/80" />
        ))}
      </div>
    </div>
  );
}

function ArtistsMobileEmptyHero({ trendsHref, badgeLabel }: { trendsHref: string; badgeLabel: string }) {
  const t = useTranslations("artists");

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-xl shadow-violet-500/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(6,182,212,0.22),transparent_34%),linear-gradient(150deg,rgba(3,7,18,0.98),rgba(30,27,75,0.84)_55%,rgba(8,47,73,0.6))]" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-violet-100">{t("mobile.heroEyebrow")}</p>
          <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold text-white/75">{badgeLabel}</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-white">{t("mobile.heroTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/68">{t("mobile.heroSubtitle")}</p>
        <Link
          href={trendsHref}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-lg shadow-black/20"
        >
          <LineChart className="h-4 w-4" aria-hidden />
          {t("viewTrends")}
        </Link>
      </div>
    </div>
  );
}

function MobileArtistRow({
  artist,
  rank,
  locale,
  maxListens,
  onOpenInsights,
}: {
  artist: ArtistStatsDto;
  rank: number;
  locale: string;
  maxListens: number;
  onOpenInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("artists");
  const width = Math.max(8, Math.round((artist.listenCount / Math.max(1, maxListens)) * 100));
  return (
    <button
      type="button"
      className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-card-border bg-surface/70 px-3 py-2 text-left transition-colors active:bg-surface-glass"
      onClick={() => onOpenInsights(artist, rank - 1)}
      aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
        {rank}
      </span>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
        <ArtistAvatarHydrated
          artistId={artist.artistId}
          artistName={artist.artistName}
          imageUrl={artist.imageUrl}
          avatarApiSize={80}
          colorIndex={rank - 1}
          alt=""
          width={40}
          height={40}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-foreground">{artist.artistName}</p>
          <p className="shrink-0 text-xs font-semibold tabular-nums text-muted">{artist.listenCount.toLocaleString(locale)}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-lime-300" style={{ width: `${width}%` }} />
        </div>
      </div>
    </button>
  );
}

function ArtistsMobileExperience({
  trendsHref,
  badgeLabel,
  overview,
  topArtists,
  pagedArtists,
  isTopLoading,
  isPagedFetching,
  page,
  pageSize,
  totalPages,
  total,
  hasMore,
  offset,
  onPageChange,
  onPageSizeChange,
  onOpenArtistInsights,
  locale,
}: {
  trendsHref: string;
  badgeLabel: string;
  overview: ArtistOverviewDto | undefined;
  topArtists: ArtistStatsDto[];
  pagedArtists: ArtistStatsDto[];
  isTopLoading: boolean;
  isPagedFetching: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  offset: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  locale: string;
}) {
  const t = useTranslations("artists");
  const topArtist = topArtists[0];
  const topFive = topArtists.slice(0, 5);
  const supportingArtists = topArtists.slice(5, 20);
  const maxListens = topArtist?.listenCount ?? 1;
  const topShare = overview && overview.totalListens > 0 && topArtist
    ? topArtist.listenCount / overview.totalListens
    : 0;
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormatter = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }),
    [locale]
  );
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + pagedArtists.length, total);

  if (isTopLoading) return <ArtistsMobileSkeleton />;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-xl shadow-violet-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(6,182,212,0.22),transparent_34%),linear-gradient(150deg,rgba(3,7,18,0.98),rgba(30,27,75,0.84)_55%,rgba(8,47,73,0.6))]" aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-violet-100">{t("mobile.heroEyebrow")}</p>
            <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.68rem] font-semibold text-white/75">{badgeLabel}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.055em] text-white">{t("mobile.heroTitle")}</h1>
          <p className="mt-3 text-sm leading-6 text-white/68">{t("mobile.heroSubtitle")}</p>

          <div className="mt-5 rounded-[1.35rem] border border-white/12 bg-white/10 p-4 backdrop-blur">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-cyan-100/80">{t("mobile.primaryInsightEyebrow")}</p>
            {topArtist ? (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/20">
                  <ArtistAvatarHydrated
                    artistId={topArtist.artistId}
                    artistName={topArtist.artistName}
                    imageUrl={topArtist.imageUrl}
                    avatarApiSize={128}
                    colorIndex={0}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-2xl font-semibold tracking-[-0.045em] text-white">{topArtist.artistName}</p>
                  <p className="mt-1 text-xs leading-5 text-white/68">{t("mobile.primaryInsightBody", { name: topArtist.artistName })}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-white/70">{t("mobile.primaryInsightFallback")}</p>
            )}
            {topArtist && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/78">
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {t("mobile.listenCount", { count: formatter.format(topArtist.listenCount) })}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {t("mobile.shareLabel", { share: percentFormatter.format(topShare) })}
                </span>
              </div>
            )}
          </div>

          <Link
            href={trendsHref}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-lg shadow-black/20"
          >
            <LineChart className="h-4 w-4" aria-hidden />
            {t("viewTrends")}
          </Link>
        </div>
      </section>

      <section aria-label={t("mobile.signalsLabel")} className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex gap-3">
          <div className="min-w-[9rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("artists")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatter.format(overview?.totalArtists ?? 0)}</p>
          </div>
          <div className="min-w-[9rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("listens")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{formatter.format(overview?.totalListens ?? 0)}</p>
          </div>
          <div className="min-w-[9rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("mobile.avgSignal")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {(overview?.averageListensPerArtist ?? 0).toLocaleString(locale, { maximumFractionDigits: 1 })}
            </p>
          </div>
          <div className="min-w-[10rem] rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{t("mobile.concentrationSignal")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{percentFormatter.format(topShare)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-card-border bg-card-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("mobile.topFiveEyebrow")}</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-foreground">{t("mobile.topFiveTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{t("mobile.topFiveDescription")}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {topFive.map((artist, index) => (
            <MobileArtistRow
              key={artist.artistId}
              artist={artist}
              rank={index + 1}
              locale={locale}
              maxListens={maxListens}
              onOpenInsights={onOpenArtistInsights}
            />
          ))}
        </div>
      </section>

      {supportingArtists.length > 0 && (
        <details className="group rounded-[1.5rem] border border-card-border bg-card-surface shadow-sm">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-sm font-semibold text-foreground">{t("mobile.disclosures.supporting.title")}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">{t("mobile.disclosures.supporting.description")}</span>
            </span>
            <span className="rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition group-open:bg-primary group-open:text-primary-foreground">
              {t("showMoreArtists", { count: supportingArtists.length })}
            </span>
          </summary>
          <div className="space-y-2 border-t border-card-border p-4">
            {supportingArtists.map((artist, index) => (
              <MobileArtistRow
                key={artist.artistId}
                artist={artist}
                rank={index + 6}
                locale={locale}
                maxListens={maxListens}
                onOpenInsights={onOpenArtistInsights}
              />
            ))}
          </div>
        </details>
      )}

      <details className="group rounded-[1.5rem] border border-card-border bg-card-surface shadow-sm">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-semibold text-foreground">{t("mobile.disclosures.index.title")}</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted">{t("mobile.disclosures.index.description")}</span>
          </span>
          <span className="rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition group-open:bg-primary group-open:text-primary-foreground">
            {t("mobile.open")}
          </span>
        </summary>
        <div className="border-t border-card-border">
          <div className="divide-y divide-card-border">
            {isPagedFetching
              ? Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                  <div key={`artist-mobile-page-skeleton-${index}`} className="flex min-h-14 items-center gap-3 px-4 py-3">
                    <div className="h-10 w-10 animate-shimmer rounded-xl bg-slate-200/90 dark:bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-32 animate-shimmer rounded bg-slate-200/90 dark:bg-white/10" />
                      <div className="h-3 w-20 animate-shimmer rounded bg-slate-200/90 dark:bg-white/10" />
                    </div>
                  </div>
                ))
              : pagedArtists.map((artist, index) => (
                  <MobileArtistRow
                    key={artist.artistId}
                    artist={artist}
                    rank={offset + index + 1}
                    locale={locale}
                    maxListens={maxListens}
                    onOpenInsights={onOpenArtistInsights}
                  />
                ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-card-border p-4">
            <p className="text-xs text-muted">
              {t("paginationSummary", {
                start: pageStart,
                end: pageEnd,
                total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("paginationPrevious")}
              </button>
              <span className="shrink-0 px-2 text-xs font-semibold text-muted">{t("paginationPage", { page, totalPages })}</span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasMore}
                className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("paginationNext")}
              </button>
            </div>
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground">
              <span>{t("pageSizeLabel")}</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="rounded-xl border border-card-border bg-card-surface px-3 py-2 text-sm"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}

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
  onOpenArtistInsights,
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
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  t: (k: string, v?: Record<string, string | number>) => string;
  locale: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + artists.length, total);

  return (
    <div className={DASHBOARD_SPOTLIGHT_SHELL}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_TABLE} aria-hidden />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`relative flex w-full items-start justify-between gap-4 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-5 text-left transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.04] sm:px-8`}
        aria-expanded={expanded}
      >
        <div>
          <div className={`mb-2 ${DASHBOARD_SPOTLIGHT_BADGE_CYAN_COMPACT}`}>
            <LiveStatusDot tone="cyan" />
            {t("sections.table.badge")}
          </div>
          <h3 className={DASHBOARD_SPOTLIGHT_TITLE}>{t("sections.table.title")}</h3>
          <p className={`mt-1 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("datesAndTracks")}</p>
        </div>
        <span className="text-slate-500 dark:text-slate-400">
          <ChevronIcon direction={expanded ? "up" : "down"} />
        </span>
      </button>
      {expanded && (
        <>
        <div className="divide-y divide-slate-200/90 dark:divide-white/10 lg:hidden">
          {isFetching
            ? Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                <div key={`artist-mobile-skeleton-${index}`} className="flex items-center gap-3 px-4 py-4">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200/90 dark:bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
                    <div className="h-3 w-20 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
                  </div>
                </div>
              ))
            : artists.map((artist, index) => {
                const avatarColorIndex = offset + index;
                const openInsights = () => onOpenArtistInsights(artist, avatarColorIndex);
                return (
                  <button
                    key={artist.artistId}
                    type="button"
                    className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/90 active:bg-slate-100/90 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]"
                    onClick={openInsights}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-sm font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {offset + index + 1}
                    </span>
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <ArtistAvatarHydrated
                        artistId={artist.artistId}
                        artistName={artist.artistName}
                        imageUrl={artist.imageUrl}
                        avatarApiSize={72}
                        colorIndex={avatarColorIndex}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{artist.artistName}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                        {artist.listenCount.toLocaleString(locale)} {t("listensLabel")} · {artist.uniqueTracks} {t("tracks")}
                      </p>
                    </div>
                  </button>
                );
              })}
        </div>
        <div className="relative hidden max-h-[min(70vh,640px)] overflow-x-auto overflow-y-auto lg:block">
          <table className="min-w-full divide-y divide-slate-200/90 dark:divide-white/10">
            <thead className={DASHBOARD_SPOTLIGHT_TABLE_HEAD}>
              <tr>
                <th scope="col" className={`px-5 py-3 text-left ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                  {t("rank")}
                </th>
                <th scope="col" className={`px-5 py-3 text-left ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                  {t("artist")}
                </th>
                <th scope="col" className={`px-5 py-3 text-right ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                  {t("listensLabel")}
                </th>
                <th scope="col" className={`px-5 py-3 text-right ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                  {t("tracks")}
                </th>
                <th scope="col" className={`px-5 py-3 text-right ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                  {t("first")}
                </th>
                <th scope="col" className={`px-5 py-3 text-right ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                  {t("last")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isFetching
                ? Array.from({ length: Math.min(pageSize, 10) }).map((_, index) => (
                    <tr key={`artist-skeleton-${index}`}>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200/90 dark:bg-white/10" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="h-4 w-44 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="ml-auto h-4 w-10 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-200/90 dark:bg-white/10" />
                      </td>
                    </tr>
                  ))
                : artists.map((artist, index) => {
                const rankStyles = ["text-amber-700 dark:text-amber-400", "text-slate-600 dark:text-slate-300", "text-amber-800 dark:text-amber-500"];
                const rankBg = ["bg-amber-100 dark:bg-amber-400/20", "bg-slate-200 dark:bg-slate-400/15", "bg-amber-100 dark:bg-amber-500/20"];
                const rankStyle = index < 3 ? rankStyles[index] : "text-slate-500 dark:text-slate-500";
                const rankBgStyle = index < 3 ? rankBg[index] : "bg-slate-200/80 dark:bg-white/10";
                const avatarColorIndex = offset + index;
                const rowInteractive =
                  `cursor-pointer ${DASHBOARD_SPOTLIGHT_TABLE_ROW_HOVER} ` +
                  "focus-visible:bg-slate-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/50 dark:focus-visible:bg-white/[0.06] dark:focus-visible:ring-cyan-400/60";
                const openInsights = () => onOpenArtistInsights(artist, avatarColorIndex);
                return (
                  <tr
                    key={artist.artistId}
                    className={rowInteractive}
                    tabIndex={0}
                    role="button"
                    aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
                    onClick={openInsights}
                    onKeyDown={(ev) => {
                      if (ev.key !== "Enter" && ev.key !== " ") return;
                      ev.preventDefault();
                      openInsights();
                    }}
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${rankStyle} ${rankBgStyle}`}>
                        {offset + index + 1}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full">
                          <ArtistAvatarHydrated
                            artistId={artist.artistId}
                            artistName={artist.artistName}
                            imageUrl={artist.imageUrl}
                            avatarApiSize={72}
                            colorIndex={avatarColorIndex}
                            alt=""
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{artist.artistName}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {artist.listenCount.toLocaleString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                      {artist.uniqueTracks}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                      {new Date(artist.firstListenDate).toLocaleDateString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                      {new Date(artist.lastListenDate).toLocaleDateString(locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={DASHBOARD_SPOTLIGHT_FOOTER}>
          <p className={DASHBOARD_SPOTLIGHT_FOOTER_TEXT}>
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
              className={DASHBOARD_SPOTLIGHT_BTN_SECONDARY}
            >
              {t("paginationPrevious")}
            </button>
            <label className={DASHBOARD_SPOTLIGHT_LABEL}>
              <span>{t("pageSizeLabel")}</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className={DASHBOARD_SPOTLIGHT_SELECT}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <span className={`px-2 ${DASHBOARD_SPOTLIGHT_FOOTER_TEXT}`}>
              {t("paginationPage", { page, totalPages })}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
              className={DASHBOARD_SPOTLIGHT_BTN_SECONDARY}
            >
              {t("paginationNext")}
            </button>
          </div>
        </div>
        {isFetching ? (
          <div className="px-5 pb-4 text-xs text-slate-500 dark:text-slate-500 sm:px-8">{t("paginationLoading")}</div>
        ) : null}
        </>
      )}
    </div>
  );
});

DetailedViewSection.displayName = "DetailedViewSection";

function ArtistsContent() {
  const DEFAULT_PAGE_SIZE = 20;
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const isLgChart = useIsLgChartViewport();
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
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const badgeLabel = useArtistsHeroBadge();

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
      <>
        <div className="space-y-6 lg:hidden">
          <ArtistsMobileEmptyHero trendsHref={trendsHref} badgeLabel={badgeLabel} />
          <ErrorState variant="startup" error={topError} message={t("errorLoading")} onRetry={refetchTop} />
        </div>
        <div className="hidden space-y-12 lg:block">
          <ArtistsHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={null} />
          <ErrorState variant="startup" error={topError} message={t("errorLoading")} onRetry={refetchTop} />
        </div>
      </>
    );
  }
  if (!isTopLoading && (!topData || topData.topArtists.length === 0)) {
    return (
      <>
        <div className="space-y-6 lg:hidden">
          <ArtistsMobileEmptyHero trendsHref={trendsHref} badgeLabel={badgeLabel} />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
        <div className="hidden space-y-12 lg:block">
          <ArtistsHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={null} />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
      </>
    );
  }
  if (!isPagedLoading && pagedError && !pagedData) {
    return (
      <>
        <div className="space-y-6 lg:hidden">
          <ArtistsMobileExperience
            trendsHref={trendsHref}
            badgeLabel={badgeLabel}
            overview={topData?.overview}
            topArtists={topArtists}
            pagedArtists={[]}
            isTopLoading={isTopLoading}
            isPagedFetching={false}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            total={totalArtistsInRange}
            hasMore={false}
            offset={offset}
            onPageChange={(nextPage) => updatePaginationParams(nextPage, pageSize)}
            onPageSizeChange={(nextPageSize) => updatePaginationParams(1, nextPageSize)}
            onOpenArtistInsights={handleOpenArtistInsights}
            locale={locale}
          />
          <ErrorState variant="startup" error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
        </div>
        <div className="hidden space-y-12 lg:block">
          <ArtistsHeroFrame
            trendsHref={trendsHref}
            badgeLabel={badgeLabel}
            stats={
              topData ? (
                <ArtistsHeroStats overview={topData.overview} locale={locale} />
              ) : (
                <ArtistsHeroStatsSkeleton />
              )
            }
          />
          <ErrorState variant="startup" error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
        </div>
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
      </>
    );
  }
  const overview = topData?.overview;

  return (
    <>
    <div className="lg:hidden">
      <ArtistsMobileExperience
        trendsHref={trendsHref}
        badgeLabel={badgeLabel}
        overview={overview}
        topArtists={topArtists}
        pagedArtists={pagedArtists}
        isTopLoading={isTopLoading}
        isPagedFetching={isPagedFetching || !pagedData}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        total={totalArtistsInRange}
        hasMore={pagination?.hasMore ?? false}
        offset={offset}
        onPageChange={(nextPage) => updatePaginationParams(nextPage, pageSize)}
        onPageSizeChange={(nextPageSize) => updatePaginationParams(1, nextPageSize)}
        onOpenArtistInsights={handleOpenArtistInsights}
        locale={locale}
      />
    </div>

    <div className="hidden space-y-12 lg:block">
      <ArtistsHeroFrame
        trendsHref={trendsHref}
        badgeLabel={badgeLabel}
        stats={
          overview ? (
            <ArtistsHeroStats overview={overview} locale={locale} />
          ) : (
            <ArtistsHeroStatsSkeleton />
          )
        }
      />

      <section className="relative animate-fade-in-up">
        <ArtistsSectionHeader
          eyebrow={t("sections.charts.eyebrow")}
          title={t("sections.charts.title")}
          description={t("sections.charts.description")}
        />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={DASHBOARD_SPOTLIGHT_SHELL}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
            <div className={`relative ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-5 sm:px-8`}>
              <div className={DASHBOARD_SPOTLIGHT_BADGE_VIOLET}>
                <LiveStatusDot tone="violet" />
                {t("sections.charts.barBadge")}
              </div>
              <h3 className={`mt-3 ${DASHBOARD_SPOTLIGHT_TITLE}`}>{t("top10Listens")}</h3>
            </div>
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
                {isTopLoading ? (
                  <ArtistsBarChartSkeleton />
                ) : (
                  <ChartResponsiveContainer token="spotlightBar">
                    <BarChart
                      data={barChartData}
                      layout="vertical"
                      margin={{ top: 8, right: 28, left: isLgChart ? 104 : 88, bottom: 8 }}
                    >
                      <defs>
                        <linearGradient id="barGradientArtists" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="50%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#84cc16" />
                        </linearGradient>
                        <filter id="artistBarGlow" x="-20%" y="-20%" width="140%" height="150%">
                          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#8b5cf6" floodOpacity="0.22" />
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                      <XAxis type="number" tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} tickMargin={8} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: chartTheme.tickStrong, fontSize: 12, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={8}
                        width={96}
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
                      <Bar dataKey="listens" fill="url(#barGradientArtists)" filter="url(#artistBarGlow)" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ChartResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className={DASHBOARD_SPOTLIGHT_SHELL}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
            <div className={`relative ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-5 sm:px-8`}>
              <div className={DASHBOARD_SPOTLIGHT_BADGE_LIME}>
                <LiveStatusDot tone="emerald" />
                {t("sections.charts.pieBadge")}
              </div>
              <h3 className={`mt-3 ${DASHBOARD_SPOTLIGHT_TITLE}`}>{t("distributionTop6")}</h3>
            </div>
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
                {isTopLoading ? (
                  <ArtistsPieChartSkeleton />
                ) : (
                  <ChartResponsiveContainer token="spotlightBar">
                    <PieChart>
                      <defs>
                        <filter id="artistPieGlow" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#8b5cf6" floodOpacity="0.2" />
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
                          <Cell key={`cell-${index}`} fill={entry.color} stroke={chartTheme.pieStroke} strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                        labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                        itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                        formatter={(value: number) => [`${value.toLocaleString(locale)} ${t("listensCount")}`, t("listens")]}
                      />
                    </PieChart>
                  </ChartResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <ArtistsSectionHeader
          eyebrow={t("sections.roster.eyebrow")}
          title={t("sections.roster.title")}
          description={t("sections.roster.description")}
        />
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/90 to-white text-slate-900 shadow-xl shadow-slate-900/[0.07] ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-slate-900/10 dark:border-white/10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 dark:text-white dark:shadow-2xl dark:shadow-black/25 dark:ring-0 dark:hover:shadow-black/35">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.06),transparent_38%),radial-gradient(circle_at_90%_8%,rgba(6,182,212,0.05),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.2),transparent_36%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,0.14),transparent_30%)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/45 to-transparent dark:via-violet-200/45" aria-hidden />
          <div className="relative border-b border-slate-200/80 px-5 py-6 sm:px-8 dark:border-white/10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-200">
              <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.4)] dark:bg-violet-300 dark:shadow-[0_0_14px_rgba(167,139,250,0.55)]" aria-hidden />
              {t("sections.roster.top3Badge")}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl dark:text-white">{t("top3Title")}</h3>
          </div>
          <div className="relative p-5 sm:p-6 lg:p-8">
            {isTopLoading ? (
              <ArtistsGridSkeleton count={3} />
            ) : (
              <TopThreeArtists
                artists={topArtists}
                maxListens={maxListens}
                t={t}
                locale={locale}
                onArtistSelect={handleOpenArtistInsights}
              />
            )}
          </div>
          <div className="relative border-t border-slate-200/80 px-5 py-6 sm:px-8 dark:border-white/10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800 dark:text-cyan-200">
              <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)] dark:bg-cyan-300 dark:shadow-[0_0_14px_rgb(34_211_238_/0.45)]" aria-hidden />
              {t("sections.roster.gridBadge")}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl dark:text-white">{t("allArtists")}</h3>
            <div className="mt-5">
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
            </div>
          </div>
        </div>
      </section>

      <section className="relative animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <ArtistsSectionHeader
          eyebrow={t("sections.table.eyebrow")}
          title={t("sections.table.title")}
          description={t("sections.table.description")}
        />
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
          onOpenArtistInsights={handleOpenArtistInsights}
          t={t}
          locale={locale}
        />
      </section>
    </div>
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
    </>
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
