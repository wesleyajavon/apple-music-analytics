"use client";

import { useCallback, useMemo, Suspense, useEffect, useState, type ReactNode } from "react";
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
} from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { useOverviewStats, useTimeline, useGenres } from "@/lib/hooks/use-listening";
import { useTrackStats } from "@/lib/hooks/use-tracks";
import { HeatmapCalendarOverviewWidget } from "@/lib/components/heatmap-calendar-overview-widget";
import { GenreTrendsSummaryWidget } from "@/lib/components/genre-trends-summary-widget";
import { ArtistTrendsSummaryWidget } from "@/lib/components/artist-trends-summary-widget";
import { TrackTrendsSummaryWidget } from "@/lib/components/track-trends-summary-widget";
import { TopThreeArtistsOverviewWidget } from "@/lib/components/top-three-artists-overview-widget";
import { TasteProfileSummaryWidget } from "@/lib/components/taste-profile-summary-widget";
import { AiInsightsSummaryWidget } from "@/lib/components/ai-insights-summary-widget";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import {
  OverviewSkeleton,
  OverviewStatsSectionSkeleton,
} from "@/lib/components/skeleton-loaders";
import { OverviewStatsSection } from "@/lib/components/overview-stats-section";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { Sparkles } from "lucide-react";

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

const OVERVIEW_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-accent-violet/20 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

