"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";

export const TRENDS_MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 pb-8 max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+1rem))] lg:hidden";
export const TRENDS_MOBILE_HERO = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
export const TRENDS_MOBILE_SNAP =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function TrendsMobileChevron({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function TrendsMobileHero({
  locale,
  eyebrow,
  heading,
  listenLabel,
  peakLabel,
}: {
  locale: string;
  eyebrow: string;
  heading: string;
  listenLabel?: string;
  peakLabel?: string;
}) {
  const { startDate, endDate } = useListenDateRange();

  return (
    <section className={TRENDS_MOBILE_HERO}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {eyebrow}
          </p>
          <MusicalProfilePeriodBadge
            startDate={startDate}
            endDate={endDate}
            locale={locale}
            variant="mobile"
            className="min-w-0"
          />
        </div>
        <h1 className="text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">{heading}</h1>
        {listenLabel || peakLabel ? (
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-white/78">
            {listenLabel ? (
              <span className="rounded-full bg-white/10 px-3 py-1.5">{listenLabel}</span>
            ) : null}
            {peakLabel ? (
              <span className="rounded-full bg-white/10 px-3 py-1.5">{peakLabel}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function TrendsMobileSignalTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      {hint ? <p className="mt-1 text-xs font-medium text-white/55">{hint}</p> : null}
    </article>
  );
}

export function TrendsMobileDestinationRow({
  href,
  title,
  lead,
}: {
  href: string;
  title: string;
  lead: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-gray-950 shadow-sm dark:text-white"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
          {lead}
        </span>
      </span>
      <TrendsMobileChevron className="h-4 w-4 shrink-0 text-gray-400" />
    </Link>
  );
}

export function TrendsMobileActionRow({
  title,
  lead,
  onClick,
}: {
  title: string;
  lead: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left text-gray-950 shadow-sm dark:text-white"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
          {lead}
        </span>
      </span>
      <TrendsMobileChevron className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

export function TrendsMobileLegendRow({
  color,
  rank,
  label,
  meta,
}: {
  color: string;
  rank: number;
  label: string;
  meta: string;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted">{meta}</span>
      </span>
    </div>
  );
}

export function TrendsMobileSheetHeader({
  titleId,
  title,
  onClose,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
}) {
  const tCommon = useTranslations("common");

  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
        aria-label={tCommon("close")}
      >
        {tCommon("close")}
      </button>
    </div>
  );
}

export function TrendsMobileEmpty({
  locale,
  eyebrow,
  title,
  lead,
  leaderboardHref,
  leaderboardTitle,
  leaderboardLead,
  children,
}: {
  locale: string;
  eyebrow: string;
  title: string;
  lead: string;
  leaderboardHref: string;
  leaderboardTitle: string;
  leaderboardLead: string;
  children?: ReactNode;
}) {
  return (
    <div className={TRENDS_MOBILE_BLEED}>
      <TrendsMobileHero locale={locale} eyebrow={eyebrow} heading={title} />
      <p className="px-4 text-sm leading-6 text-muted">{lead}</p>
      <div className="space-y-2 px-4">
        <TrendsMobileDestinationRow
          href={leaderboardHref}
          title={leaderboardTitle}
          lead={leaderboardLead}
        />
      </div>
      {children ? <div className="px-4">{children}</div> : null}
    </div>
  );
}

export function TrendsMobileSkeleton() {
  return (
    <div className={TRENDS_MOBILE_BLEED} aria-busy="true">
      <div className={`${TRENDS_MOBILE_HERO} min-h-[10rem]`}>
        <div className="h-3 w-24 animate-shimmer rounded bg-white/15" />
        <div className="mt-5 h-8 w-48 animate-shimmer rounded bg-white/20" />
        <div className="mt-3 h-4 w-32 animate-shimmer rounded bg-white/10" />
      </div>
      <div className={TRENDS_MOBILE_SNAP}>
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-24 min-w-[9.75rem] animate-shimmer snap-start rounded-3xl border border-card-border bg-card-surface"
          />
        ))}
      </div>
      <div className="mx-4 h-28 animate-shimmer rounded-3xl border border-card-border bg-card-surface" />
    </div>
  );
}
