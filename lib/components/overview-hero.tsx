"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OverviewPeriodBadgeButton, OverviewPeriodHint } from "@/lib/components/overview-period-nudge";
import { UserAvatarPhoto } from "@/lib/components/user-avatar";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import {
  DASHBOARD_CINEMATIC_HERO_SHELL,
  DashboardCinematicHeroBg,
} from "@/lib/components/dashboard-ui";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

export const OVERVIEW_MOBILE_HERO_SHELL =
  "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
export const OVERVIEW_DESKTOP_HERO_SHELL = `${DASHBOARD_CINEMATIC_HERO_SHELL} px-5 py-6 sm:px-8 sm:py-9 lg:px-10 lg:py-10`;

const MOBILE_BLEED = "-mx-4 -mt-4 space-y-4 pb-8 lg:hidden";

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
  avatarUrl,
  insight,
  genreName,
  children,
}: {
  title: string;
  avatarUrl?: string | null;
  insight?: OverviewPrimaryInsight;
  genreName?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("overview");

  return (
    <section className={OVERVIEW_MOBILE_HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative flex items-start gap-3.5">
        <UserAvatarPhoto
          src={avatarUrl}
          size="lg"
          className="ring-1 ring-white/15"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {insight?.eyebrow ?? t("mobile.heroEyebrow")}
          </p>
          <h1 className="mt-1 text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {title}
          </h1>
          {insight ? (
            <div className="mt-3">
              <p className="text-3xl font-semibold tabular-nums tracking-[-0.06em] text-white">
                {insight.metric}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white/80" title={insight.title}>
                {insight.title}
              </p>
              {genreName ? (
                <p className="mt-0.5 truncate text-xs text-cyan-100/80" title={genreName}>
                  {t("libraryLeaders.topGenre")} · {genreName}
                </p>
              ) : null}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

export function MobileOverviewLoadingFallback({ title }: { title: string }) {
  return (
    <div className={MOBILE_BLEED}>
      <OverviewMobileHero title={title}>
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-8 w-24 animate-pulse rounded bg-white/20" />
          <div className="h-3 w-10/12 animate-pulse rounded bg-white/10" />
        </div>
      </OverviewMobileHero>
      <section className="px-4">
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 min-w-[9.75rem] animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export function MobileOverviewUnavailable({
  title,
  description,
  avatarUrl,
  children,
}: {
  title: string;
  description?: string;
  avatarUrl?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className={MOBILE_BLEED}>
      <OverviewMobileHero title={title} avatarUrl={avatarUrl}>
        {description ? (
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/62">{description}</p>
        ) : null}
      </OverviewMobileHero>
      {children ? <div className="px-4">{children}</div> : null}
    </div>
  );
}

export function MobileOverviewEmptyView({ avatarUrl }: { avatarUrl?: string | null }) {
  const t = useTranslations("overview.mobile");

  return (
    <div className={MOBILE_BLEED}>
      <section className={OVERVIEW_MOBILE_HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          {avatarUrl ? (
            <UserAvatarPhoto
              src={avatarUrl}
              size="lg"
              className="ring-1 ring-white/15"
            />
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-2 max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
              {t("emptyTitle")}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/62">{t("emptyLead")}</p>
          </div>
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
