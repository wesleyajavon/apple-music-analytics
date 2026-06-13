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
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";
import { useTrackStats } from "@/lib/hooks/use-tracks";
import { HeatmapCalendarOverviewWidget } from "@/lib/components/heatmap-calendar-overview-widget";
import { GenreTrendsSummaryWidget } from "@/lib/components/genre-trends-summary-widget";
import { ArtistTrendsSummaryWidget } from "@/lib/components/artist-trends-summary-widget";
import { TrackTrendsSummaryWidget } from "@/lib/components/track-trends-summary-widget";
import { TopThreeArtistsOverviewWidget } from "@/lib/components/top-three-artists-overview-widget";
import { TasteProfileSummaryWidget } from "@/lib/components/taste-profile-summary-widget";
import { AiInsightsSummaryWidget } from "@/lib/components/ai-insights-summary-widget";
import {
  OverviewMomentumCarousel,
  type OverviewMomentumSlide,
} from "@/lib/components/overview-momentum-carousel";
import { OverviewListeningMomentumCard } from "@/lib/components/overview-listening-momentum-card";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import {
  OverviewSkeleton,
  OverviewStatsSectionSkeleton,
} from "@/lib/components/skeleton-loaders";
import { OverviewStatsSection, type OverviewStatsChanges } from "@/lib/components/overview-stats-section";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import {
  OverviewFeaturePromos,
  OverviewFeaturePromosSkeleton,
} from "@/lib/components/overview-feature-promos";
import { UserAvatarPhoto } from "@/lib/components/user-avatar";
import { SoundprintBrandDividerSection } from "@/lib/components/soundprint-brand-divider";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import {
  DASHBOARD_BTN_LINK,
  DASHBOARD_CINEMATIC_HERO_SHELL,
  DASHBOARD_WIDGET_CARD_SHELL,
  DashboardCinematicHeroBg,
  DashboardWidgetCardBg,
} from "@/lib/components/dashboard-ui";

const MOBILE_DATE_OPTS = { month: "2-digit", day: "2-digit", year: "2-digit" } as const;

