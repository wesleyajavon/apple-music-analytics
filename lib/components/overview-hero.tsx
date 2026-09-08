"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { UserAvatarPhoto } from "@/lib/components/user-avatar";
import {
  DashboardCinematicHeroBg,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_VALUE,
} from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

export const OVERVIEW_MOBILE_HERO_SHELL =
  "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
export const OVERVIEW_DESKTOP_HERO_SHELL = "text-foreground";

const MOBILE_BLEED = "-mx-4 -mt-4 space-y-4 pb-8 lg:hidden";

function OverviewPrimaryInsightBlock({ insight }: { insight: OverviewPrimaryInsight }) {
  return (
    <div className="mt-6 max-w-2xl">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={DASHBOARD_METRIC_VALUE}>{insight.metric}</span>
        <span className={DASHBOARD_METRIC_LABEL}>{insight.metricLabel}</span>
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-foreground" title={insight.title}>
        {insight.title}
      </p>
      {insight.subtitle ? (
        <p className="mt-1 truncate text-[13px] text-muted" title={insight.subtitle}>
          {insight.subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function OverviewHeroFrame({
  title,
  description,
  avatarUrl,
  insight,
  children,
}: {
  title: string;
  description?: string;
  avatarUrl?: string | null;
  insight?: OverviewPrimaryInsight;
  children?: ReactNode;
}) {
  const showAvatar = Boolean(avatarUrl);

  return (
    <div className={OVERVIEW_DESKTOP_HERO_SHELL}>
      <div className={showAvatar ? "flex items-start gap-4" : undefined}>
        {showAvatar ? <UserAvatarPhoto src={avatarUrl} size="sm" /> : null}
        <div className="min-w-0 flex-1">
          <h1 className="max-w-4xl text-balance text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{description}</p>
          ) : null}
          {insight ? <OverviewPrimaryInsightBlock insight={insight} /> : null}
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
  error,
  onRetry,
}: {
  title: string;
  description?: string;
  avatarUrl?: string | null;
  error?: Error | null;
  onRetry: () => void;
}) {
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_BLEED}>
      <OverviewMobileHero title={title} avatarUrl={avatarUrl}>
        {description ? (
          <p className="mt-2 max-w-sm text-sm leading-6 text-white/62">{description}</p>
        ) : null}
        {isQuota ? (
          <div className="mt-3">
            <GroqQuotaNotice error={error} />
          </div>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {tCommon("retry")}
          </button>
        )}
      </OverviewMobileHero>
    </div>
  );
}

export function MobileOverviewEmptyView({ avatarUrl }: { avatarUrl?: string | null }) {
  const t = useTranslations("overview.mobile");

  return (
    <DashboardMobileImportEmpty
      eyebrow={t("heroEyebrow")}
      title={t("emptyTitle")}
      lead={t("emptyLead")}
      demoPath="/dashboard/overview"
      importLabel={t("emptyCta")}
      demoLabel={t("emptyDemoCta")}
      header={
        avatarUrl ? (
          <UserAvatarPhoto src={avatarUrl} size="lg" className="ring-1 ring-white/15" />
        ) : undefined
      }
    />
  );
}
