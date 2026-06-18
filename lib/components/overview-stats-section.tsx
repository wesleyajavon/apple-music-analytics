"use client";

import { memo, useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3, Disc3, Headphones, Users } from "lucide-react";
import { LiveStatusDot } from "@/lib/components/live-status-dot";

const STATS_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/40 ring-1 ring-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/55";

type ChangeInfo = {
  value: number;
  displayValue: string;
  isPositive: boolean;
} | null;

type MetricAccent = {
  badge: string;
  border: string;
  glow: string;
  gradient: string;
  icon: string;
  line: string;
  liveDot: "emerald" | "cyan" | "violet" | "pink";
};

const METRIC_ACCENTS = {
  listens: {
    badge: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    border: "border-rose-300/15",
    glow: "bg-rose-400/15",
    gradient:
      "bg-[radial-gradient(circle_at_0%_0%,rgba(244,114,182,0.22),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(103,232,249,0.14),transparent_34%)]",
    icon: "text-rose-100",
    line: "via-rose-300/55",
    liveDot: "pink",
  },
  artists: {
    badge: "border-violet-300/25 bg-violet-300/10 text-violet-100",
    border: "border-violet-300/15",
    glow: "bg-violet-400/15",
    gradient:
      "bg-[radial-gradient(circle_at_0%_0%,rgba(167,139,250,0.22),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(79,144,224,0.12),transparent_34%)]",
    icon: "text-violet-100",
    line: "via-violet-300/55",
    liveDot: "violet",
  },
  tracks: {
    badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    border: "border-cyan-300/15",
    glow: "bg-cyan-400/15",
    gradient:
      "bg-[radial-gradient(circle_at_0%_0%,rgba(103,232,249,0.22),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(52,211,153,0.12),transparent_34%)]",
    icon: "text-cyan-100",
    line: "via-cyan-300/55",
    liveDot: "cyan",
  },
  time: {
    badge: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    border: "border-emerald-300/15",
    glow: "bg-emerald-400/15",
    gradient:
      "bg-[radial-gradient(circle_at_0%_0%,rgba(52,211,153,0.20),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(152,80,208,0.12),transparent_34%)]",
    icon: "text-emerald-100",
    line: "via-emerald-300/55",
    liveDot: "emerald",
  },
} satisfies Record<string, MetricAccent>;

function formatTime(seconds: number, notAvailable: string): string {
  if (seconds <= 0) return notAvailable;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function formatTimeParts(seconds: number): { hours: number; minutes: number } {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { hours, minutes };
}

function buildPulseHeights(seed: number, count = 12): number[] {
  const digits = Math.max(1, seed).toString().split("").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const digit = digits[index % digits.length] ?? 5;
    const wave = Math.sin((index + digit) * 0.9) * 0.22;
    return Math.min(1, Math.max(0.16, 0.32 + digit * 0.055 + wave));
  });
}

