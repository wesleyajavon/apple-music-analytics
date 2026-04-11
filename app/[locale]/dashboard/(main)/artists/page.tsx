"use client";

import { memo, useMemo, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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
import { useArtistStats } from "@/lib/hooks/use-artists";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import {
  getAvatarUrl,
  getArtistImageUrl,
  TopThreeArtists,
} from "@/lib/components/top-three-artists-cards";

/**
 * Couleurs pour avatars et graphiques (sans # pour UI Avatars)
 */
const CHART_COLORS = [
  "#8b5cf6", "#ec4899", "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#a855f7",
];

/**
 * Carte artiste style Replay – avatar, nom, stats, barre de progression
 */
const ArtistCard = memo(({
  artist,
  rank,
  maxListens,
  t,
  locale,
}: {
  artist: ArtistStatsDto;
  rank: number;
  maxListens: number;
  t: (k: string) => string;
  locale: string;
}) => {
  const progress = maxListens > 0 ? (artist.listenCount / maxListens) * 100 : 0;
  const isTop3 = rank <= 3;
  const rankStyles = ["from-amber-400 to-amber-600", "from-slate-300 to-slate-500", "from-amber-700 to-amber-800"];
  const rankLabel = rank === 1 ? t("rank1st") : (t as (k: string, v?: Record<string, number>) => string)("rankNth", { n: rank });

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-600/50
        bg-white dark:bg-gray-800/90 shadow-lg hover:shadow-xl hover:shadow-accent-violet/10
        transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div
              className={`overflow-hidden rounded-full ring-2 ring-white dark:ring-gray-800 shadow-lg
                ${isTop3 ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900" : ""}`}
              style={{
                width: isTop3 ? 72 : 56,
                height: isTop3 ? 72 : 56,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getArtistImageUrl(artist, isTop3 ? 144 : 112, rank - 1)}
                alt={artist.artistName}
                width={isTop3 ? 72 : 56}
                height={isTop3 ? 72 : 56}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = getAvatarUrl(artist.artistName, isTop3 ? 144 : 112, rank - 1);
                }}
              />
            </div>
            {isTop3 && (
              <span
                className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full
                  bg-gradient-to-br ${rankStyles[rank - 1]} text-xs font-bold text-white shadow`}
              >
                {rank}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {rankLabel} · {artist.listenCount.toLocaleString(locale)} {t("listensCount")}
            </p>
            <h3 className="mt-0.5 truncate text-lg font-bold text-gray-900 dark:text-white">
              {artist.artistName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {artist.uniqueTracks} {t("uniqueTracks")}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-pink transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ArtistCard.displayName = "ArtistCard";

const VISIBLE_ARTISTS_COUNT = 8;

/**
 * Grille "All your artists" : top 8 visibles, toggle en 9e position, reste togglable
 */
const AllArtistsGrid = memo(({
  topArtists,
  maxListens,
  t,
  locale,
}: {
  topArtists: ArtistStatsDto[];
  maxListens: number;
  t: (k: string, v?: Record<string, number>) => string;
  locale: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const visibleArtists = topArtists.slice(0, VISIBLE_ARTISTS_COUNT);
  const restArtists = topArtists.slice(VISIBLE_ARTISTS_COUNT);
  const hasMore = restArtists.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleArtists.map((artist, index) => (
        <ArtistCard key={artist.artistId} artist={artist} rank={index + 1} maxListens={maxListens} t={t} locale={locale} />
      ))}
      {hasMore && (
        <div
          className="group relative flex min-h-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-500
            bg-gray-50/80 dark:bg-gray-800/50 transition-all duration-300
            hover:border-accent-violet/60 hover:bg-accent-violet/5 dark:hover:bg-accent-violet/10"
          onClick={() => setExpanded((e) => !e)}
          onKeyDown={(ev) => ev.key === "Enter" && setExpanded((e) => !e)}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? t("showLessArtists") : t("showMoreArtists", { count: restArtists.length })}
        >
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 group-hover:text-accent-violet dark:group-hover:text-accent-violet">
            {expanded ? t("showLessArtists") : t("showMoreArtists", { count: restArtists.length })}
          </span>
        </div>
      )}
      {expanded && restArtists.map((artist, index) => (
        <ArtistCard
          key={artist.artistId}
          artist={artist}
          rank={VISIBLE_ARTISTS_COUNT + index + 1}
          maxListens={maxListens}
          t={t}
          locale={locale}
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
  topArtists,
  t,
  locale,
}: {
  topArtists: ArtistStatsDto[];
  t: (k: string) => string;
  locale: string;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-600/50 bg-white dark:bg-gray-800/90 shadow-lg">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700/50 px-6 py-4 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
        aria-expanded={expanded}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("detailedView")}</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("datesAndTracks")}</p>
        </div>
        <ChevronIcon direction={expanded ? "up" : "down"} />
      </button>
      {expanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50">
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
              {topArtists.map((artist, index) => {
                const rankStyles = ["text-amber-500", "text-slate-400", "text-amber-700"];
                const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                const rankStyle = index < 3 ? rankStyles[index] : "text-gray-400 dark:text-gray-500";
                const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-700/50";
                return (
                  <tr key={artist.artistId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${rankStyle} ${rankBgStyle}`}>
                        {index + 1}
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
  const searchParams = useSearchParams();
  const t = useTranslations("artists");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

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

  const { data, isLoading, error, refetch } = useArtistStats(
    startDate,
    endDate,
    userId,
    20
  );

  const topArtists = data?.topArtists ?? [];
  const maxListens = topArtists[0]?.listenCount ?? 1;

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

  if (isLoading) return <OverviewSkeleton />;
  if (error) {
    return (
      <ErrorState
        error={error}
        message={t("errorLoading")}
        onRetry={refetch}
      />
    );
  }
  if (!data || data.topArtists.length === 0) {
    return <EmptyState {...emptyStatePresets.importData} />;
  }

  const { overview } = data;

  return (
    <div className="space-y-8">
      {/* Hero style – bandeau gradient + stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 shadow-2xl sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("yourArtists")}</h2>
          <p className="mt-1 text-white/90">{t("overviewSubtitle")}</p>
          <p className="mt-2 text-sm font-medium tracking-wide text-white/85" aria-live="polite">
            {periodLine}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("artists")}</p>
              <p className="text-2xl font-bold text-white">{overview.totalArtists.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("listens")}</p>
              <p className="text-2xl font-bold text-white">{overview.totalListens.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("topArtist")}</p>
              <p className="text-2xl font-bold text-white">{overview.topArtistListenCount.toLocaleString(locale)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 – grandes cartes style Replay */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("top3Title")}</h3>
        <TopThreeArtists artists={topArtists} maxListens={maxListens} t={t} locale={locale} />
      </section>

      {/* Graphiques – Top 10 listens + Distribution Top 6 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-600/50 bg-white dark:bg-gray-800/90 shadow-lg">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("top10Listens")}</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
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
                <Bar dataKey="listens" fill="url(#barGradient)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-600/50 bg-white dark:bg-gray-800/90 shadow-lg">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("distributionTop6")}</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name.length > 12 ? name.substring(0, 12) + "…" : name} (${(percent * 100).toFixed(1)}%)`
                  }
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
          </div>
        </div>
      </div>

      {/* Grille d'artistes – top 8 visibles, reste togglable (toggle en 9e position) */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t("allArtists")}</h3>
        <AllArtistsGrid topArtists={topArtists} maxListens={maxListens} t={t} locale={locale} />
      </section>

      {/* Tableau détaillé – togglable */}
      <DetailedViewSection topArtists={topArtists} t={t} locale={locale} />
    </div>
  );
}

export default function ArtistsPage() {
  const t = useTranslations("artists");
  return (
    <div className="px-4 py-6 sm:px-0">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <Suspense fallback={<OverviewSkeleton />}>
        <ArtistsContent />
      </Suspense>
    </div>
  );
}
