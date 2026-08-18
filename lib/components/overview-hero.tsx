"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { OverviewPeriodBadgeButton, OverviewPeriodHint } from "@/lib/components/overview-period-nudge";
import { UserAvatarPhoto } from "@/lib/components/user-avatar";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import {
  DASHBOARD_CINEMATIC_HERO_SHELL,
  DashboardCinematicHeroBg,
} from "@/lib/components/dashboard-ui";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

export const OVERVIEW_MOBILE_HERO_SHELL = `${DASHBOARD_CINEMATIC_HERO_SHELL} p-5 sm:p-6`;
export const OVERVIEW_DESKTOP_HERO_SHELL = `${DASHBOARD_CINEMATIC_HERO_SHELL} px-5 py-6 sm:px-8 sm:py-9 lg:px-10 lg:py-10`;

export function OverviewInsightCard({
  insight,
  genreLabel,
  genreName,
  compact = false,
}: {
  insight: OverviewPrimaryInsight;
  genreLabel?: string;
  genreName?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-end justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.07] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {insight.metricLabel}
        </p>
        <p
          className={`mt-1 font-semibold tabular-nums tracking-[-0.06em] ${
            compact ? "text-3xl" : "text-4xl"
          }`}
        >
          {insight.metric}
        </p>
        <p className="mt-2 truncate text-sm font-semibold text-white" title={insight.title}>
          {insight.title}
        </p>
      </div>
      {genreName ? (
        <div className="max-w-[8.5rem] shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {genreLabel}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-cyan-100" title={genreName}>
            {genreName}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function OverviewHeroFrame({
  title,
  description,
  badgeLabel,
  showPeriodHint = false,
  avatarUrl,
  insight,
  genreName,
  children,
}: {
  title: string;
  description: string;
  badgeLabel: string;
  showPeriodHint?: boolean;
  avatarUrl?: string | null;
  insight?: OverviewPrimaryInsight;
  genreName?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("overview");

  return (
    <div className={OVERVIEW_DESKTOP_HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative flex items-start gap-5 sm:gap-6 lg:gap-8">
        <UserAvatarPhoto
          src={avatarUrl}
          size="xl"
          className="ring-2 ring-white/20 shadow-2xl shadow-black/30"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SoundprintBrandMark
              size="sm"
              tone="onDark"
              showAiBadge={false}
              showWordmarkOnMobile={false}
              interactive={false}
            />
            <OverviewPeriodBadgeButton badgeLabel={badgeLabel} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {insight?.eyebrow ?? t("periodBadge")}
          </p>
          <h1 className="mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            {description}
          </p>
          {showPeriodHint ? <OverviewPeriodHint /> : null}
          {insight ? (
            <div className="mt-6 max-w-2xl">
              <OverviewInsightCard
                insight={insight}
                genreLabel={t("libraryLeaders.topGenre")}
                genreName={genreName}
              />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function OverviewMobileHero({
  title,
  description,
  badgeLabel,
  showPeriodHint = false,
  avatarUrl,
  insight,
  genreName,
  children,
}: {
  title: string;
  description?: string;
  badgeLabel: string;
  showPeriodHint?: boolean;
  avatarUrl?: string | null;
  insight?: OverviewPrimaryInsight;
  genreName?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("overview");

  return (
    <section className={OVERVIEW_MOBILE_HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative flex items-start gap-4">
        <UserAvatarPhoto
          src={avatarUrl}
          size="lg"
          className="ring-2 ring-white/20 shadow-xl shadow-black/25"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <SoundprintBrandMark
              size="sm"
              tone="onDark"
              showAiBadge={false}
              showWordmarkOnMobile={false}
              interactive={false}
            />
            <OverviewPeriodBadgeButton badgeLabel={badgeLabel} compact />
          </div>

          <div className="mt-6">
            {insight ? (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {insight.eyebrow}
              </p>
            ) : null}
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.06em]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
            ) : null}
            {showPeriodHint ? <OverviewPeriodHint compact /> : null}
          </div>

          {insight ? (
            <div className="mt-5">
              <OverviewInsightCard
                insight={insight}
                genreLabel={t("libraryLeaders.topGenre")}
                genreName={genreName}
                compact
              />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

export function MobileOverviewLoadingFallback({
  title,
  badgeLabel,
}: {
  title: string;
  badgeLabel: string;
}) {
  return (
    <div className="space-y-5 lg:hidden">
      <OverviewMobileHero title={title} badgeLabel={badgeLabel}>
        <div className="mt-5 space-y-3">
          <div className="h-4 w-11/12 animate-pulse rounded bg-white/15" />
          <div className="h-4 w-8/12 animate-pulse rounded bg-white/10" />
        </div>
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.07] p-4">
          <div className="h-10 w-28 animate-pulse rounded bg-white/20" />
          <div className="mt-3 h-3 w-24 animate-pulse rounded bg-white/10" />
        </div>
      </OverviewMobileHero>
      <div className="-mx-4 flex gap-3 overflow-hidden px-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 min-w-[9.75rem] animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
          />
        ))}
      </div>
    </div>
  );
}

export function MobileOverviewUnavailable({
  title,
  description,
  badgeLabel,
  statusLabel,
  avatarUrl,
  children,
}: {
  title: string;
  description: string;
  badgeLabel: string;
  statusLabel: string;
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5 lg:hidden">
      <OverviewMobileHero
        title={title}
        description={description}
        badgeLabel={badgeLabel}
        avatarUrl={avatarUrl}
      >
        <div className="mt-5 rounded-3xl border border-dashed border-white/25 bg-white/[0.05] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {statusLabel}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">—</p>
        </div>
      </OverviewMobileHero>
      {children}
    </div>
  );
}