const ChangeBadge = memo(
  ({ change, vsLabel, compact = false }: { change: ChangeInfo; vsLabel: string; compact?: boolean }) => {
    if (!change) return null;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums ${
          compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-xs"
        } ${
          change.isPositive
            ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
            : "border border-rose-300/20 bg-rose-400/10 text-rose-100"
        }`}
      >
        {change.isPositive ? (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        ) : (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
        {change.isPositive ? "+" : "-"}
        {change.displayValue}%
        {!compact ? <span className="font-normal text-slate-500">· {vsLabel}</span> : null}
      </span>
    );
  },
);

ChangeBadge.displayName = "ChangeBadge";

function StatsSurfaceBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_6%_0%,rgba(240,64,104,0.16),transparent_32%),radial-gradient(circle_at_94%_8%,rgba(152,80,208,0.14),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(79,144,224,0.10),transparent_36%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent-rose/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-8 h-64 w-64 rounded-full bg-accent-violet/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden
      />
    </>
  );
}

function ListeningPulse({ heights }: { heights: number[] }) {
  return (
    <div className="flex h-20 items-end gap-1 sm:h-24 sm:gap-1.5" aria-hidden>
      {heights.map((height, index) => (
        <div
          key={index}
          className="w-2 flex-1 rounded-full bg-gradient-to-t from-accent-rose/30 via-accent-violet/70 to-accent-cyan/90 sm:w-2.5"
          style={{
            height: `${height * 100}%`,
            animationDelay: `${index * 70}ms`,
          }}
        />
      ))}
    </div>
  );
}

function MetricTile({
  accent,
  icon,
  label,
  value,
  hint,
  change,
  vsLabel,
  ghostValue,
  className = "",
}: {
  accent: MetricAccent;
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  change?: ChangeInfo;
  vsLabel: string;
  ghostValue?: string;
  className?: string;
}) {
  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border ${accent.border} bg-white/[0.03] ${className}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${accent.gradient}`} aria-hidden />
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full ${accent.glow} blur-2xl`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${accent.line} to-transparent`}
        aria-hidden
      />
      {ghostValue ? (
        <p
          className="pointer-events-none absolute -right-1 top-1 select-none text-[4.5rem] font-semibold leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[5.5rem]"
          aria-hidden
        >
          {ghostValue}
        </p>
      ) : null}

      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] ${accent.icon}`}
          >
            {icon}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        </div>

        <p className="mt-5 text-4xl font-semibold tabular-nums tracking-[-0.06em] text-white sm:text-[2.75rem]">
          {value}
        </p>

        <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{hint}</p>

        {change ? (
          <div className="mt-4">
            <ChangeBadge change={change} vsLabel={vsLabel} compact />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ListensHeroTile({
  label,
  hint,
  value,
  ghostValue,
  change,
  vsLabel,
  pulseHeights,
}: {
  label: string;
  hint: string;
  value: string;
  ghostValue: string;
  change?: ChangeInfo;
  vsLabel: string;
  pulseHeights: number[];
}) {
  const accent = METRIC_ACCENTS.listens;

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border ${accent.border} bg-white/[0.03] lg:col-span-7`}
    >
      <div className={`pointer-events-none absolute inset-0 ${accent.gradient}`} aria-hidden />
      <div
        className={`pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full ${accent.glow} blur-3xl`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${accent.line} to-transparent`}
        aria-hidden
      />
      <p
        className="pointer-events-none absolute right-4 top-2 select-none text-[6rem] font-semibold leading-none tracking-[-0.08em] text-white/[0.035] sm:text-[7.5rem]"
        aria-hidden
      >
        {ghostValue}
      </p>

      <div className="relative flex flex-1 flex-col p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] ${accent.icon}`}
              >
                <Headphones className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
            </div>
            <p className="mt-5 text-5xl font-semibold tabular-nums tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
              {value}
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">{hint}</p>
            {change ? (
              <div className="mt-5">
                <ChangeBadge change={change} vsLabel={vsLabel} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-4 backdrop-blur-sm">
            <ListeningPulse heights={pulseHeights} />
          </div>
        </div>
      </div>
    </article>
  );
}

