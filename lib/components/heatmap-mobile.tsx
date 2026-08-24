"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useTheme } from "@/lib/providers/theme-provider";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";

const MOBILE_BLEED = "-mx-4 -mt-4 space-y-4 pb-8 lg:hidden";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const AURORA_DARK = [
  "rgba(255,255,255,0.07)",
  "rgba(13,148,136,0.45)",
  "rgba(6,182,212,0.55)",
  "rgba(56,189,248,0.78)",
  "rgba(167,139,250,0.94)",
] as const;

const AURORA_LIGHT = ["#ecfeff", "#a7f3d0", "#5eead4", "#38bdf8", "#8b5cf6"] as const;

export type HeatmapMobileStats = {
  totalListens: number;
  daysWithListens: number;
  totalDays: number;
  averageListens: number;
  mostActiveWeekday: string;
  maxListens: number;
};

export type HeatmapMobileTopDay = {
  date: string;
  formatted: string;
  shortLabel: string;
  listens: number;
};

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
      />
    </svg>
  );
}

function toDateOnly(date: string): string {
  return date.split("T")[0];
}

function parseUtcNoon(date: string): Date {
  return new Date(`${toDateOnly(date)}T12:00:00Z`);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function yearMonthToStartIso(year: number, month: number): string {
  return `${year}-${pad2(month + 1)}-01`;
}

function yearMonthToEndIso(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad2(month + 1)}-${pad2(last)}`;
}

function toYearMonth(date: string): { year: number; month: number } {
  const parsed = parseUtcNoon(date);
  return { year: parsed.getUTCFullYear(), month: parsed.getUTCMonth() };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const next = new Date(Date.UTC(year, month + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
}

function monthIntersectsRange(
  year: number,
  month: number,
  rangeStart?: string,
  rangeEnd?: string,
): boolean {
  const start = yearMonthToStartIso(year, month);
  const end = yearMonthToEndIso(year, month);
  if (rangeStart && end < toDateOnly(rangeStart)) return false;
  if (rangeEnd && start > toDateOnly(rangeEnd)) return false;
  return true;
}

function clampYearMonth(
  candidate: { year: number; month: number },
  rangeStart?: string,
  rangeEnd?: string,
): { year: number; month: number } {
  let next = candidate;
  if (rangeStart && yearMonthToEndIso(next.year, next.month) < toDateOnly(rangeStart)) {
    next = toYearMonth(rangeStart);
  }
  if (rangeEnd && yearMonthToStartIso(next.year, next.month) > toDateOnly(rangeEnd)) {
    next = toYearMonth(rangeEnd);
  }
  return next;
}

function defaultYearMonth(
  peakDate: string | undefined,
  calendarStart?: string,
  calendarEnd?: string,
): { year: number; month: number } {
  const source = peakDate ?? calendarEnd ?? calendarStart;
  if (!source) {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  }
  return clampYearMonth(toYearMonth(source), calendarStart, calendarEnd);
}

function getIntensityLevel(count: number, maxCount: number): number {
  if (maxCount <= 0 || count <= 0) return 0;
  const percentage = count / maxCount;
  if (percentage >= 0.75) return 4;
  if (percentage >= 0.5) return 3;
  if (percentage >= 0.25) return 2;
  return 1;
}

type MonthCell = {
  iso: string;
  inMonth: boolean;
  day: number;
};

function buildMonthCells(year: number, month: number): MonthCell[] {
  const first = new Date(Date.UTC(year, month, 1, 12, 0, 0));
  const mondayOffset = first.getUTCDay() === 0 ? 6 : first.getUTCDay() - 1;
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - mondayOffset);

  const cells: MonthCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    cells.push({
      iso: date.toISOString().slice(0, 10),
      inMonth: date.getUTCMonth() === month,
      day: date.getUTCDate(),
    });
  }

  const trailingWeek = cells.slice(35);
  if (trailingWeek.every((cell) => !cell.inMonth)) {
    return cells.slice(0, 35);
  }
  return cells;
}

function HeatmapMobileHero({
  locale,
  heading,
  insight,
  peakLabel,
  peakValue,
  favoriteLabel,
  favoriteValue,
  ctaLabel,
  onOpenPeak,
}: {
  locale: string;
  heading: string;
  insight?: string;
  peakLabel?: string;
  peakValue?: string;
  favoriteLabel?: string;
  favoriteValue?: string;
  ctaLabel?: string;
  onOpenPeak?: () => void;
}) {
  const t = useTranslations("heatmap.mobile");
  const { startDate, endDate } = useListenDateRange();

  return (
    <section className={HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-4">
        <div className="flex justify-end">
          <MusicalProfilePeriodBadge
            startDate={startDate}
            endDate={endDate}
            locale={locale}
            variant="mobile"
            className="min-w-0"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("heroEyebrow")}
          </p>
          <h1 className="mt-1 text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {heading}
          </h1>
          {insight ? <p className="mt-1.5 text-sm leading-6 text-white/80">{insight}</p> : null}
        </div>
        {peakValue || favoriteValue ? (
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              {peakLabel ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {peakLabel}
                </p>
              ) : null}
              {peakValue ? (
                <p className="mt-1 text-4xl font-semibold tabular-nums tracking-[-0.06em]">{peakValue}</p>
              ) : null}
            </div>
            {favoriteValue ? (
              <div className="max-w-[9rem] text-right">
                {favoriteLabel ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {favoriteLabel}
                  </p>
                ) : null}
                <p className="mt-1 truncate text-sm font-semibold text-cyan-100">{favoriteValue}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        {ctaLabel && onOpenPeak ? (
          <button
            type="button"
            onClick={onOpenPeak}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-lg shadow-black/20"
          >
            <FlameIcon className="h-4 w-4" />
            {ctaLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function HeatmapMobileSkeleton() {
  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-3">
          <div className="ml-auto h-8 w-36 animate-pulse rounded-full bg-white/15" />
          <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
          <div className="h-11 animate-pulse rounded-2xl bg-white/15" />
        </div>
      </section>
      <section className="px-4">
        <div className={SNAP_RAIL}>
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 min-w-[9.75rem] snap-start animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
      <section className="space-y-2 px-4">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </section>
    </div>
  );
}

export function HeatmapMobileEmpty() {
  const t = useTranslations("heatmap.mobile");

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("heroEyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
            {t("emptyTitle")}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-white/70">{t("emptyLead")}</p>
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {t("emptyCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function HeatmapMobileNoDayDetail() {
  const t = useTranslations("heatmap.mobile");

  return (
    <div className="space-y-1 px-1 py-2">
      <p className="text-sm font-semibold text-foreground">{t("noDayDetailTitle")}</p>
      <p className="text-sm leading-6 text-muted">{t("noDayDetailLead")}</p>
    </div>
  );
}

export function HeatmapMobileError({
  locale,
  error,
  onRetry,
}: {
  locale: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("heatmap.mobile");
  const tCommon = useTranslations("common");
  const { startDate, endDate } = useListenDateRange();
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <div className="flex justify-end">
            <MusicalProfilePeriodBadge
              startDate={startDate}
              endDate={endDate}
              locale={locale}
              variant="mobile"
              className="min-w-0"
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("heroEyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
            {t("errorLead")}
          </h1>
          {isQuota ? (
            <GroqQuotaNotice error={error} />
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
            >
              {tCommon("retry")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </article>
  );
}

function HeatmapMobileDayRow({
  day,
  rank,
  locale,
  onSelect,
}: {
  day: HeatmapMobileTopDay;
  rank: number;
  locale: string;
  onSelect: (date: string, count: number) => void;
}) {
  const t = useTranslations("heatmap");
  const tm = useTranslations("heatmap.mobile");

  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
      onClick={() => onSelect(day.date, day.listens)}
      aria-label={tm("openDayDetails", { date: day.formatted })}
    >
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">{rank}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{day.formatted}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {day.listens.toLocaleString(locale)}
      </span>
      <span className="sr-only">{t("listens")}</span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

function HeatmapMobileMonthPager({
  heatmapData,
  calendarStart,
  calendarEnd,
  selectedDate,
  locale,
  maxListens,
  peakDate,
  onDayClick,
}: {
  heatmapData: HeatmapDataPoint[];
  calendarStart?: string;
  calendarEnd?: string;
  selectedDate: string | null;
  locale: string;
  maxListens: number;
  peakDate?: string;
  onDayClick: (date: string, count: number) => void;
}) {
  const t = useTranslations("heatmap.mobile");
  const { resolvedTheme } = useTheme();
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    heatmapData.forEach((point) => {
      map.set(toDateOnly(point.date), point.count);
    });
    return map;
  }, [heatmapData]);

  const initial = useMemo(
    () => defaultYearMonth(peakDate, calendarStart, calendarEnd),
    [peakDate, calendarStart, calendarEnd],
  );
  const [view, setView] = useState(initial);

  useEffect(() => {
    setView(initial);
  }, [initial]);

  const prevMonth = shiftMonth(view.year, view.month, -1);
  const nextMonth = shiftMonth(view.year, view.month, 1);
  const canGoPrev = monthIntersectsRange(prevMonth.year, prevMonth.month, calendarStart, calendarEnd);
  const canGoNext = monthIntersectsRange(nextMonth.year, nextMonth.month, calendarStart, calendarEnd);
  const monthLabel = new Date(Date.UTC(view.year, view.month, 1, 12)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekdayLabels = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 7].map((day) =>
        new Date(Date.UTC(2024, 0, day, 12)).toLocaleDateString(locale, {
          weekday: "narrow",
          timeZone: "UTC",
        }),
      ),
    [locale],
  );
  const cells = useMemo(() => buildMonthCells(view.year, view.month), [view.year, view.month]);
  const palette = resolvedTheme === "dark" ? AURORA_DARK : AURORA_LIGHT;
  const selectedIso = selectedDate ? toDateOnly(selectedDate) : null;

  return (
    <section className="space-y-3 px-4" aria-label={t("monthGridLabel")}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setView(prevMonth)}
          disabled={!canGoPrev}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-card-border bg-card-surface text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("monthPrev")}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="min-w-0 flex-1 text-center text-sm font-semibold capitalize tracking-tight text-foreground">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={() => setView(nextMonth)}
          disabled={!canGoNext}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-card-border bg-card-surface text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("monthNext")}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="flex min-h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return <div key={cell.iso} className="min-h-11 min-w-11" aria-hidden />;
          }

          const count = countByDate.get(cell.iso) ?? 0;
          const intensity = getIntensityLevel(count, maxListens);
          const isSelected = selectedIso === cell.iso;
          const formatted = parseUtcNoon(cell.iso).toLocaleDateString(locale, {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          });

          if (count <= 0) {
            return (
              <div
                key={cell.iso}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sm tabular-nums text-muted"
                style={{ backgroundColor: palette[0] }}
              >
                {cell.day}
              </div>
            );
          }

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onDayClick(cell.iso, count)}
              aria-label={t("openDayDetails", { date: formatted })}
              aria-current={isSelected ? "date" : undefined}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl text-sm font-semibold tabular-nums text-foreground ${
                isSelected ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-background" : ""
              }`}
              style={{ backgroundColor: palette[intensity] }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function HeatmapMobileExperience({
  stats,
  topDays,
  heatmapData,
  calendarStart,
  calendarEnd,
  selectedDate,
  locale,
  onDayClick,
}: {
  stats: HeatmapMobileStats;
  topDays: HeatmapMobileTopDay[];
  heatmapData: HeatmapDataPoint[];
  calendarStart?: string;
  calendarEnd?: string;
  selectedDate: string | null;
  locale: string;
  onDayClick: (date: string, count: number) => void;
}) {
  const t = useTranslations("heatmap");
  const tm = useTranslations("heatmap.mobile");
  const peakDay = topDays[0];
  const activePct =
    stats.totalDays > 0 ? Math.round((stats.daysWithListens / stats.totalDays) * 100) : 0;

  return (
    <div className={MOBILE_BLEED}>
      <HeatmapMobileHero
        locale={locale}
        heading={peakDay ? peakDay.shortLabel : t("title")}
        insight={
          peakDay
            ? tm("primaryInsightBody", {
                count: peakDay.listens.toLocaleString(locale),
                date: peakDay.formatted,
              })
            : undefined
        }
        peakLabel={tm("peakMetric")}
        peakValue={(peakDay?.listens ?? stats.maxListens).toLocaleString(locale)}
        favoriteLabel={tm("railFavorite")}
        favoriteValue={stats.mostActiveWeekday}
        ctaLabel={peakDay ? tm("openPeakDay") : undefined}
        onOpenPeak={peakDay ? () => onDayClick(peakDay.date, peakDay.listens) : undefined}
      />

      <section className="px-4" aria-label={tm("signalsLabel")}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("signalsLabel")}
        </p>
        <div className={SNAP_RAIL}>
          <SignalTile label={tm("railTotal")} value={stats.totalListens.toLocaleString(locale)} />
          <SignalTile label={tm("railActive")} value={`${activePct}%`} />
          <SignalTile label={tm("railAvg")} value={stats.averageListens.toLocaleString(locale)} />
          <SignalTile label={tm("railFavorite")} value={stats.mostActiveWeekday} />
        </div>
      </section>

      {topDays.length > 0 ? (
        <section className="space-y-2 px-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {tm("topDaysTitle")}
          </h2>
          {topDays.map((day, index) => (
            <HeatmapMobileDayRow
              key={day.date}
              day={day}
              rank={index + 1}
              locale={locale}
              onSelect={onDayClick}
            />
          ))}
        </section>
      ) : null}

      {heatmapData.length > 0 ? (
        <HeatmapMobileMonthPager
          heatmapData={heatmapData}
          calendarStart={calendarStart}
          calendarEnd={calendarEnd}
          selectedDate={selectedDate}
          locale={locale}
          maxListens={stats.maxListens}
          peakDate={peakDay?.date}
          onDayClick={onDayClick}
        />
      ) : null}
    </div>
  );
}
