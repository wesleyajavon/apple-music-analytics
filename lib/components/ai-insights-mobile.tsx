"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import type { AiInsightMoment, AiInsightsStyle, AiUnavailableReason } from "@/lib/dto/ai-insights";

const MOBILE_BLEED = "-mx-4 -mt-4 space-y-4 pb-8 lg:hidden";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </article>
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
        {t("styleToggle.label")}
      </span>
      <div className="inline-flex w-full gap-1 rounded-xl border border-white/15 bg-white/10 p-1">
        {(["human", "technical"] as const).map((style) => {
          const isActive = insightStyle === style;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={isActive}
              onClick={() => onStyleChange(style)}
              className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold ${
                isActive ? "bg-white text-gray-950 shadow-sm" : "text-white/70"
              }`}
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
      className="flex min-h-11 items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-gray-950 shadow-lg shadow-black/20"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
        <ChatIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{t("ctaAskSoundprint")}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-gray-600">{t("mobile.askLead")}</span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-500" />
    </Link>
  );
}

function InsightRow({ index, text }: { index: number; text: string }) {
  return (
    <article className="flex min-h-11 items-start gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 shadow-sm">
      <span className="mt-0.5 w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">
        {index}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-5 text-foreground line-clamp-3">{text}</p>
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
  const className =
    "flex min-h-11 items-start gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 shadow-sm";
  const inner = (
    <>
      <span className="mt-0.5 shrink-0 rounded-full bg-gray-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {t(`kinds.${moment.kind}`)}
      </span>
      <span className="min-w-0 flex-1">
        {moment.title ? (
          <span className="block text-sm font-semibold tracking-tight text-foreground">{moment.title}</span>
        ) : null}
        <span className="mt-0.5 block text-sm leading-5 text-foreground line-clamp-3">{moment.body}</span>
        {moment.metric ? (
          <span className="mt-1 block text-xs font-semibold tabular-nums text-muted">{moment.metric}</span>
        ) : null}
      </span>
      <ChevronIcon className="mt-1 h-4 w-4 shrink-0 text-gray-500" />
    </>
  );
  if (moment.artistId && onOpenArtist) {
    return (
      <button type="button" onClick={() => onOpenArtist(moment)} className={`${className} w-full text-left`}>
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

function MobileHeroFrame({
  locale,
  startDate,
  endDate,
  heading,
  children,
}: {
  locale: string;
  startDate?: string;
  endDate?: string;
  heading: string;
  children?: ReactNode;
}) {
  const t = useTranslations("ai-insights");

  return (
    <section className={HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-4">
        <div className="flex justify-end">
          <MusicalProfilePeriodBadge
            startDate={startDate}
            endDate={endDate}
            locale={locale}
            variant="mobile"
            className="min-w-0"
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("mobile.eyebrow")}
          </p>
          <h1 className="mt-1 max-w-[16rem] text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {heading}
          </h1>
        </div>
        {children}
      </div>
    </section>
  );
}

export function AiInsightsMobileSkeleton({
  locale,
  startDate,
  endDate,
}: {
  locale: string;
  startDate?: string;
  endDate?: string;
}) {
  const t = useTranslations("ai-insights");

  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <MobileHeroFrame locale={locale} startDate={startDate} endDate={endDate} heading={t("title")}>
        <p className="text-sm leading-6 text-white/65">{t("mobile.generatingLead")}</p>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded-full bg-white/15" />
          <div className="h-4 w-10/12 animate-pulse rounded-full bg-white/15" />
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/15" />
        </div>
        <div className="h-11 animate-pulse rounded-xl bg-white/15" />
      </MobileHeroFrame>
      <section className="px-4">
        <div className={SNAP_RAIL}>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 min-w-[9.75rem] snap-start animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
      <section className="space-y-2 px-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </section>
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

  return (
    <DashboardMobileImportEmpty
      eyebrow={t("mobile.eyebrow")}
      title={t("mobile.emptyTitle")}
      lead={t("mobile.emptyLead")}
      demoPath="/dashboard/ai-insights"
      importLabel={t("mobile.emptyCta")}
      header={
        <div className="flex justify-end">
          <MusicalProfilePeriodBadge
            startDate={startDate}
            endDate={endDate}
            locale={locale}
            variant="mobile"
            className="min-w-0"
          />
        </div>
      }
    />
  );
}

export function AiInsightsMobileQuota({
  error,
  locale,
  startDate,
  endDate,
}: {
  error: Error;
  locale: string;
  startDate?: string;
  endDate?: string;
}) {
  const t = useTranslations("ai-insights");

  return (
    <div className={MOBILE_BLEED}>
      <MobileHeroFrame locale={locale} startDate={startDate} endDate={endDate} heading={t("title")}>
        <p className="text-sm leading-6 text-white/70">{t("mobile.quotaLead")}</p>
        <GroqQuotaNotice error={error} />
      </MobileHeroFrame>
    </div>
  );
}

export function AiInsightsMobileUnavailable({
  locale,
  reason,
  startDate,
  endDate,
}: {
  locale: string;
  reason?: AiUnavailableReason;
  startDate?: string;
  endDate?: string;
}) {
  const t = useTranslations("ai-insights");
  const copyReason = reason ?? "consent";

  return (
    <div className={MOBILE_BLEED}>
      <MobileHeroFrame locale={locale} startDate={startDate} endDate={endDate} heading={t("title")}>
        <p className="text-sm leading-6 text-white/70">{t("mobile.unavailableLead")}</p>
        <AiUnavailableCta reason={copyReason} tone="onDark" />
      </MobileHeroFrame>
    </div>
  );
}

export function AiInsightsMobileBackfill({
  locale,
  startDate,
  endDate,
  force = false,
}: {
  locale: string;
  startDate?: string;
  endDate?: string;
  force?: boolean;
}) {
  const t = useTranslations("ai-insights");

  return (
    <div className={MOBILE_BLEED}>
      <MobileHeroFrame locale={locale} startDate={startDate} endDate={endDate} heading={t("title")} />
      <div className="px-4">
        <InteractiveAiGenreBackfillNotice force={force} />
      </div>
    </div>
  );
}

export function AiInsightsMobileError({
  locale,
  startDate,
  endDate,
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
    <div className={MOBILE_BLEED}>
      <MobileHeroFrame locale={locale} startDate={startDate} endDate={endDate} heading={t("title")}>
        <p className="text-sm leading-6 text-white/70">{t("mobile.errorLead")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
        >
          {tCommon("retry")}
        </button>
      </MobileHeroFrame>
    </div>
  );
}

export function AiInsightsMobileExperience({
  askHref,
  cached,
  endDate,
  insightStyle,
  insights,
  locale,
  moments,
  onOpenArtist,
  onStyleChange,
  rateLimitRemaining,
  startDate,
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
    <div className={MOBILE_BLEED}>
      <MobileHeroFrame locale={locale} startDate={startDate} endDate={endDate} heading={t("title")}>
        {featuredMoment ? (
          featuredMoment.artistId && onOpenArtist ? (
            <button type="button" onClick={() => onOpenArtist(featuredMoment)} className="block w-full space-y-2 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                {t(`kinds.${featuredMoment.kind}`)}
                {featuredMoment.metric ? ` · ${featuredMoment.metric}` : ""}
              </p>
              <blockquote className="text-base font-semibold leading-6 tracking-tight text-white">
                {featuredMoment.title || featuredMoment.body}
              </blockquote>
              {featuredMoment.title ? (
                <p className="text-sm leading-5 text-white/75">{featuredMoment.body}</p>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/80">
                {t("openMoment")}
                <ChevronIcon className="h-3.5 w-3.5" />
              </span>
            </button>
          ) : (
            <Link href={resolveHref(featuredMoment.href)} className="block space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                {t(`kinds.${featuredMoment.kind}`)}
                {featuredMoment.metric ? ` · ${featuredMoment.metric}` : ""}
              </p>
              <blockquote className="text-base font-semibold leading-6 tracking-tight text-white">
                {featuredMoment.title || featuredMoment.body}
              </blockquote>
              {featuredMoment.title ? (
                <p className="text-sm leading-5 text-white/75">{featuredMoment.body}</p>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/80">
                {t("openMoment")}
                <ChevronIcon className="h-3.5 w-3.5" />
              </span>
            </Link>
          )
        ) : featured ? (
          <blockquote className="text-base font-semibold leading-6 tracking-tight text-white">
            {featured}
          </blockquote>
        ) : null}
        <MobileStyleToggle insightStyle={insightStyle} onStyleChange={onStyleChange} />
      </MobileHeroFrame>

      <section className="px-4" aria-label={t("mobile.railLabel")}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.railLabel")}
        </p>
        <div className={SNAP_RAIL}>
          <SignalTile
            label={t("mobile.railCount")}
            value={String((typedMoments ?? insights).length)}
          />
          <SignalTile label={t("mobile.railTone")} value={t(`styleToggle.${insightStyle}`)} />
          <SignalTile label={t("mobile.railStatus")} value={statusText} />
        </div>
      </section>

      {restMoments.length > 0 ? (
        <section className="space-y-2 px-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {t("mobile.moreTitle")}
          </h2>
          {restMoments.map((moment) => (
            <MomentRow
              key={moment.id}
              moment={moment}
              href={resolveHref(moment.href)}
              onOpenArtist={onOpenArtist}
            />
          ))}
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className="space-y-2 px-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {t("mobile.moreTitle")}
          </h2>
          {rest.map((insight, index) => (
            <InsightRow key={index} index={index + 2} text={insight} />
          ))}
        </section>
      ) : null}

      <section className="px-4">
        <AskDestinationRow href={askHref} />
      </section>
    </div>
  );
}
