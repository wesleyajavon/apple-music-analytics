"use client";

import { memo, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useOverviewStats, useTimeline, useGenres } from "@/lib/hooks/use-listening";
import { WhenWillIListenWidget } from "@/lib/components/when-will-i-listen-widget";
import { TasteEvolutionSummaryWidget } from "@/lib/components/taste-evolution-summary-widget";
import { TasteProfileSummaryWidget } from "@/lib/components/taste-profile-summary-widget";
import { AiInsightsSummaryWidget } from "@/lib/components/ai-insights-summary-widget";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";

/* SVG Icons pour les stats - design cohérent */
const StatIcons = {
  listens: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
    </svg>
  ),
  artists: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  tracks: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  ),
  time: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
} as const;

/**
 * Formate les secondes en format lisible (heures, minutes)
 * Retourne notAvailable si seconds est 0 ou négatif
 * Fonction pure, peut être utilisée sans mémorisation
 */
function formatTime(seconds: number, notAvailable: string): string {
  if (seconds <= 0) {
    return notAvailable;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Calcule la période précédente basée sur la période actuelle
 */
function getPreviousPeriod(
  startDate?: string,
  endDate?: string
): { prevStartDate: string; prevEndDate: string } | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  return {
    prevStartDate: prevStart.toISOString().split("T")[0],
    prevEndDate: prevEnd.toISOString().split("T")[0],
  };
}

/** Plafond pour les variations en % (évite 1926% etc.) */
const MAX_CHANGE_PERCENT = 999;

/**
 * Calcule le pourcentage de variation entre deux valeurs.
 * - Si previous = 0 : pas de comparaison possible → null (on n'affiche rien)
 * - Si variation > 999% : plafonné à ">999%" pour éviter les valeurs aberrantes
 */
function calculateChange(current: number, previous: number): {
  value: number;
  displayValue: string;
  isPositive: boolean;
} | null {
  if (previous === 0) {
    return null; // Pas de période précédente à comparer
  }
  const change = ((current - previous) / previous) * 100;
  const value = Math.abs(change);
  const isPositive = change >= 0;
  const displayValue =
    value > MAX_CHANGE_PERCENT ? `>${MAX_CHANGE_PERCENT}` : value.toFixed(1);
  return {
    value: Math.min(value, MAX_CHANGE_PERCENT),
    displayValue,
    isPositive,
  };
}

const ACCENT_CONFIG: Record<
  StatType,
  { iconBg: string; iconColor: string; borderColor: string }
> = {
  listens: { iconBg: "bg-accent-rose/15", iconColor: "text-accent-rose", borderColor: "border-l-accent-rose" },
  artists: { iconBg: "bg-accent-violet/15", iconColor: "text-accent-violet", borderColor: "border-l-accent-violet" },
  tracks: { iconBg: "bg-accent-indigo/15", iconColor: "text-accent-indigo", borderColor: "border-l-accent-indigo" },
  time: { iconBg: "bg-accent-cyan/15", iconColor: "text-accent-cyan", borderColor: "border-l-accent-cyan" },
};

type StatType = keyof typeof StatIcons;

/**
 * Composant de carte statistique mémorisé - design moderne avec accents
 */
const StatCard = memo(({ 
  iconType, 
  label, 
  value,
  change,
  vsLabel = "vs période précédente",
  locale = "fr",
}: { 
  iconType: StatType; 
  label: string; 
  value: string | number;
  change?: { value: number; displayValue: string; isPositive: boolean } | null;
  vsLabel?: string;
  locale?: string;
}) => {
  const accent = ACCENT_CONFIG[iconType];
  return (
    <div
      className={`
        group relative overflow-hidden rounded-xl border border-l-4
        border-card-border bg-card-surface
        shadow-card hover:shadow-card-hover transition-all duration-300
        ${accent.borderColor}
      `}
    >
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent.iconBg} ${accent.iconColor}`}>
            {StatIcons[iconType]}
          </div>
          <dl className="min-w-0 flex-1">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {label}
            </dt>
            <dd className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mt-0.5">
              {typeof value === "number" ? value.toLocaleString(locale) : value}
            </dd>
            {change && (
              <dd className="text-xs mt-1.5 flex items-center gap-1 flex-wrap">
                <span
                  className={`inline-flex items-center font-semibold ${
                    change.isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {change.isPositive ? (
                    <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  {change.displayValue}%
                </span>
                <span className="text-gray-400 dark:text-gray-500">{vsLabel}</span>
              </dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = "StatCard";

function OverviewContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("overview");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  // Calculer la période précédente pour les comparaisons
  const previousPeriod = useMemo(
    () => getPreviousPeriod(startDate, endDate),
    [startDate, endDate]
  );

  // Statistiques actuelles
  const { data, isLoading, error, refetch } = useOverviewStats(
    startDate,
    endDate
  );

  // Statistiques de la période précédente
  const { data: previousData } = useOverviewStats(
    previousPeriod?.prevStartDate,
    previousPeriod?.prevEndDate,
    undefined,
    { enabled: !!previousPeriod }
  );

  // Timeline pour le mini-graphique. Quand "All" (pas de dates), passer undefined
  // pour que l'API utilise la plage réelle min/max de la DB.
  const timelineStartDate = startDate;
  const timelineEndDate = endDate;

  const { data: timelineData } = useTimeline(
    timelineStartDate,
    timelineEndDate,
    "day"
  );

  // Top genres (top 6) - mêmes dates que la timeline (undefined = All)
  const { data: genresData } = useGenres(timelineStartDate, timelineEndDate);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Calculer les variations
  const changes = useMemo(() => {
    if (!data || !previousData) return null;
    return {
      totalListens: calculateChange(data.totalListens, previousData.totalListens),
      uniqueArtists: calculateChange(data.uniqueArtists, previousData.uniqueArtists),
      uniqueTracks: calculateChange(data.uniqueTracks, previousData.uniqueTracks),
      totalPlayTime: calculateChange(data.totalPlayTime, previousData.totalPlayTime),
    };
  }, [data, previousData]);

  // Formater les données de timeline pour le graphique
  const chartData = useMemo(
    () =>
      timelineData?.map((point) => {
        const d = new Date(point.date);
        return {
          ...point,
          formattedDate: d.toLocaleDateString(locale, {
            day: "2-digit",
            month: "2-digit",
          }),
        };
      }) || [],
    [timelineData, locale]
  );

  // Top genres pour l'affichage
  const topGenres = useMemo(
    () => genresData?.data.slice(0, 6) || [],
    [genresData]
  );

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        message={t("errorLoading")}
        onRetry={handleRetry}
      />
    );
  }

  if (!data || data.totalListens === 0) {
    return <EmptyState {...emptyStatePresets.importData} />;
  }

  return (
    <div className="space-y-6">
      {/* Bento Grid - layout asymetrique type Apple/Linear */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {/* 4 StatCards — petits blocs en première ligne */}
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-1">
          <StatCard
            iconType="listens"
            label={t("stats.totalListens")}
            value={data.totalListens}
            change={changes?.totalListens}
            vsLabel={t("vsPreviousPeriod")}
            locale={locale}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-1">
          <StatCard
            iconType="artists"
            label={t("stats.uniqueArtists")}
            value={data.uniqueArtists}
            change={changes?.uniqueArtists}
            vsLabel={t("vsPreviousPeriod")}
            locale={locale}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-1">
          <StatCard
            iconType="tracks"
            label={t("stats.uniqueTracks")}
            value={data.uniqueTracks}
            change={changes?.uniqueTracks}
            vsLabel={t("vsPreviousPeriod")}
            locale={locale}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-1">
          <StatCard
            iconType="time"
            label={t("stats.totalTime")}
            value={formatTime(data.totalPlayTime, t("notAvailable"))}
            change={changes?.totalPlayTime}
            vsLabel={t("vsPreviousPeriod")}
            locale={locale}
          />
        </div>

        {/* Bloc large (2×2) : Timeline / évolution récente — spotlight */}
        {chartData.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[280px]">
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40 animate-fade-in-up">
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("recentEvolution")}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {t("listensPerDay")}
                      </p>
                    </div>
                    <Link
                href="/dashboard/timeline"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
                  text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
                  transition-colors duration-200 shrink-0"
              >
                {t("seeMore")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                    </Link>
                  </div>
                </div>
              <div className="p-6 pt-2">
                <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                  labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                  itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                  formatter={(value: number) => [
                    `${value.toLocaleString(locale)} ${t("listens")}`,
                    t("Listens"),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="listens"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#areaGradient)"
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              </AreaChart>
                </ResponsiveContainer>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Bloc moyen (1×2) : AI Insights en spotlight */}
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 min-h-[280px] flex ">
          <AiInsightsSummaryWidget />
        </div>

        {/* Bloc moyen (1×2) : Taste Profile */}
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 min-h-[280px] flex ">
          <TasteProfileSummaryWidget />
        </div>

        {/* Bloc large (2×1) : Top genres */}
        {topGenres.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-card-border border-l-4 border-l-accent-indigo bg-card-surface shadow-card transition-shadow duration-300 hover:shadow-card-hover">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("topGenres")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("yourTopGenres")}
                    </p>
                  </div>
                  <Link
                href="/dashboard/genres"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
                  text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
                  transition-colors duration-200 shrink-0"
              >
                {t("seeAll")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
                </div>
              </div>
              <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Graphique en barres horizontal */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topGenres.map((g) => ({
                        name: g.genre,
                        value: g.count,
                        percentage: g.percentage,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="genreBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      width={75}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                      labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                      itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                      formatter={(value: number, _name: string, props: { payload?: { percentage?: number } }) => {
                        const pct = props?.payload?.percentage ?? 0;
                        return [
                          `${value.toLocaleString(locale)} ${t("listens")} (${pct.toFixed(1)}%)`,
                          t("Listens"),
                        ];
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#genreBarGradient)"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Liste des genres avec barres de progression */}
              <div className="space-y-4">
                {topGenres.map((genre, index) => {
                  const maxCount = topGenres[0]?.count ?? 1;
                  const widthPercent = (genre.count / maxCount) * 100;
                  const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                  const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                  const rankStyle = index < 3 ? rankColors[index] : "text-gray-400 dark:text-gray-500";
                  const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-800";
                  return (
                    <div key={genre.genre} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankStyle} ${rankBgStyle}`}>
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {genre.genre}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {genre.count.toLocaleString(locale)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right tabular-nums">
                            {genre.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-indigo transition-all duration-500 ease-out"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
          </div>
        )}

        {/* Bloc large (2×1) : Top artists */}
        {data.topArtists && data.topArtists.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-card-border border-l-4 border-l-accent-rose bg-card-surface shadow-card transition-shadow duration-300 hover:shadow-card-hover">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("topArtists")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("yourFavoriteArtists")}
                </p>
              </div>
              <Link
                href="/dashboard/artists"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
                  text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
                  transition-colors duration-200 shrink-0"
              >
                {t("seeAll")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Graphique en barres horizontal */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.topArtists.map((artist) => ({
                      name: artist.artistName,
                      value: artist.listenCount,
                    }))}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="artistBarGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
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
                      formatter={(value: number) => [
                        `${value.toLocaleString(locale)} ${t("listens")}`,
                        t("Listens"),
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#artistBarGradient)"
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Liste des artistes avec barres de progression */}
              <div className="space-y-4">
                {data.topArtists.map((artist, index) => {
                  const maxCount = data.topArtists[0]?.listenCount ?? 1;
                  const widthPercent = (artist.listenCount / maxCount) * 100;
                  const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                  const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                  const rankStyle = index < 3 ? rankColors[index] : "text-gray-400 dark:text-gray-500";
                  const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-800";
                  return (
                    <div key={artist.artistId} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankStyle} ${rankBgStyle}`}>
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {artist.artistName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                            {artist.listenCount.toLocaleString(locale)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-rose to-accent-pink transition-all duration-500 ease-out"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* When Will I Listen? widget */}
      <WhenWillIListenWidget includeExplanation />

      {/* Taste Evolution summary */}
      <TasteEvolutionSummaryWidget />
    </div>
  );
}

/** Format date range for display */
function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const t = useTranslations("overview");
  const { startDate, endDate, isAll } = useListenDateRange();
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";
  // Key force le remontage complet quand le filtre change (évite données "All" affichées avec filtre 7j)
  const filterKey = `${startDateParam}-${endDateParam}`;

  const dateRangeLabel = formatDateRange(startDate, endDate);
  const hasComparison = !isAll && !!startDate && !!endDate;

  return (
    <div className="px-4 py-6 sm:px-0">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20">
            <svg className="w-5 h-5 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
              {dateRangeLabel ? dateRangeLabel : t("allData")}
            </span>
          </div>
          {hasComparison && (
            <span className="px-2.5 py-1 rounded-full bg-accent-emerald/10 text-accent-emerald text-xs font-medium">
              {t("vsPreviousPeriod")}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent key={filterKey} />
      </Suspense>
    </div>
  );
}

