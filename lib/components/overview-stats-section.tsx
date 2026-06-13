"use client";

import { memo, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock3, Disc3, Headphones, Users } from "lucide-react";

const STATS_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#08060a] via-[#100c12] to-[#0a080e] text-white shadow-2xl shadow-black/50 ring-1 ring-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/60";

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

function formatTimeParts(seconds: number): { hours: number; minutes: number } {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { hours, minutes };
}

function buildPulseHeights(seed: number, count = 10): number[] {
  const digits = Math.max(1, seed).toString().split("").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const digit = digits[index % digits.length] ?? 5;
    const wave = Math.sin((index + digit) * 0.9) * 0.22;
    return Math.min(1, Math.max(0.18, 0.34 + digit * 0.055 + wave));
  });
}

const ChangeBadge = memo(
  ({ change, vsLabel, compact = false }: { change: ChangeInfo; vsLabel: string; compact?: boolean }) => {
    if (!change) return null;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold tabular-nums ${
          compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
        } ${
          change.isPositive
            ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
            : "border border-rose-300/20 bg-rose-400/10 text-rose-100"
        }`}
      >
        {change.isPositive ? (
          <svg className={compact ? "h-3 w-3" : "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        ) : (
          <svg className={compact ? "h-3 w-3" : "h-4 w-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
        {change.displayValue}%
        {compact ? null : <span className="font-normal text-slate-400">· {vsLabel}</span>}
      </span>
    );
  }
);

ChangeBadge.displayName = "ChangeBadge";

function StatsSurfaceBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(240,64,104,0.14),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(152,80,208,0.12),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(79,144,224,0.08),transparent_36%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-rose/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-accent-violet/10 blur-3xl"
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
    <div className="flex h-24 items-end gap-1.5 sm:h-28 sm:gap-2" aria-hidden>
      {heights.map((height, index) => (
        <div
          key={index}
          className="w-2.5 rounded-full bg-gradient-to-t from-accent-rose/35 via-accent-violet/75 to-accent-cyan/90 sm:w-3"
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </div>
  );
}

function CatalogBreadthPanel({
  artistsLabel,
  tracksLabel,
  breadthLabel,
  breadthHint,
  summary,
  uniqueArtists,
  uniqueTracks,
  artistsChange,
  tracksChange,
  vsLabel,
  locale,
}: {
  artistsLabel: string;
  tracksLabel: string;
  breadthLabel: string;
  breadthHint: string;
  summary: string;
  uniqueArtists: number;
  uniqueTracks: number;
  artistsChange?: ChangeInfo;
  tracksChange?: ChangeInfo;
  vsLabel: string;
  locale: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/35">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-rose/80 via-accent-violet/70 to-accent-cyan/60"
        aria-hidden
      />

      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {breadthLabel}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">{breadthHint}</p>
      </div>

      <div className="grid sm:grid-cols-2">
        <div className="relative overflow-hidden border-b border-white/10 px-5 py-6 sm:border-b-0 sm:border-r sm:px-6 sm:py-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(240,64,104,0.1),transparent_55%)]"
            aria-hidden
          />
          <p
            className="pointer-events-none absolute -right-2 top-2 select-none text-[5.5rem] font-semibold leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[6.5rem]"
            aria-hidden
          >
            {uniqueArtists.toLocaleString(locale)}
          </p>
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-rose-100">
                <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{artistsLabel}</p>
            </div>
            <p className="mt-5 text-4xl font-semibold tabular-nums tracking-[-0.06em] text-white sm:text-5xl">
              {uniqueArtists.toLocaleString(locale)}
            </p>
            {artistsChange ? (
              <div className="mt-4">
                <ChangeBadge change={artistsChange} vsLabel={vsLabel} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative overflow-hidden px-5 py-6 sm:px-6 sm:py-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_50%,rgba(79,144,224,0.1),transparent_55%)]"
            aria-hidden
          />
          <p
            className="pointer-events-none absolute -right-2 top-2 select-none text-[5.5rem] font-semibold leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[6.5rem]"
            aria-hidden
          >
            {uniqueTracks.toLocaleString(locale)}
          </p>
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-cyan-100">
                <Disc3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{tracksLabel}</p>
            </div>
            <p className="mt-5 text-4xl font-semibold tabular-nums tracking-[-0.06em] text-white sm:text-5xl">
              {uniqueTracks.toLocaleString(locale)}
            </p>
            {tracksChange ? (
              <div className="mt-4">
                <ChangeBadge change={tracksChange} vsLabel={vsLabel} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/20 px-5 py-4 sm:px-6">
        <p className="text-sm leading-7 text-slate-300">{summary}</p>
      </div>
    </div>
  );
}

function ListeningTimePanel({
  sectionLabel,
  hoursLabel,
  minutesLabel,
  hint,
  summary,
  totalPlayTime,
  notAvailable,
  change,
  vsLabel,
  locale,
}: {
  sectionLabel: string;
  hoursLabel: string;
  minutesLabel: string;
  hint: string;
  summary: string;
  totalPlayTime: number;
  notAvailable: string;
  change?: ChangeInfo;
  vsLabel: string;
  locale: string;
}) {
  const { hours, minutes } = formatTimeParts(totalPlayTime);
  const hasTime = totalPlayTime > 0;

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/35">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-violet/80 via-accent-cyan/70 to-accent-emerald/60"
        aria-hidden
      />

      <div className="border-b border-white/10 px-5 py-5 sm:px-6">
        <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {sectionLabel}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">{hint}</p>
      </div>

      {hasTime ? (
        <>
          <div className="grid sm:grid-cols-2">
            <div className="relative overflow-hidden border-b border-white/10 px-5 py-6 sm:border-b-0 sm:border-r sm:px-6 sm:py-7">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(152,80,208,0.1),transparent_55%)]"
                aria-hidden
              />
              <p
                className="pointer-events-none absolute -right-2 top-2 select-none text-[5.5rem] font-semibold leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[6.5rem]"
                aria-hidden
              >
                {hours.toLocaleString(locale)}
              </p>
              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-violet-100">
                    <Clock3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {hoursLabel}
                  </p>
                </div>
                <p className="mt-5 text-4xl font-semibold tabular-nums tracking-[-0.06em] text-white sm:text-5xl">
                  {hours.toLocaleString(locale)}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden px-5 py-6 sm:px-6 sm:py-7">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_50%,rgba(79,144,224,0.1),transparent_55%)]"
                aria-hidden
              />
              <p
                className="pointer-events-none absolute -right-2 top-2 select-none text-[5.5rem] font-semibold leading-none tracking-[-0.08em] text-white/[0.04] sm:text-[6.5rem]"
                aria-hidden
              >
                {minutes.toLocaleString(locale)}
              </p>
              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-cyan-100">
                    <Clock3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {minutesLabel}
                  </p>
                </div>
                <p className="mt-5 text-4xl font-semibold tabular-nums tracking-[-0.06em] text-white sm:text-5xl">
                  {minutes.toLocaleString(locale)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/20 px-5 py-4 sm:px-6">
            <p className="text-sm leading-7 text-slate-300">{summary}</p>
            {change ? (
              <div className="mt-3">
                <ChangeBadge change={change} vsLabel={vsLabel} />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="px-5 py-10 text-center sm:px-6">
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-500">{notAvailable}</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">{hint}</p>
        </div>
      )}
    </div>
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
  const timeStr = formatTime(totalPlayTime, t("notAvailable"));
  const pulseHeights = useMemo(() => buildPulseHeights(totalListens), [totalListens]);
  const breadthSummary = t("statsSectionBreadthSummary", {
    artists: uniqueArtists.toLocaleString(locale),
    tracks: uniqueTracks.toLocaleString(locale),
  });
  const timeSummary = t("statsSectionTimeSummary", { duration: timeStr });

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <section className={STATS_SHELL_CLASS} aria-labelledby="overview-stats-heading">
        <StatsSurfaceBg />

        <div className="relative border-b border-white/10 px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t("statsSectionBadge")}
              </p>
              <h2
                id="overview-stats-heading"
                className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl"
              >
                {t("statsSectionTitle")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                {t("statsSectionDescription")}
              </p>
            </div>
            {showComparison ? (
              <p className="max-w-sm shrink-0 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-slate-300">
                {t("statsSectionComparisonNote")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-5 lg:p-8">
          <article className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/35 p-5 sm:p-7">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-accent-rose/80 via-accent-violet/70 to-accent-cyan/60"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-accent-rose/10 blur-3xl"
              aria-hidden
            />

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-rose-100">
                      <Headphones className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {t("stats.totalListens")}
                    </p>
                  </div>
                  <p className="mt-4 text-5xl font-semibold tabular-nums tracking-[-0.06em] text-white sm:text-6xl">
                    {totalListens.toLocaleString(locale)}
                  </p>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
                    {t("statsSectionListensHint")}
                  </p>
                </div>
                <ListeningPulse heights={pulseHeights} />
              </div>

              {changes?.totalListens ? (
                <ChangeBadge change={changes.totalListens} vsLabel={vsLabel} />
              ) : (
                <div aria-hidden />
              )}
            </div>
          </article>

          <div className="grid gap-4">
            <CatalogBreadthPanel
              artistsLabel={t("stats.uniqueArtists")}
              tracksLabel={t("stats.uniqueTracks")}
              breadthLabel={t("statsSectionBreadthLabel")}
              breadthHint={t("statsSectionBreadthHint")}
              summary={breadthSummary}
              uniqueArtists={uniqueArtists}
              uniqueTracks={uniqueTracks}
              artistsChange={changes?.uniqueArtists ?? undefined}
              tracksChange={changes?.uniqueTracks ?? undefined}
              vsLabel={vsLabel}
              locale={locale}
            />

            <ListeningTimePanel
              sectionLabel={t("statsSectionTimeLabel")}
              hoursLabel={t("statsSectionTimeHours")}
              minutesLabel={t("statsSectionTimeMinutes")}
              hint={t("statsSectionTimeHint")}
              summary={timeSummary}
              totalPlayTime={totalPlayTime}
              notAvailable={t("notAvailable")}
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
