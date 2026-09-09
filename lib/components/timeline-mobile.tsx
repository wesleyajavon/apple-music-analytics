"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { TimelineMobileSpark } from "@/lib/components/timeline-mobile-spark";
import type { TimelineDataPoint } from "@/lib/hooks/use-listening";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-6 px-4 pb-8 max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+1rem))] lg:hidden";

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

export function TimelineMobileSkeleton() {
  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-8 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded bg-black/5 dark:bg-white/5" />
      </div>
      <div
        className={`${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}
      >
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}
          >
            <div className="h-3 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        ))}
      </div>
    </div>
  );
}

export function TimelineMobileEmpty() {
  const t = useTranslations("timeline.mobile");

  return (
    <DashboardMobileImportEmpty
      eyebrow={t("eyebrow")}
      title={t("emptyTitle")}
      lead={t("emptyLead")}
      demoPath="/dashboard/timeline"
      importLabel={t("emptyCta")}
    />
  );
}

export function TimelineMobileError({
  locale: _locale,
  error,
  onRetry,
}: {
  locale: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("timeline.mobile");
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_BLEED}>
      <OverviewHeroFrame title={t("errorLead")} compact />
      {isQuota ? (
        <GroqQuotaNotice error={error} />
      ) : (
        <button type="button" onClick={onRetry} className={DASHBOARD_BTN_GHOST}>
          {tCommon("retry")}
        </button>
      )}
    </div>
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
      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} w-full`}
      onClick={() => onOpen(bucket)}
      aria-label={tm("openBucket", { date: label })}
    >
      <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted">
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {bucket.listens.toLocaleString(locale)}
      </span>
      <span className="sr-only">{t("listens")}</span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
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

  const metrics = [
    { key: "total", label: tm("railTotal"), value: summary.total.toLocaleString(locale) },
    { key: "peak", label: tm("railPeak"), value: summary.peak.listens.toLocaleString(locale) },
    {
      key: "average",
      label: tm("average"),
      value: Math.round(summary.average).toLocaleString(locale),
    },
    { key: "trend", label: tm("trend"), value: trendLabel },
  ];

  return (
    <div className={MOBILE_BLEED}>
      <OverviewHeroFrame
        title={peakDate}
        description={tm("storyBody", {
          count: summary.peak.listens.toLocaleString(locale),
          streams: t("listens"),
        })}
        compact
      />

      <section aria-label={tPeriod("label")}>
        <PeriodSelector defaultPeriod="month" value={period} variant="compact" />
      </section>

      <div
        className={`${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}
        aria-label={tm("signalsLabel")}
      >
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}
          >
            <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
            <span className={DASHBOARD_METRIC_VALUE}>{metric.value}</span>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className={DASHBOARD_SECTION_EYEBROW}>{tm("sparkTitle")}</h2>
        <TimelineMobileSpark
          data={data}
          ariaLabel={tm("sparkAria")}
          startLabel={startLabel}
          peakCaption={tm("sparkPeakCaption", { date: peakDate })}
          endLabel={endLabel}
          startDateTime={toDateOnly(startDate)}
          endDateTime={toDateOnly(endDate)}
        />
      </section>

      <section>
        <h2 className={`${DASHBOARD_SECTION_TITLE} mb-2 text-lg`}>{tm("bucketsTitle")}</h2>
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
          className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center text-accent-cyan">
            <HeatmapIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
              {tm("heatmapRowTitle")}
            </span>
            <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">
              {tm("heatmapRowLead")}
            </span>
          </span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
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
                <p className={DASHBOARD_SECTION_EYEBROW}>{tm("sheetTitle")}</p>
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
                className={`${DASHBOARD_BTN_GHOST} min-h-11 min-w-11 shrink-0 px-3`}
                aria-label={tm("sheetCloseAria")}
              >
                {tCommon("close")}
              </button>
            </div>
            <dl>
              <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}>
                <dt className="text-sm text-muted">{t("listens")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {selectedBucket.listens.toLocaleString(locale)}
                </dd>
              </div>
              <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}>
                <dt className="text-sm text-muted">{tm("average")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {tm("vsAverage", {
                    average: Math.round(summary.average).toLocaleString(locale),
                  })}
                </dd>
              </div>
              <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}>
                <dt className="text-sm text-muted">{t("heroStatTotal")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {tm("shareOfTotal", { percent: selectedShare })}
                </dd>
              </div>
            </dl>
            <Link
              href={sheetHeatmapHref}
              className={`${DASHBOARD_BTN_GHOST} mt-4 w-full`}
            >
              {tm("seeOnHeatmap")}
            </Link>
          </div>
        ) : null}
      </MobileBottomSheet>
    </div>
  );
}
