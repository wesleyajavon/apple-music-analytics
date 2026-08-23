"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import type {
  DayOfWeekAggregationDto,
  HourOfDayAggregationDto,
  TemporalAnalysisDto,
} from "@/lib/dto/listening";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import {
  TEMPORAL_DAY_PARTS,
  WEEKDAY_KEYS,
  formatHourForDisplay,
  getClockHandAngle,
  getRhythmKey,
  type TemporalDayPartId,
} from "@/lib/utils/temporal-analysis-display";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 pb-8 max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+1rem))] lg:hidden";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </article>
  );
}

function MiniClock({ hour }: { hour: number }) {
  const angle = getClockHandAngle(hour);
  return (
    <div className="h-[5.5rem] w-[5.5rem] shrink-0 rounded-full bg-blue-400/10 p-1.5 shadow-[0_0_45px_-22px_rgb(96_165_250)]">
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
    <span className="h-1.5 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
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

export function TemporalMobileSkeleton() {
  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-3">
          <div className="ml-auto h-8 w-28 animate-pulse rounded-full bg-white/15" />
          <div className="h-3 w-16 animate-pulse rounded bg-white/15" />
          <div className="h-8 w-52 animate-pulse rounded bg-white/20" />
          <div className="h-3 w-full animate-pulse rounded bg-white/10" />
        </div>
      </section>
      <section className="px-4">
        <div className={SNAP_RAIL}>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 min-w-[9.75rem] snap-start animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
      <section className="space-y-2 px-4">
        <div className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        {[0, 1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </section>
    </div>
  );
}

export function TemporalMobileEmpty() {
  const t = useTranslations("temporal-analysis.mobile");

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

export function TemporalMobileError({ children }: { children?: ReactNode }) {
  const t = useTranslations("temporal-analysis.mobile");

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("eyebrow")}
          </p>
          <h1 className="text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {t("errorLead")}
          </h1>
        </div>
      </section>
      {children ? <div className="px-4">{children}</div> : null}
    </div>
  );
}

function TemporalMobileHero({
  heading,
  insight,
  rhythmLabel,
  peakHour,
}: {
  heading: string;
  insight: string;
  rhythmLabel?: string;
  peakHour?: number;
}) {
  const t = useTranslations("temporal-analysis.mobile");

  return (
    <section className={HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-3">
        <div className="flex justify-end">
          <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90">
            {t("allTimeBadge")}
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          {peakHour != null ? <MiniClock hour={peakHour} /> : null}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
              {t("eyebrow")}
            </p>
            <h1 className="mt-1 text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
              {heading}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-white/80">{insight}</p>
            {rhythmLabel ? (
              <span className="mt-2 inline-flex min-h-8 items-center rounded-full border border-blue-300/25 bg-white/10 px-3 text-xs font-medium text-blue-100">
                {rhythmLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
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
      className="flex w-full items-center rounded-2xl border border-card-border bg-surface p-1"
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
            className={`relative z-10 min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold transition-all duration-200 ${
              isActive ? "bg-brand-gradient text-white shadow-sm" : "text-muted hover:text-foreground"
            }`}
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
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
      onClick={onOpen}
      aria-label={ariaLabel}
    >
      <span className="min-w-0 flex-[1.2] truncate text-sm font-semibold text-foreground">{label}</span>
      <RelativeBar percent={percent} />
      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
        {listens.toLocaleString(locale)}
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
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
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-muted">{lead}</span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
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

  return (
    <div className={MOBILE_BLEED}>
      <TemporalMobileHero
        heading={heading}
        insight={insight}
        rhythmLabel={rhythmLabel}
        peakHour={data.peakHour?.hour}
      />

      <section className="px-4" aria-label={tm("signalsLabel")}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("signalsLabel")}
        </p>
        <div className={SNAP_RAIL}>
          <SignalTile label={tm("railTotal")} value={totalListens.toLocaleString(locale)} />
          <SignalTile label={tm("railPeakDay")} value={peakDayLabel} />
          <SignalTile label={tm("railPeakHour")} value={peakHourLabel} />
        </div>
      </section>

      <section className="space-y-2 px-4">
        <TemporalSegmentControl value={segment} onChange={setSegment} />

        <div
          role="tabpanel"
          id="temporal-mobile-panel-days"
          aria-labelledby="temporal-mobile-tab-days"
          hidden={segment !== "days"}
        >
          <div className="space-y-2">
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
          <div className="space-y-2">
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

      <section className="space-y-2 px-4">
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
            <dl className="space-y-2">
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
                <dt className="text-sm text-muted">{t("listens")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {(sheet.kind === "day" ? sheet.day.listens : sheet.part.listens).toLocaleString(
                    locale,
                  )}
                </dd>
              </div>
              {sheet.kind === "day" ? (
                <>
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
                    <dt className="text-sm text-muted">{t("tracks")}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">
                      {sheet.day.uniqueTracks.toLocaleString(locale)}
                    </dd>
                  </div>
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
                    <dt className="text-sm text-muted">{t("artists")}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">
                      {sheet.day.uniqueArtists.toLocaleString(locale)}
                    </dd>
                  </div>
                </>
              ) : null}
              <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
                <dt className="text-sm text-muted">{t("heroStatTotal")}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {tm("shareOfTotal", { percent: selectedShare })}
                </dd>
              </div>
            </dl>
            {sheet.kind === "part" ? (
              <ul className="mt-4 space-y-2">
                {sheet.part.hours.map((hour) => (
                  <li
                    key={hour.hour}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5"
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
