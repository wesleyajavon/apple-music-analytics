"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import {
  isGroqDailyQuotaError,
  isGroqGenreClassificationBlockingError,
} from "@/lib/utils/groq-quota-message";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";

function formatCompactNumber(value: number | undefined, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatListeningTime(
  seconds: number | undefined,
  t: ReturnType<typeof useTranslations<"musical-profile">>
): string {
  const safeSeconds = Math.max(0, seconds ?? 0);
  const totalMinutes = Math.round(safeSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}${t("units.minutes")}`;
  }
  const hours = Math.round(totalMinutes / 60);
  return `${hours}${t("units.hours")}`;
}

function formatPeakHour(hour: number, locale: string): string {
  const date = new Date(Date.UTC(2000, 0, 1, hour));
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(date);
}

export function MusicalProfileMasthead({
  compact = false,
  children,
}: {
  compact?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations("musical-profile");

  return (
    <OverviewHeroFrame title={t("title")} description={t("subtitle")} compact={compact}>
      {children}
    </OverviewHeroFrame>
  );
}

export function MusicalProfileMetricStrip({
  locale,
  loading = false,
  totalListens,
  totalPlayTime,
  uniqueArtists,
  uniqueTracks,
  peakDay,
  peakHour,
}: {
  locale: string;
  loading?: boolean;
  totalListens?: number;
  totalPlayTime?: number;
  uniqueArtists?: number;
  uniqueTracks?: number;
  peakDay?: TemporalAnalysisDto["peakDay"];
  peakHour?: TemporalAnalysisDto["peakHour"];
}) {
  const t = useTranslations("musical-profile");
  const dayNames = getAiInsightsLabels(locale).dayNames;
  const ready = !loading && totalListens != null;

  const metrics = [
    {
      key: "listens",
      label: t("metrics.totalListens"),
      value: ready ? formatCompactNumber(totalListens, locale) : null,
      hint: t("metrics.totalListensHint"),
    },
    {
      key: "time",
      label: t("metrics.listeningTime"),
      value: ready ? formatListeningTime(totalPlayTime, t) : null,
      hint: t("metrics.listeningTimeHint"),
    },
    {
      key: "artists",
      label: t("metrics.uniqueArtists"),
      value: ready ? formatCompactNumber(uniqueArtists, locale) : null,
      hint: t("metrics.uniqueArtistsHint"),
    },
    {
      key: "tracks",
      label: t("metrics.uniqueTracks"),
      value: ready ? formatCompactNumber(uniqueTracks, locale) : null,
      hint: t("metrics.uniqueTracksHint"),
    },
    {
      key: "peakDay",
      label: t("profileCockpit.peakDay"),
      value: ready ? (peakDay ? dayNames[peakDay.dayOfWeek] : "—") : null,
      hint: t("profileCockpit.listeningRhythm"),
    },
    {
      key: "peakHour",
      label: t("profileCockpit.peakHour"),
      value: ready ? (peakHour ? formatPeakHour(peakHour.hour, locale) : "—") : null,
      hint: t("profileCockpit.listeningRhythm"),
    },
  ];

  return (
    <div
      className={`${DASHBOARD_METRIC_STRIP} w-full max-lg:flex-nowrap max-lg:overflow-x-auto`}
      aria-busy={loading || undefined}
    >
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[10.5rem] max-lg:flex-none`}
          title={metric.hint}
        >
          <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
          {metric.value == null ? (
            <span
              className={`${DASHBOARD_METRIC_VALUE} inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`}
            />
          ) : (
            <span className={`${DASHBOARD_METRIC_VALUE} truncate`}>{metric.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function DestinationRow({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      aria-label={title}
      className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} no-underline text-foreground hover:text-foreground`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight">{title}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-muted">{description}</p>
      </div>
      <span className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-medium text-muted">
        {cta}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}

export function MusicalProfileDestinations({
  titleId,
  yourMusicHref,
  chatHref,
  duetHref,
}: {
  titleId: string;
  yourMusicHref: string;
  chatHref: string;
  duetHref: string;
}) {
  const t = useTranslations("musical-profile");

  return (
    <section className="w-full min-w-0" aria-labelledby={titleId}>
      <p className={DASHBOARD_SECTION_EYEBROW}>{t("features.badge")}</p>
      <h2 id={titleId} className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
        {t("features.title")}
      </h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{t("features.lead")}</p>
      <div className="mt-8 w-full min-w-0">
        <DestinationRow
          href={yourMusicHref}
          title={t("features.yourMusic.title")}
          description={t("mobile.yourMusicLead")}
          cta={t("features.yourMusic.cta")}
        />
        <DestinationRow
          href={chatHref}
          title={t("features.aiChat.title")}
          description={t("mobile.chatLead")}
          cta={t("features.aiChat.cta")}
        />
        <DestinationRow
          href={duetHref}
          title={t("features.duet.title")}
          description={t("mobile.duetLead")}
          cta={t("features.duet.cta")}
        />
      </div>
    </section>
  );
}

function IdentityQuote({
  aiError,
  aiLoading,
  interactiveAiBlockedByGenreBackfill,
  profileDescription,
}: {
  aiError: Error | null;
  aiLoading: boolean;
  interactiveAiBlockedByGenreBackfill: boolean;
  profileDescription: string;
}) {
  const t = useTranslations("musical-profile");
  const quoteClassName = "text-lg font-semibold leading-8 tracking-tight text-foreground";

  if (aiLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-5 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-5 w-11/12 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
    );
  }

  if (!aiError) {
    return <p className={quoteClassName}>&ldquo;{profileDescription}&rdquo;</p>;
  }

  if (isGroqDailyQuotaError(aiError)) {
    return <GroqQuotaNotice error={aiError} />;
  }

  if (isGroqGenreClassificationBlockingError(aiError)) {
    return (
      <div className="space-y-4">
        {!interactiveAiBlockedByGenreBackfill ? <InteractiveAiGenreBackfillNotice force /> : null}
        <p className={quoteClassName}>&ldquo;{profileDescription}&rdquo;</p>
      </div>
    );
  }

  return (
    <div role="alert" className="space-y-2">
      <p className="text-sm font-semibold text-red-600 dark:text-red-300">{t("aiErrorTitle")}</p>
      <p className={quoteClassName}>{profileDescription}</p>
    </div>
  );
}

export function MusicalProfileIdentity({
  titleId,
  aiCached,
  aiError,
  aiLoading,
  interactiveAiBlockedByGenreBackfill,
  profileDescription,
  showAiUnavailable,
  aiUnavailableReason,
  dense = false,
}: {
  titleId: string;
  aiCached?: boolean;
  aiError: Error | null;
  aiLoading: boolean;
  interactiveAiBlockedByGenreBackfill: boolean;
  profileDescription: string;
  showAiUnavailable?: boolean;
  aiUnavailableReason?: AiUnavailableReason;
  /** Tighter top margin when nested in a compact masthead. */
  dense?: boolean;
}) {
  const t = useTranslations("musical-profile");

  return (
    <section
      className={`w-full min-w-0 max-w-3xl ${dense ? "mt-3" : "mt-6"}`}
      aria-labelledby={titleId}
    >
      <p id={titleId} className={DASHBOARD_SECTION_EYEBROW}>
        {t("identityTitle")}
      </p>
      <div className="mt-3">
        <IdentityQuote
          aiError={aiError}
          aiLoading={aiLoading}
          interactiveAiBlockedByGenreBackfill={interactiveAiBlockedByGenreBackfill}
          profileDescription={profileDescription}
        />
        {aiCached ? (
          <p className="mt-3 text-[13px] text-muted" title={t("aiCached")}>
            {t("aiCached")}
          </p>
        ) : null}
        {showAiUnavailable ? (
          <div className="mt-3">
            <AiUnavailableCta reason={aiUnavailableReason ?? "consent"} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