function formatMobileDateRangeLabel(startDate?: string, endDate?: string, locale?: string): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(locale, MOBILE_DATE_OPTS)}–${end.toLocaleDateString(locale, MOBILE_DATE_OPTS)}`;
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

const OVERVIEW_MOBILE_HERO_SHELL = `${DASHBOARD_CINEMATIC_HERO_SHELL} p-5 sm:p-6`;
const OVERVIEW_DESKTOP_HERO_SHELL = `${DASHBOARD_CINEMATIC_HERO_SHELL} px-5 py-6 sm:px-8 sm:py-9 lg:px-10 lg:py-10`;

function OverviewHeroFrame({
  title,
  description,
  badgeLabel,
  hasComparison,
  soundprintChatHref,
  duetHref,
  featurePromos,
  avatarUrl,
}: {
  title: string;
  description: string;
  badgeLabel: string;
  hasComparison: boolean;
  soundprintChatHref: string;
  duetHref: string;
  featurePromos?: ReactNode;
  avatarUrl?: string | null;
}) {
  const t = useTranslations("overview");
  return (
    <div className={OVERVIEW_DESKTOP_HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div className="flex items-start gap-5 sm:gap-6 lg:gap-8">
          <UserAvatarPhoto
            src={avatarUrl}
            size="xl"
            className="ring-2 ring-white/20 shadow-2xl shadow-black/30"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <SoundprintBrandMark
                size="sm"
                tone="onDark"
                showAiBadge={false}
                showWordmarkOnMobile={false}
                interactive={false}
              />
              <span className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/80">
                {badgeLabel}
              </span>
            </div>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              {description}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {hasComparison ? (
                <span className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-5 py-3 text-sm font-medium text-emerald-100">
                  {t("vsPreviousPeriod")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {featurePromos ?? (
          <OverviewFeaturePromos
            soundprintChatHref={soundprintChatHref}
            duetHref={duetHref}
          />
        )}
      </div>
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
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-[1.5rem] border border-card-border bg-surface-glass/60 p-5 backdrop-blur-sm sm:flex-row sm:items-end sm:p-6">
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
    <article className={`${DASHBOARD_WIDGET_CARD_SHELL} p-4 sm:p-5`}>
      <DashboardWidgetCardBg glowClass={accent.glow} />
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
            className={`${DASHBOARD_BTN_LINK} ${accent.text}`}
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

type MobileChartPoint = {
  formattedDate: string;
  listens: number;
};

function formatListeningTime(totalSeconds: number, notAvailable: string) {
  if (totalSeconds <= 0) return notAvailable;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

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
}: {
  item: MobileLeaderItem;
  index: number;
  locale: string;
  listensLabel: string;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-xs font-black text-white">
          {index + 1}
        </span>
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
          {item.percentage.toFixed(1)}% · {listensLabel}
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

function MobileDisclosure({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-[1.75rem] border border-card-border bg-white/80 shadow-card backdrop-blur dark:border-white/[0.08] dark:bg-[#090b14]"
      open={defaultOpen}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
        <span>
          <span className="block text-sm font-semibold text-foreground dark:text-white">
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted dark:text-slate-400">
            {description}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-card-border bg-white/70 text-muted transition-transform group-open:rotate-90 dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-slate-300">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-card-border px-4 py-4 dark:border-white/[0.08]">
        {children}
      </div>
    </details>
  );
}

function MobileTimelineCard({
  chartData,
  timelineHref,
  locale,
}: {
  chartData: MobileChartPoint[];
  timelineHref: string;
  locale: string;
}) {
  const t = useTranslations("overview");
  const totalListens = chartData.reduce((sum, point) => sum + point.listens, 0);
  const peakPoint = chartData.reduce<MobileChartPoint | null>(
    (peak, point) => (!peak || point.listens > peak.listens ? point : peak),
    null
  );

  if (chartData.length === 0) return null;

  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-4 text-white shadow-2xl shadow-black/20">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(167,139,250,0.20),transparent_30%)]"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {t("mobile.momentum.eyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">
              {t("mobile.momentum.title")}
            </h2>
          </div>
          <Link
            href={timelineHref}
            className={`${DASHBOARD_BTN_LINK} min-h-11 border-white/15 bg-white/10 px-3 text-xs text-white hover:bg-white/15 dark:hover:bg-white/15`}
          >
            {t("seeMore")}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t("mobile.momentum.total")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {totalListens.toLocaleString(locale)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {t("mobile.momentum.peak")}
            </p>
            <p className="mt-1 truncate text-xl font-semibold">
              {peakPoint?.formattedDate ?? t("notAvailable")}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 p-2">
          <ChartResponsiveContainer
            token="overviewArea"
            minWidth={chartData.length > 8 ? Math.max(320, chartData.length * 34) : undefined}
          >
            <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="mobileOverviewAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.38} />
                  <stop offset="60%" stopColor="#a78bfa" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#67e8f9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="formattedDate"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={18}
              />
              <YAxis hide />
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
                fill="url(#mobileOverviewAreaGradient)"
                animationDuration={600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ChartResponsiveContainer>
        </div>
      </div>
    </article>
  );
}

function MobileOverviewFlow({
  title,
  badgeLabel,
  hasComparison,
  data,
  changes,
  chartData,
  topTracks,
  topArtists,
  topGenres,
  locale,
  timelineHref,
  tracksHref,
  artistsHref,
  genresHref,
  musicAgentHref,
  duetHref,
  startDate,
  endDate,
  avatarUrl,
}: {
  title: string;
  badgeLabel: string;
  hasComparison: boolean;
  data: OverviewStatsWithTopArtists;
  changes: OverviewStatsChanges;
  chartData: MobileChartPoint[];
  topTracks: Array<{
    trackId: string;
    name: string;
    artistName: string;
    count: number;
    percentage: number;
  }>;
  topArtists: Array<{
    artistId: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  topGenres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  locale: string;
  timelineHref: string;
  tracksHref: string;
  artistsHref: string;
  genresHref: string;
  musicAgentHref: string;
  duetHref: string;
  startDate?: string;
  endDate?: string;
  avatarUrl?: string | null;
}) {
  const t = useTranslations("overview");
  const topTrack = topTracks[0];
  const topArtist = topArtists[0];
  const topGenre = topGenres[0];
  const primaryInsight = topTrack
    ? {
        eyebrow: t("mobile.primaryInsight.topTrackEyebrow"),
        title: topTrack.name,
        subtitle: t("mobile.primaryInsight.topTrackBody", { artist: topTrack.artistName }),
        metric: topTrack.count.toLocaleString(locale),
        metricLabel: t("listens"),
      }
    : topArtist
      ? {
          eyebrow: t("mobile.primaryInsight.topArtistEyebrow"),
          title: topArtist.name,
          subtitle: t("mobile.primaryInsight.topArtistBody"),
          metric: topArtist.count.toLocaleString(locale),
          metricLabel: t("listens"),
        }
      : {
          eyebrow: t("mobile.primaryInsight.libraryEyebrow"),
          title,
          subtitle: t("mobile.primaryInsight.libraryBody"),
          metric: data.totalListens.toLocaleString(locale),
          metricLabel: t("stats.totalListens"),
        };

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
      items: topGenres.slice(0, 3).map((genre) => ({
        id: genre.genre,
        title: genre.genre,
        count: genre.count,
        percentage: genre.percentage,
      })),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-5">
      <section className={OVERVIEW_MOBILE_HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative flex items-start gap-4">
          <UserAvatarPhoto
            src={avatarUrl}
            size="lg"
            className="ring-2 ring-white/20 shadow-xl shadow-black/25"
          />
          <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <SoundprintBrandMark
              size="sm"
              tone="onDark"
              showAiBadge={false}
              showWordmarkOnMobile={false}
              interactive={false}
            />
            <span className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold text-white/85">
              {badgeLabel}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {primaryInsight.eyebrow}
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.06em]">
              {primaryInsight.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {primaryInsight.subtitle}
            </p>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.07] p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {primaryInsight.metricLabel}
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-[-0.06em]">
                {primaryInsight.metric}
              </p>
            </div>
            {topGenre ? (
              <div className="max-w-[8rem] text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t("libraryLeaders.topGenre")}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-cyan-100" title={topGenre.genre}>
                  {topGenre.genre}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <OverviewFeaturePromos
              soundprintChatHref={musicAgentHref}
              duetHref={duetHref}
              variant="stack"
            />
          </div>
          {hasComparison ? (
            <p className="mt-3 text-center text-xs font-medium text-emerald-100">
              {t("mobile.comparisonHint")}
            </p>
          ) : null}
          </div>
        </div>
      </section>

      <MobileMetricRail stats={stats} comparisonLabel={t("mobile.vsShort")} />
      <MobileTimelineCard chartData={chartData} timelineHref={timelineHref} locale={locale} />

      <div className="space-y-3">
        <MobileDisclosure
          title={t("mobile.disclosures.leaders.title")}
          description={t("mobile.disclosures.leaders.description")}
          defaultOpen
        >
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
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </MobileDisclosure>

        <MobileDisclosure
          title={t("mobile.disclosures.taste.title")}
          description={t("mobile.disclosures.taste.description")}
        >
          <div className="min-h-[260px]">
            <TasteProfileSummaryWidget />
          </div>
        </MobileDisclosure>

        <MobileDisclosure
          title={t("mobile.disclosures.context.title")}
          description={t("mobile.disclosures.context.description")}
        >
          <div className="space-y-4">
            <AiInsightsSummaryWidget />
            <HeatmapCalendarOverviewWidget startDate={startDate} endDate={endDate} />
          </div>
        </MobileDisclosure>
      </div>
    </div>
  );
}

function MobileOverviewLoadingFallback({
  title,
  badgeLabel,
}: {
  title: string;
  badgeLabel: string;
}) {
  return (
    <div className="space-y-5 lg:hidden">
      <section className={OVERVIEW_MOBILE_HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <SoundprintBrandMark
              size="sm"
              tone="onDark"
              showAiBadge={false}
              showWordmarkOnMobile={false}
              interactive={false}
            />
            <span className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold">
              {badgeLabel}
            </span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.06em]">{title}</h1>
          <div className="mt-5 space-y-3">
            <div className="h-4 w-11/12 animate-pulse rounded bg-white/15" />
            <div className="h-4 w-8/12 animate-pulse rounded bg-white/10" />
          </div>
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.07] p-4">
            <div className="h-10 w-28 animate-pulse rounded bg-white/20" />
            <div className="mt-3 h-3 w-24 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </section>
      <div className="-mx-4 flex gap-3 overflow-hidden px-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 min-w-[9.75rem] animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
          />
        ))}
      </div>
    </div>
  );
}

function MobileOverviewUnavailable({
  title,
  description,
  badgeLabel,
  statusLabel,
  avatarUrl,
  children,
}: {
  title: string;
  description: string;
  badgeLabel: string;
  statusLabel: string;
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  const t = useTranslations("overview");
  return (
    <div className="space-y-5 lg:hidden">
      <section className={OVERVIEW_MOBILE_HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative flex items-start gap-4">
          <UserAvatarPhoto
            src={avatarUrl}
            size="lg"
            className="ring-2 ring-white/20 shadow-xl shadow-black/25"
          />
          <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <SoundprintBrandMark
              size="sm"
              tone="onDark"
              showAiBadge={false}
              showWordmarkOnMobile={false}
              interactive={false}
            />
            <span className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold">
              {badgeLabel}
            </span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.06em]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          <div className="mt-5 rounded-3xl border border-dashed border-white/25 bg-white/[0.05] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {statusLabel}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">—</p>
          </div>
          </div>
        </div>
      </section>
      {children}
    </div>
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
  const mobileBadgeLabel = formatMobileDateRangeLabel(rangeStart, rangeEnd, locale) || t("allData");
  const hasComparison = !isAll && !!rangeStart && !!rangeEnd;

  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const [firstName, setFirstName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    setFirstName(null);
    setAvatarUrl(null);

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
      const payload = (await response.json()) as {
        user?: { name?: string | null; avatarUrl?: string | null } | null;
      };
      if (!mounted) return;
      setFirstName(extractFirstName(payload.user?.name ?? null));
      setAvatarUrl(payload.user?.avatarUrl ?? null);
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
  const duetHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/duet/friends", searchParams),
    [searchParams]
  );

  const momentumSlides = useMemo((): OverviewMomentumSlide[] => {
    const slides: OverviewMomentumSlide[] = [];

    if (chartData.length > 0) {
      slides.push({
        id: "timeline",
        label: t("momentumCarousel.slides.timeline"),
        content: (
          <OverviewListeningMomentumCard chartData={chartData} timelineHref={timelineHref} />
        ),
      });
    }

    slides.push(
      {
        id: "artists",
        label: t("momentumCarousel.slides.artists"),
        content: (
          <ArtistTrendsSummaryWidget startDate={startDate} endDate={endDate} embedded />
        ),
      },
      {
        id: "genres",
        label: t("momentumCarousel.slides.genres"),
        content: (
          <GenreTrendsSummaryWidget startDate={startDate} endDate={endDate} embedded />
        ),
      },
      {
        id: "tracks",
        label: t("momentumCarousel.slides.tracks"),
        content: (
          <TrackTrendsSummaryWidget startDate={startDate} endDate={endDate} embedded />
        ),
      }
    );

    return slides;
  }, [chartData, timelineHref, startDate, endDate, t]);

  if (!isLoading && error) {
    return (
      <div className="space-y-8">
        <MobileOverviewUnavailable
          title={overviewTitle}
          description={t("errorStateHint")}
          badgeLabel={mobileBadgeLabel}
          statusLabel={t("errorStateMetricStatus")}
          avatarUrl={avatarUrl}
        >
          <ErrorState
            variant="startup"
            eyebrow={t("errorStateEyebrow")}
            error={error}
            message={t("errorLoading")}
            onRetry={handleRetry}
          />
        </MobileOverviewUnavailable>
        <div className="hidden space-y-8 lg:block">
          <OverviewHeroFrame
            title={overviewTitle}
            description={t("errorStateHint")}
            badgeLabel={badgeLabel}
            hasComparison={hasComparison}
            soundprintChatHref={musicAgentHref}
            duetHref={duetHref}
            avatarUrl={avatarUrl}
          />
          <ErrorState
            variant="startup"
            eyebrow={t("errorStateEyebrow")}
            error={error}
            message={t("errorLoading")}
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  if (!isLoading && (!data || data.totalListens === 0)) {
    const empty = emptyStatePresets.importData;
    return (
      <div className="space-y-8">
        <MobileOverviewUnavailable
          title={overviewTitle}
          description={t("emptyStateHeroDescription")}
          badgeLabel={mobileBadgeLabel}
          statusLabel={t("emptyStateMetricHint")}
          avatarUrl={avatarUrl}
        >
          <EmptyState
            variant="startup"
            eyebrow={t("emptyStateEyebrow")}
            aside={t("emptyStateAside")}
            message={empty.message}
            description={empty.description}
            actions={empty.actions}
          />
        </MobileOverviewUnavailable>
        <div className="hidden space-y-8 lg:block">
          <OverviewHeroFrame
            title={overviewTitle}
            description={t("emptyStateHeroDescription")}
            badgeLabel={badgeLabel}
            hasComparison={hasComparison}
            soundprintChatHref={musicAgentHref}
            duetHref={duetHref}
            avatarUrl={avatarUrl}
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
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data ? (
        <div className="lg:hidden">
          <MobileOverviewFlow
            title={overviewTitle}
            badgeLabel={mobileBadgeLabel}
            hasComparison={hasComparison}
            data={data}
            changes={changes}
            chartData={chartData}
            topTracks={topTracksForChart}
            topArtists={topArtistsForChart}
            topGenres={topGenres}
            locale={locale}
            timelineHref={timelineHref}
            tracksHref={tracksHref}
            artistsHref={`/dashboard/artists${artistsPageQuery}`}
            genresHref={genresHref}
            musicAgentHref={musicAgentHref}
            duetHref={duetHref}
            startDate={startDate}
            endDate={endDate}
            avatarUrl={avatarUrl}
          />
        </div>
      ) : (
        <MobileOverviewLoadingFallback title={overviewTitle} badgeLabel={mobileBadgeLabel} />
      )}
      <div className="hidden space-y-8 lg:block">
        <OverviewHeroFrame
          title={overviewTitle}
          description={t("subtitle")}
          badgeLabel={badgeLabel}
          hasComparison={hasComparison}
          soundprintChatHref={musicAgentHref}
          duetHref={duetHref}
          avatarUrl={avatarUrl}
          featurePromos={
            data ? undefined : (
              <OverviewFeaturePromosSkeleton />
            )
          }
        />

        <SoundprintBrandDividerSection logoSize="lg" lineStyle="fade" maxWidth="medium" className="py-4 sm:py-6" />

        <div className="space-y-12">
        <section className="relative">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <div className="flex min-h-[280px] w-full min-w-0 sm:col-span-2 lg:col-span-4">
              <TasteProfileSummaryWidget />
            </div>

            <TopThreeArtistsOverviewWidget
              startDate={startDate}
              endDate={endDate}
              onOpenArtistInsights={handleOpenArtistInsights}
            />
          </div>
        </section>

        <section className="relative">
          <OverviewSectionHeader
            eyebrow={t("sections.momentum.eyebrow")}
            title={t("sections.momentum.title")}
            description={t("sections.momentum.description")}
          />
          <OverviewMomentumCarousel slides={momentumSlides} />
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
                <div className="relative overflow-hidden rounded-[2rem] border border-accent-violet/30 bg-gray-950 p-5 text-white shadow-2xl shadow-accent-violet/25 ring-1 ring-accent-violet/15 sm:p-6 lg:p-8">
                  <DashboardCinematicHeroBg />
                  <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:items-end">
                    <div>
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

        <SoundprintBrandDividerSection logoSize="md" lineStyle="gradient" maxWidth="narrow" className="py-4 sm:py-6" />

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

        <section className="relative">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
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
        </div>
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
  const mobileBadgeLabel = formatMobileDateRangeLabel(startDate, endDate, locale) || t("allData");
  const hasComparison = !isAll && !!startDate && !!endDate;

  return (
    <div className="space-y-8">
      <MobileOverviewLoadingFallback title={t("title")} badgeLabel={mobileBadgeLabel} />
      <div className="hidden space-y-8 lg:block">
        <OverviewHeroFrame
          title={t("title")}
          description={t("subtitle")}
          badgeLabel={badgeLabel}
          hasComparison={hasComparison}
          soundprintChatHref={mergeDashboardSearchParams("/dashboard/ask-your-soundprint", new URLSearchParams())}
          duetHref={mergeDashboardSearchParams("/dashboard/duet/friends", new URLSearchParams())}
          featurePromos={<OverviewFeaturePromosSkeleton />}
        />
        <OverviewSkeleton />
      </div>
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

