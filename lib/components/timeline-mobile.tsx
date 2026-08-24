"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import {
  PeriodSelector,
  type PeriodType,
} from "@/lib/components/period-selector";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import type { TimelineDataPoint } from "@/lib/hooks/use-listening";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 pb-8 max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+1rem))] lg:hidden";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const SPARK = {
  width: 260,
  plotHeight: 68,
  plotBottom: 78,
  height: 88,
  padX: 12,
} as const;

type TimelineMobileSummary = {
  total: number;
  peak: TimelineDataPoint;
  average: number;
  trendDelta: number;
  trendDirection: "up" | "down" | "flat";
  topBuckets: TimelineDataPoint[];
};

export function formatTimelineBucketDate(
  date: string,
  period: PeriodType,
  locale: string,
): string {
  switch (period) {
    case "day": {
      return new Date(date).toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
    }
    case "week": {
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startStr = weekStart.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      const endStr = weekEnd.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      return `${startStr} - ${endStr}`;
    }
    case "month": {
      const [year, month] = date.split("-");
      return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleDateString(
        locale,
        { month: "short", year: "numeric" },
      );
    }
  }
}

function toDateOnly(date: string): string {
  return date.split("T")[0];
}

function getTimelineMobileSummary(data: TimelineDataPoint[]): TimelineMobileSummary | null {
  if (data.length === 0) return null;

  const total = data.reduce((sum, point) => sum + point.listens, 0);
  const peak = data.reduce((current, point) =>
    point.listens > current.listens ? point : current,
  );
  const first = data[0]?.listens ?? 0;
  const last = data[data.length - 1]?.listens ?? 0;
  const trendDelta = last - first;
  const trendDirection: TimelineMobileSummary["trendDirection"] =
    Math.abs(trendDelta) < 1 ? "flat" : trendDelta > 0 ? "up" : "down";

  return {
    total,
    peak,
    average: total / data.length,
    trendDelta,
    trendDirection,
    topBuckets: [...data].sort((a, b) => b.listens - a.listens).slice(0, 5),
  };
}

