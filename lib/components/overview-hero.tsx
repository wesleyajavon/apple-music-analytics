"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UserAvatar, UserAvatarPhoto } from "@/lib/components/user-avatar";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
} from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { useWaitingForImportDemoHref } from "@/lib/components/waiting-for-import-demo";
import { OverviewStatsSectionSkeleton } from "@/lib/components/skeleton-loaders";
import type { OverviewPrimaryInsight } from "@/lib/utils/overview-page";

export const OVERVIEW_DESKTOP_HERO_SHELL = "text-foreground";

const MOBILE_CANVAS = "space-y-8 pb-8 lg:hidden";

export function OverviewPrimaryInsightBlock({
  insight,
  compact = false,
}: {
  insight: OverviewPrimaryInsight;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "mt-3" : "mt-6"} max-w-2xl`}>
      {insight.eyebrow ? (
        <p className={`${DASHBOARD_SECTION_EYEBROW} mb-2`}>{insight.eyebrow}</p>
      ) : null}
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
  avatarName,
  insight,
  compact = false,
  children,
}: {
  title: string;
  description?: string;
  avatarUrl?: string | null;
  /** When set, always show an avatar (photo or initials). */
  avatarName?: string | null;
  insight?: OverviewPrimaryInsight;
  compact?: boolean;
  children?: ReactNode;
}) {
  const namedAvatar = Boolean(avatarName?.trim());
  const showAvatar = namedAvatar || Boolean(avatarUrl);

  return (
    <div className={OVERVIEW_DESKTOP_HERO_SHELL}>
      <div className={showAvatar ? "flex items-start gap-4" : undefined}>
        {namedAvatar ? (
          <UserAvatar
            name={avatarName}
            src={avatarUrl}
            size={compact ? "md" : "lg"}
            alt=""
          />
        ) : showAvatar ? (
          <UserAvatarPhoto src={avatarUrl} size="sm" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1
            className={
              compact
                ? "max-w-4xl text-balance text-2xl font-semibold tracking-tight text-foreground"
                : "max-w-4xl text-balance text-3xl font-semibold tracking-tight text-foreground lg:text-4xl"
            }
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{description}</p>
          ) : null}
          {insight ? <OverviewPrimaryInsightBlock insight={insight} compact={compact} /> : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function OverviewMobileHero({
  title,
  avatarUrl,
  avatarName,
  insight,
  genreName,
  description,
  children,
}: {
  title: string;
  avatarUrl?: string | null;
  avatarName?: string | null;
  insight?: OverviewPrimaryInsight;
  genreName?: string;
  description?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("overview");
  const resolvedInsight =
    insight && genreName && !insight.subtitle
      ? { ...insight, subtitle: `${t("libraryLeaders.topGenre")} · ${genreName}` }
      : insight;

  return (
    <OverviewHeroFrame
      compact
      title={title}
      description={description}
      avatarUrl={avatarUrl}
      avatarName={avatarName}
      insight={resolvedInsight}
    >
      {children}
    </OverviewHeroFrame>
  );
}

export function MobileOverviewLoadingFallback({ title }: { title: string }) {
  return (
    <div className={MOBILE_CANVAS}>
      <OverviewMobileHero title={title}>
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-8 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-3 w-10/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      </OverviewMobileHero>
      <OverviewStatsSectionSkeleton />
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
    <div className={MOBILE_CANVAS}>
      <OverviewMobileHero title={title} avatarUrl={avatarUrl} description={description}>
        {isQuota ? (
          <div className="mt-4">
            <GroqQuotaNotice error={error} />
          </div>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className={`${DASHBOARD_BTN_OUTLINE} mt-4 w-full`}
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
  const demoHref = useWaitingForImportDemoHref("/dashboard/overview");

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewMobileHero title={t("emptyTitle")} avatarUrl={avatarUrl} description={t("emptyLead")}>
        <div className="mt-6 flex flex-col gap-3">
          <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={`${DASHBOARD_BTN_OUTLINE} w-full`}>
            {t("emptyCta")}
          </Link>
          <Link href={demoHref} className={`${DASHBOARD_BTN_GHOST} w-full`}>
            {t("emptyDemoCta")}
          </Link>
        </div>
      </OverviewMobileHero>
    </div>
  );
}