function OverviewHeroFrame({
  title,
  description,
  badgeLabel,
  hasComparison,
  featureHref = "/dashboard/ask-your-soundprint",
  stats,
}: {
  title: string;
  description: string;
  badgeLabel: string;
  hasComparison: boolean;
  featureHref?: string;
  stats: ReactNode;
}) {
  const t = useTranslations("overview");
  return (
    <div className={OVERVIEW_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.28),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(79,144,224,0.24),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/20 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            {description}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={featureHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
              aria-label={t("musicAgentPromoAria")}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {t("musicAgentPromoTitle")}
            </Link>
            <span className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur">
              {badgeLabel}
            </span>
          </div>
          {hasComparison ? (
            <p className="mt-5 inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-100">
              {t("vsPreviousPeriod")}
            </p>
          ) : null}
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {t("statsSectionBadge")}
                </p>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-cyan-100">
                  {t("musicAgentPromoBadge")}
                </span>
              </div>
              {stats}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewHeroStats({
  totalListens,
  uniqueArtists,
  uniqueTracks,
  locale: statsLocale,
}: {
  totalListens: number;
  uniqueArtists: number;
  uniqueTracks: number;
  locale: string;
}) {
  const t = useTranslations("overview");
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{totalListens.toLocaleString(statsLocale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("stats.totalListens")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{uniqueArtists.toLocaleString(statsLocale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("stats.uniqueArtists")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{uniqueTracks.toLocaleString(statsLocale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("stats.uniqueTracks")}</p>
      </div>
    </div>
  );
}

function OverviewHeroStatsSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3"
        >
          <div className="mb-2 h-7 w-20 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function OverviewHeroStatsErrorPlaceholder() {
  const t = useTranslations("overview");
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      {(["totalListens", "uniqueArtists", "uniqueTracks"] as const).map((key) => (
        <div
          key={key}
          className="rounded-2xl border border-dashed border-white/30 bg-white/[0.05] p-3"
        >
          <p className="text-xl font-semibold tracking-tight text-white/40">—</p>
          <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t(`stats.${key}`)}
          </p>
          <p className="mt-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-cyan-200/45">
            {t("errorStateMetricStatus")}
          </p>
        </div>
      ))}
    </div>
  );
}

function OverviewHeroStatsEmptyPlaceholder() {
  const t = useTranslations("overview");
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      {(["totalListens", "uniqueArtists", "uniqueTracks"] as const).map((key) => (
        <div
          key={key}
          className="rounded-2xl border border-dashed border-white/25 bg-white/[0.04] p-3"
        >
          <p className="text-xl font-semibold tracking-tight text-white/55">0</p>
          <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t(`stats.${key}`)}
          </p>
          <p className="mt-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-cyan-200/50">
            {t("emptyStateMetricHint")}
          </p>
        </div>
      ))}
    </div>
  );
}

function OverviewSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

type LibraryLeaderAccent = {
  badge: string;
  rail: string;
  glow: string;
  progress: string;
  text: string;
  soft: string;
  border: string;
};

type LibraryLeaderItem = {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  percentage: number;
};

const LIBRARY_LEADER_ACCENTS = {
  tracks: {
    badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-700 dark:text-cyan-100",
    rail: "via-cyan-300/70",
    glow: "bg-cyan-300/18 dark:bg-cyan-300/12",
    progress: "from-cyan-300 via-emerald-400 to-lime-300",
    text: "text-cyan-700 dark:text-cyan-100",
    soft: "bg-cyan-300/10",
    border: "border-cyan-300/25",
  },
  artists: {
    badge: "border-violet-300/25 bg-violet-300/10 text-violet-700 dark:text-violet-100",
    rail: "via-violet-300/70",
    glow: "bg-violet-300/18 dark:bg-violet-300/12",
    progress: "from-violet-400 via-cyan-300 to-lime-300",
    text: "text-violet-700 dark:text-violet-100",
    soft: "bg-violet-300/10",
    border: "border-violet-300/25",
  },
  genres: {
    badge: "border-rose-300/25 bg-rose-300/10 text-rose-700 dark:text-rose-100",
    rail: "via-rose-300/70",
    glow: "bg-rose-300/18 dark:bg-rose-300/12",
    progress: "from-indigo-400 via-rose-400 to-amber-300",
    text: "text-rose-700 dark:text-rose-100",
    soft: "bg-rose-300/10",
    border: "border-rose-300/25",
  },
} satisfies Record<string, LibraryLeaderAccent>;

function TopLibraryHeroPill({
  label,
  item,
  accent,
  locale,
  listensLabel,
}: {
  label: string;
  item?: LibraryLeaderItem;
  accent: LibraryLeaderAccent;
  locale: string;
  listensLabel: string;
}) {
  if (!item) return null;
  return (
    <div className={`relative overflow-hidden rounded-3xl border ${accent.border} bg-white/10 p-4 backdrop-blur`}>
      <div className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full ${accent.glow} blur-2xl`} />
      <div className="relative">
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${accent.text}`}>{label}</p>
        <p className="mt-3 truncate text-xl font-semibold tracking-[-0.04em] text-white" title={item.title}>
          {item.title}
        </p>
        {item.subtitle ? (
          <p className="mt-1 truncate text-sm text-slate-400" title={item.subtitle}>
            {item.subtitle}
          </p>
        ) : null}
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold tabular-nums tracking-[-0.05em] text-white">
            {item.count.toLocaleString(locale)}
          </p>
          <p className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
            {item.percentage.toFixed(1)}%
          </p>
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{listensLabel}</p>
      </div>
    </div>
  );
}

function TopLibraryRow({
  item,
  index,
  maxCount,
  accent,
  locale,
  listensLabel,
}: {
  item: LibraryLeaderItem;
  index: number;
  maxCount: number;
  accent: LibraryLeaderAccent;
  locale: string;
  listensLabel: string;
}) {
  const widthPercent = maxCount > 0 ? Math.max(4, (item.count / maxCount) * 100) : 0;
  return (
    <div className="group rounded-2xl border border-white/70 bg-white/62 p-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-card dark:border-white/[0.07] dark:bg-[#12141f] dark:hover:bg-[#181b28]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${accent.badge}`}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-950 dark:text-white" title={item.title}>
              {item.title}
            </p>
            {item.subtitle ? (
              <p className="mt-0.5 truncate text-xs text-muted dark:text-slate-400" title={item.subtitle}>
                {item.subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-gray-950 dark:text-white">
            {item.count.toLocaleString(locale)}
          </p>
          <p className="text-[11px] font-medium text-muted dark:text-slate-400">
            {item.percentage.toFixed(1)}% · {listensLabel}
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-[#2a2d3d]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${accent.progress} transition-all duration-500 ease-out`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

function TopLibraryCard({
  title,
  description,
  href,
  accent,
  items,
  locale,
  listensLabel,
  ctaLabel,
}: {
  title: string;
  description: string;
  href: string;
  accent: LibraryLeaderAccent;
  items: LibraryLeaderItem[];
  locale: string;
  listensLabel: string;
  ctaLabel: string;
}) {
  const maxCount = items[0]?.count ?? 1;
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-white/90 to-slate-50/80 p-4 shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0c0e18] dark:ring-white/[0.06]">
      <div className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full ${accent.glow} blur-3xl`} />
      <div className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent ${accent.rail} to-transparent opacity-80`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm backdrop-blur ${accent.badge}`}>
              <span className={`h-2 w-2 rounded-full ${accent.soft} shadow-[0_0_16px_currentColor]`} />
              {title}
            </div>
            <p className="text-sm leading-6 text-muted dark:text-slate-400">{description}</p>
          </div>
          <Link
            href={href}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-card-border bg-white/70 px-3 py-2 text-sm font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:border-white/[0.10] dark:bg-[#161822] dark:hover:bg-[#1c2030] ${accent.text}`}
          >
            {ctaLabel}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <TopLibraryRow
              key={item.id}
              item={item}
              index={index}
              maxCount={maxCount}
              accent={accent}
              locale={locale}
              listensLabel={listensLabel}
            />
          ))}
        </div>
      </div>
    </article>
  );
}

function OverviewContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("overview");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const { startDate: rangeStart, endDate: rangeEnd, isAll } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(rangeStart, rangeEnd, locale);
  const badgeLabel = dateRangeLabel || t("allData");
  const hasComparison = !isAll && !!rangeStart && !!rangeEnd;

  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const [firstName, setFirstName] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    setFirstName(null);

    function extractFirstName(rawName?: string | null) {
      if (!rawName) return null;
      const cleaned = rawName.trim();
      if (!cleaned) return null;
      return cleaned.split(/\s+/)[0] ?? null;
    }

    async function hydrateDashboardSubjectDisplayName() {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      const qs = params.toString();
      const url = qs ? `/api/user/dashboard-subject?${qs}` : "/api/user/dashboard-subject";
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) return;
      const payload = (await response.json()) as { user?: { name?: string | null } | null };
      if (!mounted) return;
      setFirstName(extractFirstName(payload.user?.name ?? null));
    }

    hydrateDashboardSubjectDisplayName();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const overviewTitle = firstName ? t("titlePersonal", { name: firstName }) : t("title");

  const [artistInsightsTarget, setArtistInsightsTarget] = useState<{
    artist: ArtistStatsDto;
    avatarColorIndex: number;
  } | null>(null);

  const handleOpenArtistInsights = useCallback((artist: ArtistStatsDto, avatarColorIndex: number) => {
    setArtistInsightsTarget({ artist, avatarColorIndex });
  }, []);

  // Calculer la période précédente pour les comparaisons
  const previousPeriod = useMemo(
    () => getPreviousPeriod(startDate, endDate),
    [startDate, endDate]
  );

  // Statistiques actuelles
  const { data, isLoading, error, refetch } = useOverviewStats(
    startDate,
    endDate,
    userId
  );

  // Statistiques de la période précédente
  const { data: previousData } = useOverviewStats(
    previousPeriod?.prevStartDate,
    previousPeriod?.prevEndDate,
    userId,
    { enabled: !!previousPeriod }
  );

  // Timeline (agrégation mensuelle). Quand "All" (pas de dates), passer undefined
  // pour que l'API utilise la plage réelle min/max de la DB.
  const timelineStartDate = startDate;
  const timelineEndDate = endDate;

  const { data: timelineData } = useTimeline(
    timelineStartDate,
    timelineEndDate,
    "month",
    userId
  );

  // Top genres (top 6) - mêmes dates que la timeline (undefined = All)
  const { data: genresData } = useGenres(timelineStartDate, timelineEndDate, userId);
  const { data: tracksData } = useTrackStats(
    timelineStartDate,
    timelineEndDate,
    userId,
    20,
    0
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Calculer les variations (uniquement si une vraie période précédente existe dans l’URL).
  // En mode « Tout », les deux useOverviewStats partagent la même query key (dates absentes) :
  // sans ce garde, previousData === data et on affichait des badges « vs période précédente » à ~0 %.
  const changes = useMemo(() => {
    if (!previousPeriod || !data || !previousData) return null;
    return {
      totalListens: calculateChange(data.totalListens, previousData.totalListens),
      uniqueArtists: calculateChange(data.uniqueArtists, previousData.uniqueArtists),
      uniqueTracks: calculateChange(data.uniqueTracks, previousData.uniqueTracks),
      totalPlayTime: calculateChange(data.totalPlayTime, previousData.totalPlayTime),
    };
  }, [previousPeriod, data, previousData]);

  // Formater les données de timeline (agrégation mensuelle : date = YYYY-MM)
  const chartData = useMemo(
    () =>
      timelineData?.map((point) => {
        const raw = point.date;
        const d =
          raw.length === 7 && raw[4] === "-"
            ? new Date(`${raw}-01T12:00:00`)
            : new Date(raw);
        return {
          ...point,
          formattedDate: d.toLocaleDateString(locale, {
            month: "short",
            year: "numeric",
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

  // Top artistes (overview API, max 6) avec % du total d'écoutes — aligné sur le bloc genres
  const topArtistsForChart = useMemo(() => {
    if (!data?.topArtists?.length) return [];
    const total = data.totalListens;
    return data.topArtists.slice(0, 6).map((a) => ({
      artistId: a.artistId,
      name: a.artistName,
      count: a.listenCount,
      percentage: total > 0 ? (a.listenCount / total) * 100 : 0,
    }));
  }, [data]);
  const topTracksForChart = useMemo(() => {
    if (!tracksData?.topTracks?.length) return [];
    const total = tracksData.overview.totalListens;
    return tracksData.topTracks.slice(0, 6).map((track) => ({
      trackId: track.trackId,
      name: track.trackTitle,
      artistName: track.artistName,
      count: track.listenCount,
      percentage: total > 0 ? (track.listenCount / total) * 100 : 0,
    }));
  }, [tracksData]);

  const artistsPageQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (userId) p.set("userId", userId);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [startDate, endDate, userId]);

  const timelineHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/timeline", searchParams),
    [searchParams]
  );
  const genresHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/genres", searchParams),
    [searchParams]
  );
  const tracksHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/tracks", searchParams),
    [searchParams]
  );
  const musicAgentHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/ask-your-soundprint", searchParams),
    [searchParams]
  );

  if (!isLoading && error) {
    return (
      <div className="space-y-8">
        <OverviewHeroFrame
          title={overviewTitle}
          description={t("errorStateHint")}
          badgeLabel={badgeLabel}
          hasComparison={hasComparison}
          featureHref={musicAgentHref}
          stats={<OverviewHeroStatsErrorPlaceholder />}
        />
        <ErrorState
          variant="startup"
          eyebrow={t("errorStateEyebrow")}
          error={error}
          message={t("errorLoading")}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!isLoading && (!data || data.totalListens === 0)) {
    const empty = emptyStatePresets.importData;
    return (
      <div className="space-y-8">
        <OverviewHeroFrame
          title={overviewTitle}
          description={t("emptyStateHeroDescription")}
          badgeLabel={badgeLabel}
          hasComparison={hasComparison}
          featureHref={musicAgentHref}
          stats={<OverviewHeroStatsEmptyPlaceholder />}
        />
        <EmptyState
          variant="startup"
          eyebrow={t("emptyStateEyebrow")}
          aside={t("emptyStateAside")}
          message={empty.message}
          description={empty.description}
          actions={empty.actions}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <OverviewHeroFrame
        title={overviewTitle}
        description={t("subtitle")}
        badgeLabel={badgeLabel}
        hasComparison={hasComparison}
        featureHref={musicAgentHref}
        stats={
          data ? (
            <OverviewHeroStats
              totalListens={data.totalListens}
              uniqueArtists={data.uniqueArtists}
              uniqueTracks={data.uniqueTracks}
              locale={locale}
            />
          ) : (
            <OverviewHeroStatsSkeleton />
          )
        }
      />
      <div className="space-y-12">
        <section className="relative">
          <OverviewSectionHeader
            eyebrow={t("sections.snapshot.eyebrow")}
            title={t("sections.snapshot.title")}
            description={t("sections.snapshot.description")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <div className="flex min-h-[280px] w-full min-w-0 sm:col-span-2 lg:col-span-4">
              <TasteProfileSummaryWidget />
            </div>

            {data ? (
              <OverviewStatsSection
                totalListens={data.totalListens}
                uniqueArtists={data.uniqueArtists}
                uniqueTracks={data.uniqueTracks}
                totalPlayTime={data.totalPlayTime}
                changes={changes}
                showComparison={!!previousPeriod}
              />
            ) : (
              <OverviewStatsSectionSkeleton />
            )}
          </div>
        </section>

        <section className="relative">
          <OverviewSectionHeader
            eyebrow={t("sections.momentum.eyebrow")}
            title={t("sections.momentum.title")}
            description={t("sections.momentum.description")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">

        {/* Timeline pleine largeur */}
        {chartData.length > 0 && (
          <div className="min-h-[240px] sm:col-span-2 sm:min-h-[280px] lg:col-span-4 lg:min-h-[320px]">
            <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/30">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.26),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(79,144,224,0.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-cyan/15 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
                aria-hidden
              />
              <div className="relative">
                <div className="border-b border-white/10 px-6 py-5 sm:px-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                        <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
                        {t("momentumBadge")}
                      </div>
                      <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                        {t("recentEvolution")}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                        {t("listensPerMonth")}
                      </p>
                    </div>
                    <Link
                href={timelineHref}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                {t("seeMore")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                    </Link>
                  </div>
                </div>
              <div className="px-3 py-5 sm:px-6">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3 shadow-2xl shadow-black/20 backdrop-blur sm:p-5">
                <ChartResponsiveContainer
                  token="overviewArea"
                  minWidth={chartData.length > 8 ? Math.max(300, chartData.length * 28) : undefined}
                >
              <AreaChart data={chartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.34} />
                    <stop offset="48%" stopColor="#a78bfa" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#67e8f9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
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
                  stroke="#67e8f9"
                  strokeWidth={3}
                  fill="url(#areaGradient)"
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              </AreaChart>
                </ChartResponsiveContainer>
                </div>
              </div>
              </div>
            </div>
          </div>
        )}

        <TopThreeArtistsOverviewWidget
          startDate={startDate}
          endDate={endDate}
          onOpenArtistInsights={handleOpenArtistInsights}
        />

        <ArtistTrendsSummaryWidget startDate={startDate} endDate={endDate} />

        <GenreTrendsSummaryWidget startDate={startDate} endDate={endDate} />

        <TrackTrendsSummaryWidget startDate={startDate} endDate={endDate} />

          </div>
        </section>

        <section className="relative">
          <OverviewSectionHeader
            eyebrow={t("sections.library.eyebrow")}
            title={t("sections.library.title")}
            description={t("sections.library.description")}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            {(topTracksForChart[0] || topArtistsForChart[0] || topGenres[0]) && (
              <div className="lg:col-span-3">
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/20 sm:p-6 lg:p-8">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_30%),radial-gradient(circle_at_86%_14%,rgba(139,92,246,0.2),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(132,204,22,0.13),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]"
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
                  <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:items-end">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                        <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
                        {t("libraryLeaders.badge")}
                      </div>
                      <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                        {t("libraryLeaders.title")}
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                        {t("libraryLeaders.description")}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <TopLibraryHeroPill
                        label={t("libraryLeaders.topTrack")}
                        item={
                          topTracksForChart[0]
                            ? {
                                id: topTracksForChart[0].trackId,
                                title: topTracksForChart[0].name,
                                subtitle: topTracksForChart[0].artistName,
                                count: topTracksForChart[0].count,
                                percentage: topTracksForChart[0].percentage,
                              }
                            : undefined
                        }
                        accent={LIBRARY_LEADER_ACCENTS.tracks}
                        locale={locale}
                        listensLabel={t("listens")}
                      />
                      <TopLibraryHeroPill
                        label={t("libraryLeaders.topArtist")}
                        item={
                          topArtistsForChart[0]
                            ? {
                                id: topArtistsForChart[0].artistId,
                                title: topArtistsForChart[0].name,
                                count: topArtistsForChart[0].count,
                                percentage: topArtistsForChart[0].percentage,
                              }
                            : undefined
                        }
                        accent={LIBRARY_LEADER_ACCENTS.artists}
                        locale={locale}
                        listensLabel={t("listens")}
                      />
                      <TopLibraryHeroPill
                        label={t("libraryLeaders.topGenre")}
                        item={
                          topGenres[0]
                            ? {
                                id: topGenres[0].genre,
                                title: topGenres[0].genre,
                                count: topGenres[0].count,
                                percentage: topGenres[0].percentage,
                              }
                            : undefined
                        }
                        accent={LIBRARY_LEADER_ACCENTS.genres}
                        locale={locale}
                        listensLabel={t("listens")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {topTracksForChart.length > 0 && (
              <TopLibraryCard
                title={t("topTracks")}
                description={t("yourTopTracks")}
                href={tracksHref}
                accent={LIBRARY_LEADER_ACCENTS.tracks}
                items={topTracksForChart.map((track) => ({
                  id: track.trackId,
                  title: track.name,
                  subtitle: track.artistName,
                  count: track.count,
                  percentage: track.percentage,
                }))}
                locale={locale}
                listensLabel={t("listens")}
                ctaLabel={t("seeAll")}
              />
            )}

            {topArtistsForChart.length > 0 && (
              <TopLibraryCard
                title={t("topArtists")}
                description={t("yourTopArtists")}
                href={`/dashboard/artists${artistsPageQuery}`}
                accent={LIBRARY_LEADER_ACCENTS.artists}
                items={topArtistsForChart.map((artist) => ({
                  id: artist.artistId,
                  title: artist.name,
                  count: artist.count,
                  percentage: artist.percentage,
                }))}
                locale={locale}
                listensLabel={t("listens")}
                ctaLabel={t("seeAll")}
              />
            )}

            {topGenres.length > 0 && (
              <TopLibraryCard
                title={t("topGenres")}
                description={t("yourTopGenres")}
                href={genresHref}
                accent={LIBRARY_LEADER_ACCENTS.genres}
                items={topGenres.map((genre) => ({
                  id: genre.genre,
                  title: genre.genre,
                  count: genre.count,
                  percentage: genre.percentage,
                }))}
                locale={locale}
                listensLabel={t("listens")}
                ctaLabel={t("seeAll")}
              />
            )}
          </div>
        </section>

        <section className="relative">
          <OverviewSectionHeader
            eyebrow={t("sections.intelligence.eyebrow")}
            title={t("sections.intelligence.title")}
            description={t("sections.intelligence.description")}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="flex min-h-[280px] w-full min-w-0">
              <AiInsightsSummaryWidget />
            </div>
            <div className="min-w-0">
              <HeatmapCalendarOverviewWidget startDate={startDate} endDate={endDate} />
            </div>
          </div>
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
    </div>
  );
}

function OverviewPageFallback() {
  const t = useTranslations("overview");
  const locale = useLocale();
  const { startDate, endDate, isAll } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(startDate, endDate, locale);
  const badgeLabel = dateRangeLabel || t("allData");
  const hasComparison = !isAll && !!startDate && !!endDate;

  return (
    <div className="space-y-8">
      <OverviewHeroFrame
        title={t("title")}
        description={t("subtitle")}
        badgeLabel={badgeLabel}
        hasComparison={hasComparison}
        stats={<OverviewHeroStatsSkeleton />}
      />
      <OverviewSkeleton />
    </div>
  );
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";
  const filterKey = `${startDateParam}-${endDateParam}`;

  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<OverviewPageFallback />}>
        <OverviewContent key={filterKey} />
      </Suspense>
    </div>
  );
}

