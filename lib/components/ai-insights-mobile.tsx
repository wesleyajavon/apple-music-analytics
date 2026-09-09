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
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import type { AiInsightMoment, AiUnavailableReason } from "@/lib/dto/ai-insights";

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

function MomentArtistAvatar({ moment }: { moment: AiInsightMoment }) {
  if (!moment.artistId || !moment.artistName) return null;
  return (
    <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-full">
      <ArtistAvatarHydrated
        artistId={moment.artistId}
        artistName={moment.artistName}
        imageUrl={moment.imageUrl}
        avatarApiSize={80}
        alt=""
        width={40}
        height={40}
        className="h-full w-full object-cover"
      />
    </div>
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
      <MomentArtistAvatar moment={moment} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t(`kinds.${moment.kind}`)}
        </span>
        {moment.title ? (
          <span className="mt-0.5 block text-sm font-semibold tracking-tight text-foreground">{moment.title}</span>
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
      </MobileMasthead>
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
  endDate: _endDate,
  insights,
  locale: _locale,
  moments,
  onOpenArtist,
  startDate: _startDate,
  withFilters,
}: {
  askHref: string;
  endDate?: string;
  insights: string[];
  locale: string;
  moments?: AiInsightMoment[];
  onOpenArtist?: (moment: AiInsightMoment) => void;
  startDate?: string;
  withFilters?: (href: string) => string;
}) {
  const t = useTranslations("ai-insights");
  const typedMoments = moments && moments.length > 0 ? moments : null;
  const featuredMoment = typedMoments?.[0];
  const featured = featuredMoment?.body ?? insights[0];
  const restMoments = typedMoments?.slice(1) ?? [];
  const rest = typedMoments ? [] : insights.slice(1);
  const resolveHref = withFilters ?? ((href: string) => href);

  return (
    <div className={MOBILE_CANVAS}>
      <MobileMasthead heading={t("title")}>
        {featuredMoment ? (
          featuredMoment.artistId && onOpenArtist ? (
            <button type="button" onClick={() => onOpenArtist(featuredMoment)} className="mt-4 flex w-full gap-3 text-left">
              <MomentArtistAvatar moment={featuredMoment} />
              <span className="min-w-0 flex-1 space-y-2">
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
              </span>
            </button>
          ) : (
            <Link href={resolveHref(featuredMoment.href)} className="mt-4 flex gap-3">
              <MomentArtistAvatar moment={featuredMoment} />
              <span className="min-w-0 flex-1 space-y-2">
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
              </span>
            </Link>
          )
        ) : featured ? (
          <blockquote className="mt-4 text-base font-semibold leading-6 tracking-tight text-foreground">
            {featured}
          </blockquote>
        ) : null}
      </MobileMasthead>

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
