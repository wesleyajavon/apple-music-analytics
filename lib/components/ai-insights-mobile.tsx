"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";
import {
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import type { AiInsightMoment, AiInsightsStyle, AiUnavailableReason } from "@/lib/dto/ai-insights";

const MOBILE_CANVAS = "space-y-8 pb-8 lg:hidden";

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.75c0 5.385 4.365 9.75 9.75 9.75s9.75-4.365 9.75-9.75S17.385 2.25 12 2.25 2.25 6.615 2.25 12m13.5 0a1.125 1.125 0 0 1-1.125 1.125H9.75a1.125 1.125 0 0 1-1.125-1.125v-6.75m9 0V9.375"
      />
    </svg>
  );
}

function MobileStyleToggle({
  insightStyle,
  onStyleChange,
}: {
  insightStyle: AiInsightsStyle;
  onStyleChange: (style: AiInsightsStyle) => void;
}) {
  const t = useTranslations("ai-insights");

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={t("styleToggle.ariaLabel")}>
      <span className="text-[13px] font-medium text-muted">{t("styleToggle.label")}</span>
      <div className={`${DASHBOARD_SEGMENTED_TRACK} w-full`}>
        {(["human", "technical"] as const).map((style) => {
          const isActive = insightStyle === style;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStyleChange(style)}
              className={`flex-1 ${isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}`}
            >
              {t(`styleToggle.${style}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AskDestinationRow({ href }: { href: string }) {
  const t = useTranslations("ai-insights");

  return (
    <Link
      href={href}
      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_ROW_INTERACTIVE} ${DASHBOARD_LIST_SEPARATOR} no-underline text-foreground`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-foreground">
        <ChatIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{t("ctaAskSoundprint")}</span>
        <span className="mt-0.5 block truncate text-[13px] leading-5 text-muted">{t("mobile.askLead")}</span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

function InsightRow({ index, text }: { index: number; text: string }) {
  return (
    <article className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} items-start`}>
      <span className="mt-0.5 w-6 shrink-0 text-center text-[13px] font-semibold tabular-nums text-muted">
        {index}
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-5 text-foreground line-clamp-3">{text}</p>
    </article>
  );
}

function MomentRow({
  moment,
  href,
  onOpenArtist,
}: {
  moment: AiInsightMoment;
  href: string;
  onOpenArtist?: (moment: AiInsightMoment) => void;
}) {
  const t = useTranslations("ai-insights");
  const className = `${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_ROW_INTERACTIVE} ${DASHBOARD_LIST_SEPARATOR} items-start w-full text-left`;
  const inner = (
    <>
      <span className="mt-0.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {t(`kinds.${moment.kind}`)}
      </span>
      <span className="min-w-0 flex-1">
        {moment.title ? (
          <span className="block text-sm font-semibold tracking-tight text-foreground">{moment.title}</span>
        ) : null}
        <span className="mt-0.5 block text-[13px] leading-5 text-foreground line-clamp-3">{moment.body}</span>
        {moment.metric ? (
          <span className="mt-1 block text-[13px] font-semibold tabular-nums text-muted">{moment.metric}</span>
        ) : null}
      </span>
      <ChevronIcon className="mt-1 h-4 w-4 shrink-0 text-muted" />
    </>
  );
  if (moment.artistId && onOpenArtist) {
    return (
      <button type="button" onClick={() => onOpenArtist(moment)} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

function MobileMasthead({
  heading,
  description,
  children,
}: {
  heading: string;
  description?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("ai-insights");
  return (
    <OverviewHeroFrame compact title={heading} description={description}>
      <p className="mt-1 text-[13px] font-medium text-muted">{t("mobile.eyebrow")}</p>
      {children}
    </OverviewHeroFrame>
  );
}

export function AiInsightsMobileSkeleton({
  locale: _locale,
  startDate: _startDate,
  endDate: _endDate,
}: {
  locale: string;
  startDate?: string;
  endDate?: string;
}) {
  const t = useTranslations("ai-insights");

  return (
    <div className={MOBILE_CANVAS} aria-busy="true">
      <MobileMasthead heading={t("title")} description={t("mobile.generatingLead")}>
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
        <div className="mt-4 h-11 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
      </MobileMasthead>
      <div className={`${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}>
        {[0, 1, 2].map((item) => (
          <div key={item} className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}>
            <span className="h-3 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <span className="mt-2 h-7 w-12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
      <div className="space-y-0">
        {[0, 1, 2].map((item) => (
          <div key={item} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
            <div className="h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiInsightsMobileEmpty({
  locale,
  startDate,
  endDate,
}: {
  locale: string;
  startDate?: string;
  endDate?: string;
}) {
  const t = useTranslations("ai-insights");
  void locale;
  void startDate;
  void endDate;

  return (
    <DashboardMobileImportEmpty
      eyebrow={t("mobile.eyebrow")}
      title={t("mobile.emptyTitle")}
      lead={t("mobile.emptyLead")}
      demoPath="/dashboard/ai-insights"
      importLabel={t("mobile.emptyCta")}
    />
  );
}

export function AiInsightsMobileQuota({
  error,
  locale: _locale,
  startDate: _startDate,
  endDate: _endDate,
}: {
  error: Error;
  locale: string;
  startDate?: string;
  endDate?: string;
}) {
  const t = useTranslations("ai-insights");

  return (
    <div className={MOBILE_CANVAS}>
      <MobileMasthead heading={t("title")} description={t("mobile.quotaLead")}>
        <div className="mt-4">
          <GroqQuotaNotice error={error} />
        </div>
      </MobileMasthead>
    </div>
  );
}

export function AiInsightsMobileUnavailable({
  locale: _locale,
  reason,
  startDate: _startDate,
  endDate: _endDate,
}: {
  locale: string;
  reason?: AiUnavailableReason;
  startDate?: string;
  endDate?: string;
}) {
  const t = useTranslations("ai-insights");
  const copyReason = reason ?? "consent";

  return (
    <div className={MOBILE_CANVAS}>
      <MobileMasthead heading={t("title")} description={t("mobile.unavailableLead")}>
        <div className="mt-4">
          <AiUnavailableCta reason={copyReason} />
        </div>
      </MobileMasthead>
    </div>
  );
}

export function AiInsightsMobileBackfill({
  locale: _locale,
  startDate: _startDate,
  endDate: _endDate,
  force = false,
}: {
  locale: string;
  startDate?: string;
  endDate?: string;
  force?: boolean;
}) {
  const t = useTranslations("ai-insights");

  return (
    <div className={MOBILE_CANVAS}>
      <MobileMasthead heading={t("title")} />
      <InteractiveAiGenreBackfillNotice force={force} />
    </div>
  );
}

export function AiInsightsMobileError({
  locale: _locale,
  startDate: _startDate,
  endDate: _endDate,
  onRetry,
}: {
  locale: string;
  startDate?: string;
  endDate?: string;
  onRetry: () => void;
}) {
  const t = useTranslations("ai-insights");
  const tCommon = useTranslations("common");

  return (
    <div className={MOBILE_CANVAS}>
      <MobileMasthead heading={t("title")} description={t("mobile.errorLead")}>
        <button type="button" onClick={onRetry} className={`${DASHBOARD_BTN_OUTLINE} mt-4 w-full`}>
          {tCommon("retry")}
        </button>
      </MobileMasthead>
    </div>
  );
}

export function AiInsightsMobileExperience({
  askHref,
  cached,
  endDate: _endDate,
  insightStyle,
  insights,
  locale: _locale,
  moments,
  onOpenArtist,
  onStyleChange,
  rateLimitRemaining,
  startDate: _startDate,
  withFilters,
}: {
  askHref: string;
  cached: boolean;
  endDate?: string;
  insightStyle: AiInsightsStyle;
  insights: string[];
  locale: string;
  moments?: AiInsightMoment[];
  onOpenArtist?: (moment: AiInsightMoment) => void;
  onStyleChange: (style: AiInsightsStyle) => void;
  rateLimitRemaining?: number;
  startDate?: string;
  withFilters?: (href: string) => string;
}) {
  const t = useTranslations("ai-insights");
  const typedMoments = moments && moments.length > 0 ? moments : null;
  const featuredMoment = typedMoments?.[0];
  const featured = featuredMoment?.body ?? insights[0];
  const restMoments = typedMoments?.slice(1) ?? [];
  const rest = typedMoments ? [] : insights.slice(1);
  const statusText =
    typeof rateLimitRemaining === "number"
      ? t("quotaRemaining", { count: rateLimitRemaining })
      : cached
        ? t("cached")
        : t("heroFresh");
  const resolveHref = withFilters ?? ((href: string) => href);

  return (
    <div className={MOBILE_CANVAS}>
      <MobileMasthead heading={t("title")}>
        {featuredMoment ? (
          featuredMoment.artistId && onOpenArtist ? (
            <button type="button" onClick={() => onOpenArtist(featuredMoment)} className="mt-4 block w-full space-y-2 text-left">
              <p className="text-[13px] font-medium text-muted">
                {t(`kinds.${featuredMoment.kind}`)}
                {featuredMoment.metric ? ` · ${featuredMoment.metric}` : ""}
              </p>
              <blockquote className="text-base font-semibold leading-6 tracking-tight text-foreground">
                {featuredMoment.title || featuredMoment.body}
              </blockquote>
              {featuredMoment.title ? (
                <p className="text-[13px] leading-5 text-muted">{featuredMoment.body}</p>
              ) : null}
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground">
                {t("openMoment")}
                <ChevronIcon className="h-3.5 w-3.5" />
              </span>
            </button>
          ) : (
            <Link href={resolveHref(featuredMoment.href)} className="mt-4 block space-y-2">
              <p className="text-[13px] font-medium text-muted">
                {t(`kinds.${featuredMoment.kind}`)}
                {featuredMoment.metric ? ` · ${featuredMoment.metric}` : ""}
              </p>
              <blockquote className="text-base font-semibold leading-6 tracking-tight text-foreground">
                {featuredMoment.title || featuredMoment.body}
              </blockquote>
              {featuredMoment.title ? (
                <p className="text-[13px] leading-5 text-muted">{featuredMoment.body}</p>
              ) : null}
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground">
                {t("openMoment")}
                <ChevronIcon className="h-3.5 w-3.5" />
              </span>
            </Link>
          )
        ) : featured ? (
          <blockquote className="mt-4 text-base font-semibold leading-6 tracking-tight text-foreground">
            {featured}
          </blockquote>
        ) : null}
        <div className="mt-5">
          <MobileStyleToggle insightStyle={insightStyle} onStyleChange={onStyleChange} />
        </div>
      </MobileMasthead>

      <section aria-label={t("mobile.railLabel")}>
        <p className={DASHBOARD_SECTION_EYEBROW}>{t("mobile.railLabel")}</p>
        <div className={`mt-3 ${DASHBOARD_METRIC_STRIP} w-full flex-nowrap overflow-x-auto`}>
          <div className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}>
            <span className={DASHBOARD_METRIC_LABEL}>{t("mobile.railCount")}</span>
            <span className={DASHBOARD_METRIC_VALUE}>{String((typedMoments ?? insights).length)}</span>
          </div>
          <div className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}>
            <span className={DASHBOARD_METRIC_LABEL}>{t("mobile.railTone")}</span>
            <span className={DASHBOARD_METRIC_VALUE}>{t(`styleToggle.${insightStyle}`)}</span>
          </div>
          <div className={`${DASHBOARD_METRIC_CELL} min-w-[10.5rem] flex-none`}>
            <span className={DASHBOARD_METRIC_LABEL}>{t("mobile.railStatus")}</span>
            <span className={`${DASHBOARD_METRIC_VALUE} text-base`}>{statusText}</span>
          </div>
        </div>
      </section>

      {restMoments.length > 0 ? (
        <section>
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("mobile.moreTitle")}</p>
          <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1 sr-only`}>{t("mobile.moreTitle")}</h2>
          <div className="mt-4">
            {restMoments.map((moment) => (
              <MomentRow
                key={moment.id}
                moment={moment}
                href={resolveHref(moment.href)}
                onOpenArtist={onOpenArtist}
              />
            ))}
          </div>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section>
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("mobile.moreTitle")}</p>
          <div className="mt-4">
            {rest.map((insight, index) => (
              <InsightRow key={index} index={index + 2} text={insight} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <AskDestinationRow href={askHref} />
      </section>
    </div>
  );
}