function TimeHeroTile({
  sectionLabel,
  hint,
  hoursLabel,
  minutesLabel,
  totalPlayTime,
  notAvailable,
  change,
  vsLabel,
  locale,
}: {
  sectionLabel: string;
  hint: string;
  hoursLabel: string;
  minutesLabel: string;
  totalPlayTime: number;
  notAvailable: string;
  change?: ChangeInfo;
  vsLabel: string;
  locale: string;
}) {
  const accent = METRIC_ACCENTS.time;
  const { hours, minutes } = formatTimeParts(totalPlayTime);
  const hasTime = totalPlayTime > 0;
  const durationLabel = formatTime(totalPlayTime, notAvailable);

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border ${accent.border} bg-white/[0.03] lg:col-span-5`}
    >
      <div className={`pointer-events-none absolute inset-0 ${accent.gradient}`} aria-hidden />
      <div
        className={`pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full ${accent.glow} blur-3xl`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${accent.line} to-transparent`}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] ${accent.icon}`}
          >
            <Clock3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{sectionLabel}</p>
        </div>

        {hasTime ? (
          <>
            <p className="mt-5 text-4xl font-semibold tabular-nums tracking-[-0.06em] text-white sm:text-5xl">
              {durationLabel}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{hoursLabel}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.05em] text-white">
                  {hours.toLocaleString(locale)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{minutesLabel}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.05em] text-white">
                  {minutes.toLocaleString(locale)}
                </p>
              </div>
            </div>
            <p className="mt-4 flex-1 text-sm leading-6 text-slate-400">{hint}</p>
            {change ? (
              <div className="mt-4">
                <ChangeBadge change={change} vsLabel={vsLabel} compact />
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-center py-6 text-center">
            <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-500">{notAvailable}</p>
            <p className="mt-3 text-sm leading-6 text-slate-500">{hint}</p>
          </div>
        )}
      </div>
    </article>
  );
}

export type OverviewStatsChanges = {
  totalListens: ChangeInfo;
  uniqueArtists: ChangeInfo;
  uniqueTracks: ChangeInfo;
  totalPlayTime: ChangeInfo;
} | null;

type OverviewStatsSectionProps = {
  totalListens: number;
  uniqueArtists: number;
  uniqueTracks: number;
  totalPlayTime: number;
  changes: OverviewStatsChanges;
  showComparison: boolean;
};

export function OverviewStatsSection({
  totalListens,
  uniqueArtists,
  uniqueTracks,
  totalPlayTime,
  changes,
  showComparison,
}: OverviewStatsSectionProps) {
  const t = useTranslations("overview");
  const locale = useLocale();
  const vsLabel = t("vsPreviousPeriod");
  const pulseHeights = useMemo(() => buildPulseHeights(totalListens), [totalListens]);

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <section className={STATS_SHELL_CLASS} aria-labelledby="overview-stats-heading">
        <StatsSurfaceBg />

        <div className="relative border-b border-white/10 px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 backdrop-blur">
                <LiveStatusDot tone="emerald" />
                {t("statsSectionBadge")}
              </div>
              <h2
                id="overview-stats-heading"
                className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl"
              >
                {t("statsSectionTitle")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                {t("statsSectionDescription")}
              </p>
            </div>
            {showComparison ? (
              <p className="max-w-xs shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-relaxed text-slate-400">
                {t("statsSectionComparisonNote")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative grid gap-4 p-5 sm:p-6 lg:grid-cols-12 lg:gap-5 lg:p-8">
          <ListensHeroTile
            label={t("stats.totalListens")}
            hint={t("statsSectionListensHint")}
            value={totalListens.toLocaleString(locale)}
            ghostValue={totalListens.toLocaleString(locale)}
            change={changes?.totalListens ?? undefined}
            vsLabel={vsLabel}
            pulseHeights={pulseHeights}
          />

          <TimeHeroTile
            sectionLabel={t("statsSectionTimeLabel")}
            hint={t("statsSectionTimeHint")}
            hoursLabel={t("statsSectionTimeHours")}
            minutesLabel={t("statsSectionTimeMinutes")}
            totalPlayTime={totalPlayTime}
            notAvailable={t("notAvailable")}
            change={changes?.totalPlayTime ?? undefined}
            vsLabel={vsLabel}
            locale={locale}
          />

          <MetricTile
            className="lg:col-span-6"
            accent={METRIC_ACCENTS.artists}
            icon={<Users className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            label={t("stats.uniqueArtists")}
            value={uniqueArtists.toLocaleString(locale)}
            hint={t("statsSectionBreadthHint")}
            change={changes?.uniqueArtists ?? undefined}
            vsLabel={vsLabel}
            ghostValue={uniqueArtists.toLocaleString(locale)}
          />

          <MetricTile
            className="lg:col-span-6"
            accent={METRIC_ACCENTS.tracks}
            icon={<Disc3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            label={t("stats.uniqueTracks")}
            value={uniqueTracks.toLocaleString(locale)}
            hint={t("statsSectionBreadthSummary", {
              artists: uniqueArtists.toLocaleString(locale),
              tracks: uniqueTracks.toLocaleString(locale),
            })}
            change={changes?.uniqueTracks ?? undefined}
            vsLabel={vsLabel}
            ghostValue={uniqueTracks.toLocaleString(locale)}
          />
        </div>
      </section>
    </div>
  );
}
