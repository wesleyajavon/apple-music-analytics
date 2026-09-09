"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";
import {
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import type {
  DayOfWeekAggregationDto,
  HourOfDayAggregationDto,
  TemporalAnalysisDto,
} from "@/lib/dto/listening";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import {
  TEMPORAL_DAY_PARTS,
  WEEKDAY_KEYS,
  formatHourForDisplay,
  getClockHandAngle,
  getRhythmKey,
  type TemporalDayPartId,
} from "@/lib/utils/temporal-analysis-display";

const MOBILE_CANVAS =
  "space-y-8 pb-8 max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+1rem))] lg:hidden";

const CLOCK_COLORS = {
  start: "#60a5fa",
  mid: "#8b5cf6",
  end: "#e879f9",
  accent: "#60a5fa",
} as const;

type TemporalSegment = "days" | "hours";

type DayPartRow = {
  id: TemporalDayPartId;
  startHour: number;
  endHour: number;
  listens: number;
  hours: HourOfDayAggregationDto[];
};

type SheetTarget =
  | { kind: "day"; day: DayOfWeekAggregationDto; name: string }
  | { kind: "part"; part: DayPartRow; label: string };

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18 9 11.25l4.5 4.5L21.75 7M21.75 7h-5.25M21.75 7v5.25"
      />
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

function MiniClock({ hour }: { hour: number }) {
  const angle = getClockHandAngle(hour);
  return (
    <div className="h-[5.5rem] w-[5.5rem] shrink-0 rounded-full bg-blue-400/10 p-1.5">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-300/35" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#temporalMobileClockGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(hour / 24) * 283} 283`}
          transform="rotate(-90 50 50)"
          className="opacity-80"
        />
        <defs>
          <linearGradient id="temporalMobileClockGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={CLOCK_COLORS.start} />
            <stop offset="55%" stopColor={CLOCK_COLORS.mid} />
            <stop offset="100%" stopColor={CLOCK_COLORS.end} />
          </linearGradient>
        </defs>
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="18"
          stroke={CLOCK_COLORS.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 50 50)`}
        />
        <circle cx="50" cy="50" r="4" fill={CLOCK_COLORS.accent} />
      </svg>
    </div>
  );
}

function RelativeBar({ percent }: { percent: number }) {
  return (
    <span className="h-1.5 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
      <span
        className="block h-full rounded-full bg-brand-gradient"
        style={{ width: `${Math.max(percent, 0)}%` }}
      />
    </span>
  );
}

function aggregateDayParts(hours: HourOfDayAggregationDto[]): DayPartRow[] {
  return TEMPORAL_DAY_PARTS.map((part) => {
    const items = hours.filter((item) => item.hour >= part.startHour && item.hour <= part.endHour);
    return {
      id: part.id,
      startHour: part.startHour,
      endHour: part.endHour,
      listens: items.reduce((sum, item) => sum + item.listens, 0),
      hours: [...items].sort((a, b) => a.hour - b.hour),
    };
  });
}

function TemporalMobileHero({
  heading,
  insight,
  rhythmLabel,
  peakHour,
  badge,
}: {
  heading: string;
  insight: string;
  rhythmLabel?: string;
  peakHour?: number;
  badge?: string;
}) {
  const t = useTranslations("temporal-analysis.mobile");

  return (
    <OverviewHeroFrame compact title={heading} description={insight}>
      <p className="mt-1 text-[13px] font-medium text-muted">{t("eyebrow")}</p>
      {badge ? <p className="mt-1 text-[13px] font-medium text-muted">{badge}</p> : null}
      <div className="mt-4 flex items-start gap-3.5">
        {peakHour != null ? <MiniClock hour={peakHour} /> : null}
        {rhythmLabel ? (
          <span className="inline-flex min-h-8 items-center rounded-full border border-glass-hairline bg-surface-raised px-3 text-xs font-medium text-foreground">
            {rhythmLabel}
          </span>
        ) : null}
      </div>
    </OverviewHeroFrame>
  );
}

export function TemporalMobileSkeleton() {
  const t = useTranslations("temporal-analysis");
  const tm = useTranslations("temporal-analysis.mobile");

  return (
    <div className={MOBILE_CANVAS} aria-busy="true">
      <OverviewHeroFrame compact title={t("title")} description={tm("eyebrow")}>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      </OverviewHeroFrame>
      <div className={`${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}>
        {[0, 1, 2].map((item) => (
          <div key={item} className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}>
            <span className="h-3 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <span className="mt-2 h-7 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className="space-y-0">
        <div className="mb-3 h-11 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
        {[0, 1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
            <div className="h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemporalMobileEmpty() {
  const t = useTranslations("temporal-analysis.mobile");

  return (
    <DashboardMobileImportEmpty
      eyebrow={t("eyebrow")}
      title={t("emptyTitle")}
      lead={t("emptyLead")}
      demoPath="/dashboard/temporal-analysis"
      importLabel={t("emptyCta")}
    />
  );
}

export function TemporalMobileError({
  error,
  onRetry,
}: {
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("temporal-analysis.mobile");
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={t("errorLead")} description={t("eyebrow")}>
        <div className="mt-4">
          {isQuota ? (
            <GroqQuotaNotice error={error} />
          ) : (
            <button type="button" onClick={onRetry} className={DASHBOARD_BTN_OUTLINE}>
              {tCommon("retry")}
            </button>
          )}
        </div>
      </OverviewHeroFrame>
    </div>
  );
}

function TemporalSegmentControl({
  value,
  onChange,
}: {
  value: TemporalSegment;
  onChange: (next: TemporalSegment) => void;
}) {
  const t = useTranslations("temporal-analysis.mobile");
  const items: TemporalSegment[] = ["days", "hours"];

  return (
    <div
      role="tablist"
      aria-label={t("segmentLabel")}
      className={`${DASHBOARD_SEGMENTED_TRACK} w-full`}
    >
      {items.map((id) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`temporal-mobile-tab-${id}`}
            aria-selected={isActive}
            aria-controls={`temporal-mobile-panel-${id}`}
            tabIndex={isActive ? 0 : -1}
            className={`flex-1 ${isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}`}
            onClick={() => onChange(id)}
          >
            {t(id)}
          </button>
        );
      })}
    </div>
  );
}

function MetricRow({
  label,
  listens,
  percent,
  locale,
  ariaLabel,
  onOpen,
}: {
  label: string;
  listens: number;
  percent: number;
  locale: string;
  ariaLabel: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_ROW_INTERACTIVE} ${DASHBOARD_LIST_SEPARATOR} w-full text-left`}
      onClick={onOpen}
      aria-label={ariaLabel}
    >
      <span className="min-w-0 flex-[1.2] truncate text-sm font-semibold text-foreground">{label}</span>
      <RelativeBar percent={percent} />
      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
        {listens.toLocaleString(locale)}
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}

function DestinationRow({
  href,
  title,
  lead,
  icon,
}: {
  href: string;
  title: string;
  lead: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_ROW_INTERACTIVE} ${DASHBOARD_LIST_SEPARATOR} no-underline text-foreground`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">{lead}</span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

export function TemporalMobileExperience({
  data,
  locale,
}: {
  data: TemporalAnalysisDto;
  locale: string;
}) {
  const t = useTranslations("temporal-analysis");
  const tm = useTranslations("temporal-analysis.mobile");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const [segment, setSegment] = useState<TemporalSegment>("days");
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  const totalListens = useMemo(
    () => data.byDayOfWeek.reduce((sum, day) => sum + day.listens, 0),
    [data.byDayOfWeek],
  );
  const dayRows = useMemo(
    () =>
      data.byDayOfWeek.map((day) => ({
        day,
        name: t(`weekdays.${WEEKDAY_KEYS[day.dayOfWeek]}`),
      })),
    [data.byDayOfWeek, t],
  );
  const dayParts = useMemo(() => aggregateDayParts(data.byHourOfDay), [data.byHourOfDay]);
  const maxDayListens = Math.max(...dayRows.map((row) => row.day.listens), 1);
  const maxPartListens = Math.max(...dayParts.map((part) => part.listens), 1);

  const peakDayLabel = data.peakDay
    ? t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)
    : "—";
  const peakHourLabel = data.peakHour
    ? formatHourForDisplay(data.peakHour.hour, locale)
    : "—";
  const heading =
    data.peakDay && data.peakHour
      ? `${peakDayLabel} ${t("at")} ${peakHourLabel}`
      : data.peakDay
        ? peakDayLabel
        : peakHourLabel;
  const insightCount = data.peakHour?.listens ?? data.peakDay?.listens ?? 0;
  const insight = tm("storyBody", {
    count: insightCount.toLocaleString(locale),
    streams: t("listens"),
  });
  const rhythmLabel = data.peakHour ? t(getRhythmKey(data.peakHour.hour)) : undefined;

  const timelineHref = mergeDashboardSearchParams("/dashboard/timeline", searchParams);
  const heatmapHref = mergeDashboardSearchParams("/dashboard/heatmap", searchParams);

  const selectedShare =
    sheet && totalListens > 0
      ? Math.round(
          ((sheet.kind === "day" ? sheet.day.listens : sheet.part.listens) / totalListens) * 100,
        )
      : 0;

  const signalMetrics = [
    { key: "total", label: tm("railTotal"), value: totalListens.toLocaleString(locale) },
    { key: "peakDay", label: tm("railPeakDay"), value: peakDayLabel },
    { key: "peakHour", label: tm("railPeakHour"), value: peakHourLabel },
  ];

  return (
    <div className={MOBILE_CANVAS}>
      <TemporalMobileHero
        heading={heading}
        insight={insight}
        rhythmLabel={rhythmLabel}
        peakHour={data.peakHour?.hour}
        badge={tm("allTimeBadge")}
      />

      <section aria-label={tm("signalsLabel")}>
        <p className="mb-2 text-[13px] font-medium text-muted">{tm("signalsLabel")}</p>
        <div className={`${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}>
          {signalMetrics.map((metric) => (
            <div key={metric.key} className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}>
              <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
              <span className={`${DASHBOARD_METRIC_VALUE} truncate`}>{metric.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <TemporalSegmentControl value={segment} onChange={setSegment} />

        <div
          role="tabpanel"
          id="temporal-mobile-panel-days"
          aria-labelledby="temporal-mobile-tab-days"
          hidden={segment !== "days"}
        >
          <div className="space-y-0">
            {dayRows.map((row) => (
              <MetricRow
                key={row.day.dayOfWeek}
                label={row.name}
                listens={row.day.listens}
                percent={(row.day.listens / maxDayListens) * 100}
                locale={locale}
                ariaLabel={tm("openDay", { day: row.name })}
                onOpen={() => setSheet({ kind: "day", day: row.day, name: row.name })}
              />
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          id="temporal-mobile-panel-hours"
          aria-labelledby="temporal-mobile-tab-hours"
          hidden={segment !== "hours"}
        >
          <div className="space-y-0">
            {dayParts.map((part) => {
              const label = tm(`dayParts.${part.id}`);
              return (
                <MetricRow
                  key={part.id}
                  label={label}
                  listens={part.listens}
                  percent={(part.listens / maxPartListens) * 100}
                  locale={locale}
                  ariaLabel={tm("openHours", { part: label })}
                  onOpen={() => setSheet({ kind: "part", part, label })}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-0">
        <DestinationRow
          href={timelineHref}
          title={tm("timelineRowTitle")}
          lead={tm("timelineRowLead")}
          icon={<PulseIcon className="h-5 w-5" />}
        />
        <DestinationRow
          href={heatmapHref}
          title={tm("heatmapRowTitle")}
          lead={tm("heatmapRowLead")}
          icon={<HeatmapIcon className="h-5 w-5" />}
        />
      </section>

      <MobileBottomSheet
        open={sheet != null}
        onClose={() => setSheet(null)}
        ariaLabelledBy="temporal-mobile-sheet-title"
        insetAboveBottomNav
      >
        {sheet ? (
          <div className="px-4 pb-8 pt-1">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="temporal-mobile-sheet-title"
                  className="text-lg font-semibold tracking-tight text-foreground"
                >
                  {sheet.kind === "day" ? sheet.name : sheet.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSheet(null)}
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
                aria-label={tm("sheetCloseAria")}
              >
                {tCommon("close")}
              </button>
            </div>
            <dl className="space-y-0">
              <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}>
                <dt className="text-sm text-muted">{t("listens")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {(sheet.kind === "day" ? sheet.day.listens : sheet.part.listens).toLocaleString(
                    locale,
                  )}
                </dd>
              </div>
              {sheet.kind === "day" ? (
                <>
                  <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}>
                    <dt className="text-sm text-muted">{t("tracks")}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">
                      {sheet.day.uniqueTracks.toLocaleString(locale)}
                    </dd>
                  </div>
                  <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}>
                    <dt className="text-sm text-muted">{t("artists")}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">
                      {sheet.day.uniqueArtists.toLocaleString(locale)}
                    </dd>
                  </div>
                </>
              ) : null}
              <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}>
                <dt className="text-sm text-muted">{t("heroStatTotal")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {tm("shareOfTotal", { percent: selectedShare })}
                </dd>
              </div>
            </dl>
            {sheet.kind === "part" ? (
              <ul className="mt-4 space-y-0">
                {sheet.part.hours.map((hour) => (
                  <li
                    key={hour.hour}
                    className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {formatHourForDisplay(hour.hour, locale)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {hour.listens.toLocaleString(locale)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </MobileBottomSheet>
    </div>
  );
}
