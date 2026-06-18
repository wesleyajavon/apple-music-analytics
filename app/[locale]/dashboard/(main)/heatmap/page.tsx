"use client";

import {
  useMemo,
  useCallback,
  Suspense,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CalendarHeatmap,
  HeatmapDataPoint,
} from "@/lib/components/calendar-heatmap";
import {
  useTimeline,
  useListens,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import {
  formatMobileDateRangeLabel,
  formatOverviewDateRangeLabel,
} from "@/lib/utils/overview-date-range-label";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { HeatmapDayDetailsPanel } from "@/lib/components/heatmap-day-details-panel";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { HeatmapSkeleton } from "@/lib/components/skeleton-loaders";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Flame,
  Music2,
  TrendingUp,
} from "lucide-react";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
} from "@/lib/constants/dashboard-spotlight";

/** Aligné hero `/dashboard/timeline` — startup / Vercel */
const HEATMAP_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const HEATMAP_CALENDAR_SECTION_CLASS = `relative ${DASHBOARD_SPOTLIGHT_SHELL}`;

function HeatmapHeroFrame({ badgeLabel, stats }: { badgeLabel: string; stats: ReactNode }) {
  const t = useTranslations("heatmap");
  return (
    <div className={HEATMAP_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <LiveStatusDot />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <CalendarDays className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" strokeWidth={1.5} aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              {badgeLabel}
            </span>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/timeline"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100 sm:w-auto"
            >
              <Activity className="h-4 w-4" aria-hidden />
              {t("ctaTimeline")}
            </Link>
          </div>
        </div>

        <div className="relative lg:mt-0">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
              </div>
              {stats ?? (
                <p className="pt-4 text-sm leading-6 text-white/60">{t("heroStatsPlaceholder")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type HeatmapSummaryStats = {
  totalListens: number;
  daysWithListens: number;
  totalDays: number;
  averageListens: number;
  mostActiveWeekday: string;
};

type HeatmapComputedStats = HeatmapSummaryStats & {
  maxListens: number;
  minListens: number;
  maxDay: {
    date: string;
    listens: number;
    formatted: string;
  } | null;
  minDay: {
    date: string;
    listens: number;
    formatted: string;
  } | null;
};

type HeatmapTopDay = {
  date: string;
  formatted: string;
  shortLabel: string;
  listens: number;
  percentageOfPeak: number;
};

function HeatmapHeroStats({ stats, locale }: { stats: HeatmapSummaryStats; locale: string }) {
  const t = useTranslations("heatmap");
  const pct =
    stats.totalDays > 0
      ? Math.round((stats.daysWithListens / stats.totalDays) * 100)
      : 0;
  return (
    <div className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-2 lg:gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold tracking-tight text-white tabular-nums sm:text-xl">{stats.totalListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("totalListens")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold tracking-tight text-white tabular-nums sm:text-xl">
          {stats.daysWithListens.toLocaleString(locale)} / {stats.totalDays.toLocaleString(locale)}
        </p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("activeDays")}</p>
        <p className="mt-0.5 text-xs text-white/65">{pct}% {t("ofDays")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-lg font-semibold tracking-tight text-white tabular-nums sm:text-xl">{stats.averageListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("avgDaily")}</p>
        <p className="mt-0.5 text-xs text-white/65">{t("listensPerDay")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl" title={stats.mostActiveWeekday}>{stats.mostActiveWeekday}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("favoriteDay")}</p>
        <p className="mt-0.5 text-xs text-white/65">{t("favoriteDayHint")}</p>
      </div>
    </div>
  );
}

function HeatmapHeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 pt-4 lg:gap-3" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-16 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function HeatmapMobileHeaderRow({ badgeLabel }: { badgeLabel: string }) {
  const t = useTranslations("heatmap");
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
        {t("mobile.heroEyebrow")}
      </p>
      <span className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[10px] font-semibold tabular-nums text-white/85">
        {badgeLabel}
      </span>
    </div>
  );
}

function formatMobileDayLabel(date: string, locale: string, format: "short" | "long") {
  const d = new Date(toDateOnly(date) + "T12:00:00Z");
  if (format === "short") {
    return d.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return d.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function HeatmapMobileLoadingFallback({ badgeLabel }: { badgeLabel: string }) {
  const t = useTranslations("heatmap");
  return (
    <div className="space-y-5 lg:hidden" aria-busy="true">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-xl shadow-violet-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(6,182,212,0.2),transparent_34%)]" />
        <div className="relative">
          <HeatmapMobileHeaderRow badgeLabel={badgeLabel} />
          <div className="mt-6 h-4 w-32 animate-shimmer rounded bg-white/15" />
          <div className="mt-3 h-9 w-56 max-w-full animate-shimmer rounded bg-white/20" />
          <div className="mt-3 h-4 w-full animate-shimmer rounded bg-white/10" />
          <div className="mt-5 h-24 animate-shimmer rounded-[1.35rem] bg-white/10" />
        </div>
      </section>
      <section aria-label={t("mobile.signalsLabel")} className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-24 min-w-[9.5rem] animate-shimmer rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </section>
    </div>
  );
}

function HeatmapMobileSignalRail({
  stats,
  locale,
}: {
  stats: HeatmapComputedStats;
  locale: string;
}) {
  const t = useTranslations("heatmap");
  const activePct =
    stats.totalDays > 0
      ? Math.round((stats.daysWithListens / stats.totalDays) * 100)
      : 0;
  const signals = [
    {
      label: t("totalListens"),
      value: stats.totalListens.toLocaleString(locale),
      hint: t("mobile.signals.playsHint"),
    },
    {
      label: t("activeDays"),
      value: `${activePct}%`,
      hint: `${stats.daysWithListens.toLocaleString(locale)} / ${stats.totalDays.toLocaleString(locale)}`,
    },
    {
      label: t("avgDaily"),
      value: stats.averageListens.toLocaleString(locale),
      hint: t("listensPerDay"),
    },
    {
      label: t("favoriteDay"),
      value: stats.mostActiveWeekday,
      hint: t("favoriteDayHint"),
    },
  ];

  return (
    <section aria-label={t("mobile.signalsLabel")} className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      <div className="flex snap-x gap-3">
        {signals.map((signal) => (
          <article
            key={signal.label}
            className="min-w-[9.5rem] snap-start rounded-2xl border border-card-border bg-card-surface p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {signal.label}
            </p>
            <p className="mt-2 truncate text-xl font-semibold tabular-nums tracking-[-0.04em] text-foreground">
              {signal.value}
            </p>
            <p className="mt-1 truncate text-xs text-muted">{signal.hint}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HeatmapMobileDayButton({
  day,
  rank,
  locale,
  onSelect,
}: {
  day: HeatmapTopDay;
  rank: number;
  locale: string;
  onSelect: (date: string, count: number) => void;
}) {
  const t = useTranslations("heatmap");
  return (
    <button
      type="button"
      className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-card-border bg-surface/70 px-3 py-2.5 text-left transition-colors active:bg-surface-glass"
      onClick={() => onSelect(day.date, day.listens)}
      aria-label={t("mobile.openDayDetails", { date: day.formatted })}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {day.formatted}
        </span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500"
            style={{ width: `${day.percentageOfPeak}%` }}
          />
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold tabular-nums text-foreground">
          {day.listens.toLocaleString(locale)}
        </span>
        <span className="text-[11px] text-muted">{t("listens")}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-active:translate-x-0.5" aria-hidden />
    </button>
  );
}

function HeatmapMobileDisclosure({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const t = useTranslations("heatmap");
  return (
    <details className="group rounded-[1.5rem] border border-card-border bg-card-surface shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>
        </span>
        <span className="rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition group-open:bg-primary group-open:text-primary-foreground">
          {t("mobile.open")}
        </span>
      </summary>
      <div className="border-t border-card-border p-4">{children}</div>
    </details>
  );
}

function HeatmapMobileStateCard({
  badgeLabel,
  title,
  description,
  children,
}: {
  badgeLabel: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5 lg:hidden">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-xl shadow-violet-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(6,182,212,0.2),transparent_34%),linear-gradient(150deg,rgba(3,7,18,0.98),rgba(30,27,75,0.84)_55%,rgba(8,47,73,0.6))]" aria-hidden />
        <div className="relative">
          <HeatmapMobileHeaderRow badgeLabel={badgeLabel} />
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.06em]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
        </div>
      </section>
      <div className="rounded-[1.5rem] border border-card-border bg-card-surface p-4 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function HeatmapMobileExperience({
  badgeLabel,
  stats,
  topDays,
  heatmapData,
  calendarStart,
  calendarEnd,
  selectedDate,
  locale,
  onDayClick,
}: {
  badgeLabel: string;
  stats: HeatmapComputedStats;
  topDays: HeatmapTopDay[];
  heatmapData: HeatmapDataPoint[];
  calendarStart?: string;
  calendarEnd?: string;
  selectedDate: string | null;
  locale: string;
  onDayClick: (date: string, count: number) => void;
}) {
  const t = useTranslations("heatmap");
  const peakDay = topDays[0];

  return (
    <div className="space-y-5 lg:hidden">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-xl shadow-violet-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(6,182,212,0.22),transparent_34%),linear-gradient(150deg,rgba(3,7,18,0.98),rgba(30,27,75,0.84)_55%,rgba(8,47,73,0.6))]" aria-hidden />
        <div className="relative">
          <HeatmapMobileHeaderRow badgeLabel={badgeLabel} />

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {t("mobile.primaryInsightEyebrow")}
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.06em]">
              {peakDay ? peakDay.shortLabel : t("title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {peakDay
                ? t("mobile.primaryInsightBody", {
                    count: peakDay.listens.toLocaleString(locale),
                    date: peakDay.formatted,
                  })
                : t("subtitle")}
            </p>
          </div>

          <div className="mt-5 rounded-[1.35rem] border border-white/12 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t("mobile.peakMetric")}
                </p>
                <p className="mt-1 text-4xl font-semibold tabular-nums tracking-[-0.06em]">
                  {(peakDay?.listens ?? stats.maxListens).toLocaleString(locale)}
                </p>
              </div>
              <div className="max-w-[8rem] text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t("favoriteDay")}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-cyan-100">
                  {stats.mostActiveWeekday}
                </p>
              </div>
            </div>
            {peakDay ? (
              <button
                type="button"
                onClick={() => onDayClick(peakDay.date, peakDay.listens)}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-lg shadow-black/20"
              >
                <Flame className="h-4 w-4" aria-hidden />
                {t("mobile.openPeakDay")}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <HeatmapMobileSignalRail stats={stats} locale={locale} />

      {topDays.length > 0 ? (
        <section className="rounded-[1.5rem] border border-card-border bg-card-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                {t("mobile.topDaysEyebrow")}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.035em] text-foreground">
                {t("mobile.topDaysTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {t("mobile.topDaysDescription")}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {topDays.map((day, index) => (
              <HeatmapMobileDayButton
                key={day.date}
                day={day}
                rank={index + 1}
                locale={locale}
                onSelect={onDayClick}
              />
            ))}
          </div>
        </section>
      ) : null}

      <HeatmapMobileDisclosure
        title={t("mobile.calendarDisclosureTitle")}
        description={t("mobile.calendarDisclosureDescription")}
      >
        {heatmapData.length > 0 ? (
          <div className="rounded-[1.25rem] border border-card-border bg-surface/70 p-3">
            <p className="mb-3 flex items-center gap-2 text-xs font-medium leading-5 text-muted">
              <Music2 className="h-4 w-4 text-primary" aria-hidden />
              {t("mobile.calendarTapHint")}
            </p>
            <CalendarHeatmap
              data={heatmapData}
              startDate={calendarStart}
              endDate={calendarEnd}
              selectedDate={selectedDate}
              onDayClick={onDayClick}
              locale={locale}
              colorScheme="aurora"
            />
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">{t("noDataPeriod")}</p>
        )}
      </HeatmapMobileDisclosure>
    </div>
  );
}

function HeatmapPageFallback() {
  const t = useTranslations("heatmap");
  const tOverview = useTranslations("overview");
  const badgeLabel = tOverview("allData");
  return (
    <div className="space-y-8">
      <HeatmapMobileLoadingFallback badgeLabel={badgeLabel} />
      <div className="hidden lg:block">
        <HeatmapHeroFrame
          badgeLabel={badgeLabel}
          stats={<HeatmapHeroStatsSkeleton />}
        />
      </div>
      <section className={`${HEATMAP_CALENDAR_SECTION_CLASS} hidden lg:block`}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
        <div className="relative p-6 sm:p-8">
          <HeatmapSkeleton />
        </div>
      </section>
    </div>
  );
}

/** Normalise une date (string ou Date) en YYYY-MM-DD pour éviter Invalid Date */
function toDateOnly(date: string | Date): string {
  if (typeof date === "string") return date.split("T")[0];
  return date.toISOString().split("T")[0];
}

function HeatmapContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("heatmap");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const selectedDateParam = searchParams.get("selectedDate");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    selectedDateParam,
  );
  const dayDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && dayDetailsRef.current) {
      dayDetailsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedDate]);

  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const { startDate: badgeStart, endDate: badgeEnd } = useListenDateRange();
  const badgeRangeLabel = formatOverviewDateRangeLabel(
    badgeStart,
    badgeEnd,
    locale,
  );
  const badgeLabel = badgeRangeLabel
    ? t("dateRangeBadge", { range: badgeRangeLabel })
    : tOverview("allData");
  const mobileBadgeLabel =
    formatMobileDateRangeLabel(badgeStart, badgeEnd, locale) ||
    tOverview("allData");

  const {
    data: timelineData,
    isLoading,
    error,
    refetch,
  } = useTimeline(startDate, endDate, "day", userId);

  const { data: temporalData } = useTemporalAnalysis(
    startDate,
    endDate,
    userId,
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (startDate && endDate) {
      return { rangeStart: startDate, rangeEnd: endDate };
    }
    if (!timelineData?.length) {
      return {
        rangeStart: undefined as string | undefined,
        rangeEnd: undefined as string | undefined,
      };
    }
    const dates = timelineData.map((p) => toDateOnly(p.date));
    const sorted = [...dates].sort();
    return {
      rangeStart: sorted[0],
      rangeEnd: sorted[sorted.length - 1],
    };
  }, [startDate, endDate, timelineData]);

  const calendarStart = startDate ?? rangeStart;
  const calendarEnd = endDate ?? rangeEnd;

  const heatmapData: HeatmapDataPoint[] = useMemo(() => {
    if (!timelineData) return [];

    return timelineData.map((point) => ({
      date: point.date,
      count: point.listens,
    }));
  }, [timelineData]);

  const totalDaysInRange = useMemo(() => {
    if (!calendarStart || !calendarEnd) return 1;
    const start = new Date(calendarStart);
    const end = new Date(calendarEnd);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [calendarStart, calendarEnd]);

  const daysForDailyAverage = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return 1;
    const dates = timelineData.map((p) => toDateOnly(p.date));
    const first = new Date(
      Math.min(...dates.map((d) => new Date(d).getTime())),
    );
    const last = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    const diffTime = last.getTime() - first.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [timelineData]);

  const stats = useMemo<HeatmapComputedStats | null>(() => {
    if (!timelineData || timelineData.length === 0) {
      return null;
    }

    const totalListens = timelineData.reduce(
      (sum, point) => sum + point.listens,
      0,
    );
    const daysWithListens = timelineData.filter(
      (point) => point.listens > 0,
    ).length;
    const averageListens = totalListens / daysForDailyAverage;

    const sortedByListens = [...timelineData].sort(
      (a, b) => b.listens - a.listens,
    );
    const maxListens = sortedByListens[0]?.listens || 0;
    const minListens =
      timelineData
        .filter((p) => p.listens > 0)
        .sort((a, b) => a.listens - b.listens)[0]?.listens || 0;

    const maxDay = sortedByListens[0];
    const minDay = timelineData
      .filter((p) => p.listens > 0)
      .sort((a, b) => a.listens - b.listens)[0];

    const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
    const weekdaysT = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    let mostActiveWeekday = "—";
    if (temporalData?.byDayOfWeek?.length) {
      temporalData.byDayOfWeek.forEach((d, i) => {
        weekdayDistribution[(i + 1) % 7] = d.listens;
      });
      if (temporalData.peakDay != null) {
        mostActiveWeekday = t(
          `weekdays.${weekdaysT[temporalData.peakDay.dayOfWeek]}`,
        );
      }
    } else {
      timelineData.forEach((point) => {
        const dayOfWeek = new Date(
          toDateOnly(point.date) + "T12:00:00Z",
        ).getUTCDay();
        weekdayDistribution[dayOfWeek] += point.listens;
      });
      const weekdays = weekdaysT.map((k) => t(`weekdays.${k}`));
      const maxWeekdayIndex = weekdayDistribution.indexOf(
        Math.max(...weekdayDistribution),
      );
      mostActiveWeekday = weekdays[maxWeekdayIndex];
    }

    return {
      totalListens,
      daysWithListens,
      totalDays: totalDaysInRange,
      averageListens: Math.round(averageListens * 10) / 10,
      maxListens,
      minListens,
      maxDay: maxDay
        ? {
            date: maxDay.date,
            listens: maxDay.listens,
            formatted: new Date(
              toDateOnly(maxDay.date) + "T12:00:00Z",
            ).toLocaleDateString(locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }
        : null,
      minDay: minDay
        ? {
            date: minDay.date,
            listens: minDay.listens,
            formatted: new Date(
              toDateOnly(minDay.date) + "T12:00:00Z",
            ).toLocaleDateString(locale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          }
        : null,
      mostActiveWeekday,
    };
  }, [
    timelineData,
    temporalData,
    totalDaysInRange,
    daysForDailyAverage,
    t,
    locale,
  ]);

  const topActiveDays = useMemo<HeatmapTopDay[]>(() => {
    if (!timelineData?.length) return [];
    const maxListens = Math.max(...timelineData.map((point) => point.listens), 1);
    return [...timelineData]
      .filter((point) => point.listens > 0)
      .sort((a, b) => b.listens - a.listens)
      .slice(0, 5)
      .map((point) => ({
        date: toDateOnly(point.date),
        formatted: formatMobileDayLabel(point.date, locale, "long"),
        shortLabel: formatMobileDayLabel(point.date, locale, "short"),
        listens: point.listens,
        percentageOfPeak: Math.max(
          8,
          Math.round((point.listens / maxListens) * 100),
        ),
      }));
  }, [timelineData, locale]);

  const handleDayClick = useCallback((date: string, count: number) => {
    if (count === 0) {
      setSelectedDate(null);
      return;
    }

    setSelectedDate(date);
  }, []);

  const dayListensParams = useMemo(() => {
    if (!selectedDate) return undefined;

    return {
      startDate: selectedDate,
      endDate: selectedDate,
      limit: 500,
      userId,
    };
  }, [selectedDate, userId]);

  const { data: dayListensData, isLoading: isLoadingDayListens } = useListens(
    dayListensParams,
    { enabled: !!selectedDate },
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (!isLoading && error) {
    return (
      <div className="space-y-8">
        <HeatmapMobileStateCard
          badgeLabel={mobileBadgeLabel}
          title={t("title")}
          description={t("errorLoading")}
        >
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={handleRetry}
          />
        </HeatmapMobileStateCard>
        <div className="hidden space-y-8 lg:block">
          <HeatmapHeroFrame badgeLabel={badgeLabel} stats={null} />
          <section className={HEATMAP_CALENDAR_SECTION_CLASS}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
            <div className="relative p-6 sm:p-8">
              <ErrorState
                variant="startup"
                error={error}
                message={t("errorLoading")}
                onRetry={handleRetry}
              />
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!isLoading && (!timelineData || timelineData.length === 0)) {
    return (
      <div className="space-y-8">
        <HeatmapMobileStateCard
          badgeLabel={mobileBadgeLabel}
          title={t("title")}
          description={t("subtitle")}
        >
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </HeatmapMobileStateCard>
        <div className="hidden space-y-8 lg:block">
          <HeatmapHeroFrame badgeLabel={badgeLabel} stats={null} />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading ? (
        <HeatmapMobileLoadingFallback badgeLabel={mobileBadgeLabel} />
      ) : stats ? (
        <HeatmapMobileExperience
          badgeLabel={mobileBadgeLabel}
          stats={stats}
          topDays={topActiveDays}
          heatmapData={heatmapData}
          calendarStart={calendarStart}
          calendarEnd={calendarEnd}
          selectedDate={selectedDate}
          locale={locale}
          onDayClick={handleDayClick}
        />
      ) : null}

      <div className="hidden space-y-8 lg:block">
        <HeatmapHeroFrame
          badgeLabel={badgeLabel}
          stats={
            isLoading ? (
              <HeatmapHeroStatsSkeleton />
            ) : stats ? (
              <HeatmapHeroStats
                stats={{
                  totalListens: stats.totalListens,
                  daysWithListens: stats.daysWithListens,
                  totalDays: stats.totalDays,
                  averageListens: stats.averageListens,
                  mostActiveWeekday: stats.mostActiveWeekday,
                }}
                locale={locale}
              />
            ) : null
          }
        />

        <section
          className={`${HEATMAP_CALENDAR_SECTION_CLASS} animate-fade-in-up transition-all duration-300`}
          aria-labelledby="heatmap-spotlight-title"
        >
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} aria-hidden />
          <div className="relative">
            <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50/90 text-lime-700 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-lime-300">
                  <CalendarDays className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <h2 id="heatmap-spotlight-title" className={DASHBOARD_SPOTLIGHT_TITLE}>
                    {t("calendarTitle")}
                  </h2>
                  <p className={`mt-1 max-w-2xl ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("calendarHint")}</p>
                  {heatmapData.length === 0 && (
                    <p className={`mt-2 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("noDataPeriod")}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8">
              {isLoading ? (
                <HeatmapSkeleton />
              ) : heatmapData.length > 0 ? (
                <div className={`relative ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
                  <div className="pointer-events-none absolute left-1/2 top-10 h-64 w-64 -translate-x-1/2 rounded-full bg-lime-400/10 blur-3xl dark:bg-violet-400/12" aria-hidden />
                  <div className="relative">
                    <CalendarHeatmap
                      data={heatmapData}
                      startDate={calendarStart}
                      endDate={calendarEnd}
                      selectedDate={selectedDate}
                      onDayClick={handleDayClick}
                      locale={locale}
                      colorScheme="aurora"
                    />
                  </div>
                </div>
              ) : (
                <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} py-12 text-center ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                  <p>{t("noDataPeriod")}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <MobileBottomSheet
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        ariaLabelledBy="heatmap-day-details-title"
      >
        {selectedDate ? (
          <section
            ref={dayDetailsRef}
            className="scroll-mt-8 animate-fade-in-up lg:mt-8"
            aria-labelledby="heatmap-day-details-title"
          >
            <HeatmapDayDetailsPanel
              selectedDate={selectedDate}
              locale={locale}
              onClose={() => setSelectedDate(null)}
              dayListens={dayListensData}
              isLoading={isLoadingDayListens}
              periodDailyAverage={
                stats && stats.averageListens > 0 ? stats.averageListens : null
              }
              periodMaxListens={stats?.maxListens ?? 0}
              periodMaxDayDate={
                stats?.maxDay ? toDateOnly(stats.maxDay.date) : null
              }
              emptyStateNoPlays={
                <EmptyState variant="startup" {...emptyStatePresets.noDayDetail} />
              }
            />
          </section>
        ) : null}
      </MobileBottomSheet>
    </>
  );
}

export default function HeatmapPage() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";
  const selectedDateParam = searchParams.get("selectedDate") ?? "";
  const filterKey = `${startDateParam}-${endDateParam}-${selectedDateParam}`;

  return (
    <div className="px-4 pb-4 pt-0 sm:px-0 lg:pb-6">
      <Suspense fallback={<HeatmapPageFallback />}>
        <HeatmapContent key={filterKey} />
      </Suspense>
    </div>
  );
}
