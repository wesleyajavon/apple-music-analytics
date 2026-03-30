"use client";

import { memo } from "react";
import { useLocale, useTranslations } from "next-intl";

const StatIcons = {
  listens: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
      />
    </svg>
  ),
  artists: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  ),
  tracks: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
      />
    </svg>
  ),
  time: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
} as const;

const ACCENT: Record<
  StatType,
  {
    iconBg: string;
    iconColor: string;
    border: string;
    glow: string;
    orb: string;
  }
> = {
  listens: {
    iconBg: "bg-accent-rose/20",
    iconColor: "text-accent-rose",
    border: "border-accent-rose/25",
    glow: "shadow-[0_0_40px_-12px_rgba(244,63,94,0.35)]",
    orb: "bg-accent-rose/20",
  },
  artists: {
    iconBg: "bg-accent-violet/20",
    iconColor: "text-accent-violet",
    border: "border-accent-violet/25",
    glow: "shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]",
    orb: "bg-accent-violet/20",
  },
  tracks: {
    iconBg: "bg-accent-indigo/20",
    iconColor: "text-accent-indigo",
    border: "border-accent-indigo/25",
    glow: "shadow-[0_0_40px_-12px_rgba(99,102,241,0.35)]",
    orb: "bg-accent-indigo/20",
  },
  time: {
    iconBg: "bg-accent-cyan/20",
    iconColor: "text-accent-cyan",
    border: "border-accent-cyan/25",
    glow: "shadow-[0_0_40px_-12px_rgba(6,182,212,0.35)]",
    orb: "bg-accent-cyan/20",
  },
};

type StatType = keyof typeof StatIcons;

type ChangeInfo = {
  value: number;
  displayValue: string;
  isPositive: boolean;
} | null;

function formatTime(seconds: number, notAvailable: string): string {
  if (seconds <= 0) return notAvailable;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

const StatTile = memo(
  ({
    iconType,
    label,
    value,
    change,
    vsLabel,
    locale,
  }: {
    iconType: StatType;
    label: string;
    value: string | number;
    change?: ChangeInfo;
    vsLabel: string;
    locale: string;
  }) => {
    const a = ACCENT[iconType];
    return (
      <div
        className={`
          group relative flex min-h-[180px] flex-col overflow-hidden rounded-2xl border bg-card-surface/80 p-6
          backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5
          ${a.border} ${a.glow} dark:bg-card-surface/90
        `}
      >
        <div
          className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl ${a.orb} opacity-60 dark:opacity-40`}
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${a.iconBg} ${a.iconColor} ring-1 ring-black/5 dark:ring-white/10`}
            >
              {StatIcons[iconType]}
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {typeof value === "number" ? value.toLocaleString(locale) : value}
          </p>
          {change ? (
            <div className="mt-auto pt-4">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ${
                  change.isPositive
                    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                }`}
              >
                {change.isPositive ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {change.displayValue}%
                <span className="font-normal text-gray-600 dark:text-gray-400">· {vsLabel}</span>
              </span>
            </div>
          ) : (
            <div className="mt-auto pt-4" aria-hidden />
          )}
        </div>
      </div>
    );
  }
);

StatTile.displayName = "StatTile";

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
  const timeStr = formatTime(totalPlayTime, t("notAvailable"));

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <section
        className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/15 bg-card-surface shadow-xl ring-1 ring-emerald-500/10 dark:border-emerald-500/20 dark:shadow-none dark:ring-emerald-500/15"
        aria-labelledby="overview-stats-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 100% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 0% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative border-b border-gray-100/80 px-6 py-6 dark:border-gray-700/50 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
                {t("statsSectionBadge")}
              </div>
              <h2
                id="overview-stats-heading"
                className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl"
              >
                {t("statsSectionTitle")}
              </h2>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-400">{t("statsSectionDescription")}</p>
            </div>
            {showComparison ? (
              <p className="max-w-sm shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm leading-relaxed text-gray-600 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-gray-300">
                {t("statsSectionComparisonNote")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
            <StatTile
              iconType="listens"
              label={t("stats.totalListens")}
              value={totalListens}
              change={changes?.totalListens ?? undefined}
              vsLabel={vsLabel}
              locale={locale}
            />
            <StatTile
              iconType="artists"
              label={t("stats.uniqueArtists")}
              value={uniqueArtists}
              change={changes?.uniqueArtists ?? undefined}
              vsLabel={vsLabel}
              locale={locale}
            />
            <StatTile
              iconType="tracks"
              label={t("stats.uniqueTracks")}
              value={uniqueTracks}
              change={changes?.uniqueTracks ?? undefined}
              vsLabel={vsLabel}
              locale={locale}
            />
            <StatTile
              iconType="time"
              label={t("stats.totalTime")}
              value={timeStr}
              change={changes?.totalPlayTime ?? undefined}
              vsLabel={vsLabel}
              locale={locale}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