function createSparkGeometry(data: TimelineDataPoint[]) {
  if (data.length === 0) {
    return { points: "", peakX: SPARK.width / 2, peakY: SPARK.plotBottom };
  }

  const values = data.map((point) => point.listens);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  let peakIndex = 0;
  values.forEach((value, index) => {
    if (value > values[peakIndex]) peakIndex = index;
  });

  const coords = data.map((point, index) => {
    const x =
      data.length === 1
        ? SPARK.width / 2
        : SPARK.padX + (index / (data.length - 1)) * (SPARK.width - SPARK.padX * 2);
    const y = SPARK.plotBottom - ((point.listens - min) / range) * SPARK.plotHeight;
    return { x, y };
  });

  return {
    points: coords.map((coord) => `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(" "),
    peakX: coords[peakIndex].x,
    peakY: coords[peakIndex].y,
  };
}

function heatmapHref(
  searchParams: URLSearchParams,
  selectedDate?: string,
): string {
  const href = mergeDashboardSearchParams("/dashboard/heatmap", searchParams);
  if (!selectedDate) return href;
  const qIndex = href.indexOf("?");
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  const merged = new URLSearchParams(qIndex === -1 ? "" : href.slice(qIndex + 1));
  merged.set("selectedDate", toDateOnly(selectedDate));
  const qs = merged.toString();
  return qs ? `${path}?${qs}` : path;
}

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function HeatmapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3.75 7.5h16.5M4.5 6.75h15A1.5 1.5 0 0 1 21 8.25v11.25A1.5 1.5 0 0 1 19.5 21h-15A1.5 1.5 0 0 1 3 19.5V8.25A1.5 1.5 0 0 1 4.5 6.75Z"
      />
    </svg>
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

export function TimelineMobileSkeleton() {
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

export function TimelineMobileEmpty() {
  const t = useTranslations("timeline.mobile");

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("eyebrow")}
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

export function TimelineMobileError({
  locale,
  error,
  onRetry,
}: {
  locale: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("timeline.mobile");
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
          <h1 className="text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
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

function TimelineMobileHero({
  locale,
  heading,
  insight,
}: {
  locale: string;
  heading: string;
  insight: string;
}) {
  const t = useTranslations("timeline.mobile");
  const { startDate, endDate } = useListenDateRange();

  return (
    <section className={HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-3">
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
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {heading}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-white/80">{insight}</p>
        </div>
      </div>
    </section>
  );
}

function TimelineBucketRow({
  bucket,
  rank,
  label,
  locale,
  onOpen,
}: {
  bucket: TimelineDataPoint;
  rank: number;
  label: string;
  locale: string;
  onOpen: (bucket: TimelineDataPoint) => void;
}) {
  const t = useTranslations("timeline");
  const tm = useTranslations("timeline.mobile");

  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
      onClick={() => onOpen(bucket)}
      aria-label={tm("openBucket", { date: label })}
    >
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {bucket.listens.toLocaleString(locale)}
      </span>
      <span className="sr-only">{t("listens")}</span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

export function TimelineMobileExperience({
  data,
  period,
  locale,
}: {
  data: TimelineDataPoint[];
  period: PeriodType;
  locale: string;
}) {
  const t = useTranslations("timeline");
  const tm = useTranslations("timeline.mobile");
  const tCommon = useTranslations("common");
  const tPeriod = useTranslations("components.periodSelector");
  const searchParams = useSearchParams();
  const summary = useMemo(() => getTimelineMobileSummary(data), [data]);
  const spark = useMemo(() => createSparkGeometry(data), [data]);
  const [selectedBucket, setSelectedBucket] = useState<TimelineDataPoint | null>(null);

  if (!summary) return <TimelineMobileEmpty />;

  const peakDate = formatTimelineBucketDate(summary.peak.date, period, locale);
  const startDate = data[0]?.date ?? summary.peak.date;
  const endDate = data[data.length - 1]?.date ?? summary.peak.date;
  const startLabel = formatTimelineBucketDate(startDate, period, locale);
  const endLabel = formatTimelineBucketDate(endDate, period, locale);
  const trendLabel =
    summary.trendDirection === "up"
      ? tm("trendUp")
      : summary.trendDirection === "down"
        ? tm("trendDown")
        : tm("trendFlat");
  const heatmapRowHref = heatmapHref(searchParams);
  const selectedLabel = selectedBucket
    ? formatTimelineBucketDate(selectedBucket.date, period, locale)
    : "";
  const selectedShare =
    selectedBucket && summary.total > 0
      ? Math.round((selectedBucket.listens / summary.total) * 100)
      : 0;
  const sheetHeatmapHref = selectedBucket
    ? heatmapHref(searchParams, period === "day" ? selectedBucket.date : undefined)
    : heatmapRowHref;

  return (
    <div className={MOBILE_BLEED}>
      <TimelineMobileHero
        locale={locale}
        heading={peakDate}
        insight={tm("storyBody", {
          count: summary.peak.listens.toLocaleString(locale),
          streams: t("listens"),
        })}
      />

      <section className="px-4" aria-label={tPeriod("label")}>
        <PeriodSelector defaultPeriod="month" value={period} variant="compact" />
      </section>

      <section className="px-4" aria-label={tm("signalsLabel")}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("signalsLabel")}
        </p>
        <div className={SNAP_RAIL}>
          <SignalTile label={t("heroStatTotal")} value={summary.total.toLocaleString(locale)} />
          <SignalTile
            label={t("heroStatPeak")}
            value={summary.peak.listens.toLocaleString(locale)}
          />
          <SignalTile
            label={tm("average")}
            value={Math.round(summary.average).toLocaleString(locale)}
          />
          <SignalTile label={tm("trend")} value={trendLabel} />
        </div>
      </section>

      <section className="space-y-2 px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("sparkTitle")}
        </h2>
        <div className="rounded-3xl border border-card-border bg-card-surface px-3 pb-3 pt-2">
          <svg
            className="h-24 w-full"
            viewBox={`0 0 ${SPARK.width} ${SPARK.height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={tm("sparkAria")}
          >
            <defs>
              <linearGradient id="timelineMobileSparkline" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="60%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <polyline
              points={spark.points}
              fill="none"
              stroke="url(#timelineMobileSparkline)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={spark.peakX}
              cy={spark.peakY}
              r="5"
              fill="#22d3ee"
              stroke="#f8fafc"
              strokeWidth="2"
            />
          </svg>
          <div className="mt-1 flex items-start justify-between gap-2 text-[11px] font-semibold leading-4 tracking-tight">
            <time dateTime={toDateOnly(startDate)} className="min-w-0 flex-1 text-muted">
              {startLabel}
            </time>
            <span className="min-w-0 flex-[1.4] text-center text-cyan-700 dark:text-cyan-300">
              {tm("sparkPeakCaption", { date: peakDate })}
            </span>
            <time dateTime={toDateOnly(endDate)} className="min-w-0 flex-1 text-right text-muted">
              {endLabel}
            </time>
          </div>
        </div>
      </section>

      <section className="space-y-2 px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("bucketsTitle")}
        </h2>
        {summary.topBuckets.map((bucket, index) => (
          <TimelineBucketRow
            key={`${bucket.date}-${index}`}
            bucket={bucket}
            rank={index + 1}
            label={formatTimelineBucketDate(bucket.date, period, locale)}
            locale={locale}
            onOpen={setSelectedBucket}
          />
        ))}
        <Link
          href={heatmapRowHref}
          className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
            <HeatmapIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
              {tm("heatmapRowTitle")}
            </span>
            <span className="mt-0.5 block truncate text-xs leading-5 text-muted">
              {tm("heatmapRowLead")}
            </span>
          </span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
        </Link>
      </section>

      <MobileBottomSheet
        open={selectedBucket != null}
        onClose={() => setSelectedBucket(null)}
        ariaLabelledBy="timeline-bucket-sheet-title"
        insetAboveBottomNav
      >
        {selectedBucket ? (
          <div className="px-4 pb-8 pt-1">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {tm("sheetTitle")}
                </p>
                <h2
                  id="timeline-bucket-sheet-title"
                  className="mt-1 text-lg font-semibold tracking-tight text-foreground"
                >
                  {selectedLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBucket(null)}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
                aria-label={tm("sheetCloseAria")}
              >
                {tCommon("close")}
              </button>
            </div>
            <dl className="space-y-2">
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
                <dt className="text-sm text-muted">{t("listens")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {selectedBucket.listens.toLocaleString(locale)}
                </dd>
              </div>
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
                <dt className="text-sm text-muted">{tm("average")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {tm("vsAverage", {
                    average: Math.round(summary.average).toLocaleString(locale),
                  })}
                </dd>
              </div>
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
                <dt className="text-sm text-muted">{t("heroStatTotal")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {tm("shareOfTotal", { percent: selectedShare })}
                </dd>
              </div>
            </dl>
            <Link
              href={sheetHeatmapHref}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-gray-950 px-4 text-sm font-bold text-white dark:bg-white dark:text-gray-950"
            >
              {tm("seeOnHeatmap")}
            </Link>
          </div>
        ) : null}
      </MobileBottomSheet>
    </div>
  );
}
