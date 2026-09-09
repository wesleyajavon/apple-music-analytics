"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
} from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";

export const TRENDS_MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 pb-8 max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+1rem))] lg:hidden";
/** @deprecated Prefer canvas masthead; kept for any leftover class references */
export const TRENDS_MOBILE_HERO = "text-foreground";
export const TRENDS_MOBILE_SNAP =
  `${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`;

export function TrendsMobileChevron({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function TrendsMobileHero({
  locale: _locale,
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
  return (
    <OverviewHeroFrame title={heading} compact>
      <p className={`${DASHBOARD_SECTION_EYEBROW} mt-2`}>{eyebrow}</p>
      {listenLabel || peakLabel ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          {listenLabel ? <span>{listenLabel}</span> : null}
          {peakLabel ? <span>{peakLabel}</span> : null}
        </div>
      ) : null}
    </OverviewHeroFrame>
  );
}

export function TrendsMobileSignalTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}>
      <span className={DASHBOARD_METRIC_LABEL}>{label}</span>
      <span className={`${DASHBOARD_METRIC_VALUE} truncate`} title={value}>
        {value}
      </span>
      {hint ? <span className="truncate text-[13px] text-muted">{hint}</span> : null}
    </div>
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
    <Link href={href} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">{lead}</span>
      </span>
      <TrendsMobileChevron className="h-4 w-4 shrink-0 text-muted" />
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
      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} w-full text-left`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">{lead}</span>
      </span>
      <TrendsMobileChevron className="h-4 w-4 shrink-0 text-muted" />
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
    <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted">
        {rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-[13px] text-muted">{meta}</span>
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
        className={`${DASHBOARD_BTN_GHOST} min-h-11 min-w-11 shrink-0 px-3`}
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
}: {
  locale: string;
  eyebrow: string;
  title: string;
  lead: string;
  leaderboardHref: string;
  leaderboardTitle: string;
  leaderboardLead: string;
}) {
  return (
    <div className={`${TRENDS_MOBILE_BLEED} px-4 space-y-6`}>
      <TrendsMobileHero locale={locale} eyebrow={eyebrow} heading={title} />
      <p className="text-sm leading-6 text-muted">{lead}</p>
      <div>
        <TrendsMobileDestinationRow
          href={leaderboardHref}
          title={leaderboardTitle}
          lead={leaderboardLead}
        />
      </div>
    </div>
  );
}

export function TrendsMobileError({
  locale,
  eyebrow,
  heading,
  error,
  onRetry,
}: {
  locale: string;
  eyebrow: string;
  heading: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={`${TRENDS_MOBILE_BLEED} px-4 space-y-6`}>
      <TrendsMobileHero locale={locale} eyebrow={eyebrow} heading={heading} />
      {isQuota ? (
        <GroqQuotaNotice error={error} />
      ) : (
        <button type="button" onClick={onRetry} className={DASHBOARD_BTN_GHOST}>
          {tCommon("retry")}
        </button>
      )}
    </div>
  );
}

export function TrendsMobileSkeleton() {
  return (
    <div className={`${TRENDS_MOBILE_BLEED} px-4 space-y-6`} aria-busy="true">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-8 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-4 w-32 animate-pulse rounded bg-black/5 dark:bg-white/5" />
      </div>
      <div className={TRENDS_MOBILE_SNAP}>
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}
          >
            <div className="h-3 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className="h-28 animate-pulse rounded bg-black/5 dark:bg-white/5" />
    </div>
  );
}
