"use client";

import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Link, usePathname } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { ParallaxHero, ScrollRevealSection, StaggerContainer } from "@/lib/components/overview-bis";
import { SoundprintBrandDividerSection } from "@/lib/components/soundprint-brand-divider";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import {
  CinematicFilmGrain,
  CinematicFloat,
  CinematicFloatingOrbs,
  CinematicLightSweep,
  CinematicQuote,
  CinematicReveal,
  CinematicStagger,
  CinematicWordReveal,
} from "@/lib/components/musical-profile-cinematic";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { GenreDistributionDto } from "@/lib/dto/genres";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import type { TasteProfileInput, TasteProfileResponse } from "@/lib/dto/taste-profile";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import {
  OverviewStatsWithTopArtists,
  useGenres,
  useOverviewStats,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import { isGroqDailyQuotaError, isGroqGenreClassificationBlockingError } from "@/lib/utils/groq-quota-message";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { firstKnownGenreName } from "@/lib/utils/genre-unknown-label";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { getAvatarUrl } from "@/lib/components/artist-avatar-utils";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import {
  MobileMusicalProfileView,
  MusicalProfileNoDataMobileView,
  type ProfileMetric,
} from "@/lib/components/musical-profile-mobile";

const TOP_LIMIT = 6;
const PROFILE_AI_STALE_TIME = 5 * 60 * 1000;

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function BarsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
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

function DuetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
      />
    </svg>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

function formatCompactNumber(value: number | undefined, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatListeningTime(seconds: number | undefined, t: ReturnType<typeof useTranslations>): string {
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

function ProfileCockpitRhythm({
  locale,
  peakDay,
  peakHour,
  uniqueTracks,
}: {
  locale: string;
  peakDay: TemporalAnalysisDto["peakDay"];
  peakHour: TemporalAnalysisDto["peakHour"];
  uniqueTracks: number | undefined;
}) {
  const t = useTranslations("musical-profile");
  const dayNames = getAiInsightsLabels(locale).dayNames;
  const hasRhythm = Boolean(peakDay || peakHour);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {t("profileCockpit.listeningRhythm")}
      </p>
      {hasRhythm ? (
        <CinematicStagger className="grid gap-2 sm:grid-cols-3" delay={0.45} inView>
          {peakDay ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-lg font-semibold tracking-tight text-white">{dayNames[peakDay.dayOfWeek]}</p>
              <p className="mt-1 text-xs text-cyan-100">
                {formatCompactNumber(peakDay.listens, locale)} {t("labels.listens")}
              </p>
              <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("profileCockpit.peakDay")}
              </p>
            </div>
          ) : null}
          {peakHour ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
              <p className="text-lg font-semibold tracking-tight text-white">{formatPeakHour(peakHour.hour, locale)}</p>
              <p className="mt-1 text-xs text-cyan-100">
                {formatCompactNumber(peakHour.listens, locale)} {t("labels.listens")}
              </p>
              <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("profileCockpit.peakHour")}
              </p>
            </div>
          ) : null}
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-lg font-semibold tracking-tight text-white">
              {formatCompactNumber(uniqueTracks, locale)}
            </p>
            <p className="mt-1 text-xs text-cyan-100">{t("profileCockpit.tracksExploredHint")}</p>
            <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400" title={t("metrics.uniqueTracksHint")}>
              {t("metrics.uniqueTracks")}
            </p>
          </div>
        </CinematicStagger>
      ) : (
        <p className="text-sm leading-6 text-white/55">{t("profileCockpit.rhythmFallback")}</p>
      )}
    </div>
  );
}

function getTopArtistFallback(artists: ArtistStatsDto[], overview?: OverviewStatsWithTopArtists) {
  if (artists[0]) return artists[0].artistName;
  return overview?.topArtists?.[0]?.artistName ?? "";
}

function buildTasteProfileInput(params: {
  startDate: string;
  endDate: string;
  overview: OverviewStatsWithTopArtists;
  genres: GenreDistributionDto[];
  temporal: TemporalAnalysisDto;
  artists: ArtistStatsDto[];
  locale: string;
}): TasteProfileInput {
  const labels = getAiInsightsLabels(params.locale);

  return {
    dateRange: { start: params.startDate, end: params.endDate },
    genreDistribution: params.genres.slice(0, 12).map((genre) => ({
      genre: genre.genre,
      count: genre.count,
      percentage: genre.percentage,
    })),
    listeningByTimeOfDay: params.temporal.byHourOfDay.map((hour) => ({
      hour: hour.hour,
      listens: hour.listens,
    })),
    topArtists: params.artists.slice(0, 10).map((artist) => ({
      artistName: artist.artistName,
      listenCount: artist.listenCount,
      genre: undefined,
    })),
    peakDay: params.temporal.peakDay
      ? {
          dayName: labels.dayNames[params.temporal.peakDay.dayOfWeek],
          listens: params.temporal.peakDay.listens,
        }
      : undefined,
    peakHour: params.temporal.peakHour
      ? {
          hour: params.temporal.peakHour.hour,
          listens: params.temporal.peakHour.listens,
        }
      : undefined,
    totalListens: params.overview.totalListens,
    uniqueArtists: params.overview.uniqueArtists,
    uniqueTracks: params.overview.uniqueTracks,
  };
}

function usePreparedTasteProfile(params: {
  input: TasteProfileInput | null;
  startDate?: string;
  endDate?: string;
  locale: string;
  userId?: string;
  interactiveAiBlockedByGenreBackfill?: boolean;
}) {
  return useQuery<TasteProfileResponse, Error>({
    queryKey: [
      "musical-profile",
      "prepared-taste-profile",
      {
        startDate: params.startDate,
        endDate: params.endDate,
        locale: params.locale,
        userId: params.userId,
        totalListens: params.input?.totalListens,
        uniqueArtists: params.input?.uniqueArtists,
        uniqueTracks: params.input?.uniqueTracks,
      },
    ],
    queryFn: () =>
      apiClient.post<TasteProfileResponse>("/ai/taste-profile", {
        ...params.input,
        tone: "poetic",
        locale: params.locale,
        userId: params.userId,
      }),
    enabled:
      !!params.input && !params.interactiveAiBlockedByGenreBackfill,
    staleTime: PROFILE_AI_STALE_TIME,
    retry: false,
  });
}

function AiIdentityQuote({
  aiError,
  aiLoading,
  interactiveAiBlockedByGenreBackfill,
  profileDescription,
  quoteClassName = "text-2xl font-semibold leading-9 tracking-tight text-white",
}: {
  aiError: Error | null;
  aiLoading: boolean;
  interactiveAiBlockedByGenreBackfill: boolean;
  profileDescription: string;
  quoteClassName?: string;
}) {
  const t = useTranslations("musical-profile");

  if (aiLoading) {
    return (
      <div className="space-y-3 animate-pulse" aria-busy="true">
        <div className="h-5 w-full rounded-full bg-white/15" />
        <div className="h-5 w-11/12 rounded-full bg-white/15" />
        <div className="h-5 w-4/5 rounded-full bg-white/15" />
      </div>
    );
  }

  if (!aiError) {
    return (
      <CinematicQuote className={quoteClassName} quoteKey={profileDescription}>
        &ldquo;{profileDescription}&rdquo;
      </CinematicQuote>
    );
  }

  if (isGroqDailyQuotaError(aiError)) {
    return <GroqQuotaNotice error={aiError} />;
  }

  if (isGroqGenreClassificationBlockingError(aiError)) {
    return (
      <div className="space-y-4">
        {!interactiveAiBlockedByGenreBackfill ? <InteractiveAiGenreBackfillNotice force /> : null}
        <CinematicQuote className={quoteClassName} quoteKey={profileDescription}>
          &ldquo;{profileDescription}&rdquo;
        </CinematicQuote>
      </div>
    );
  }

  return (
    <div role="alert" className="space-y-2">
      <p className="text-sm font-semibold text-red-200">{t("aiErrorTitle")}</p>
      <p className={quoteClassName}>{profileDescription}</p>
    </div>
  );
}

function PageFramingSection({
  withFilters,
  compact = false,
}: {
  withFilters: (href: string) => string;
  compact?: boolean;
}) {
  const t = useTranslations("musical-profile");
  const bullets = [t("emptyFeature.item1"), t("emptyFeature.item2"), t("emptyFeature.item3")];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-card-border bg-card-surface p-5 shadow-card sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-35"
        style={{
          background:
            "radial-gradient(circle at 8% 0%, rgba(139, 92, 246, 0.08), transparent 32%), radial-gradient(circle at 92% 100%, rgba(6, 182, 212, 0.07), transparent 28%)",
        }}
        aria-hidden
      />
      <div className="relative">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          {compact ? t("landing.badge") : t("emptyFeature.badge")}
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-3xl">
          {compact ? t("mobile.nextTitle") : t("emptyFeature.title")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base">
          {compact ? t("mobile.nextLead") : t("emptyFeature.lead")}
        </p>

        {compact ? null : (
          <ul className="mt-5 space-y-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-violet"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {compact ? null : (
          <div className="mt-6 rounded-2xl border border-card-border bg-surface-glass/80 p-4">
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
            {t("overviewCallout.badge")}
          </p>
          <p className="mt-2 text-sm font-semibold text-gray-950 dark:text-white">{t("overviewCallout.title")}</p>
          <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("overviewCallout.philosophyEyebrow")}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
            <li>{t("overviewCallout.philosophyBullet1")}</li>
            <li>{t("overviewCallout.philosophyBullet2")}</li>
          </ul>
          </div>
        )}

        {compact ? null : (
          <>
            <p className="mt-6 text-sm font-semibold text-gray-950 dark:text-white">{t("landing.title")}</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">{t("landing.lead")}</p>
            <Link
              href={withFilters("/dashboard/overview")}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:w-auto"
            >
              {t("landing.primaryCta")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function FeaturePillarCard({
  href,
  eyebrow,
  title,
  body,
  cta,
  icon,
  accentClass,
  glowClass,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  icon: React.ReactNode;
  accentClass: string;
  glowClass: string;
}) {
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <Link
        href={href}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-card-border bg-surface-glass p-6 shadow-card backdrop-blur-xl transition-all hover:border-accent-violet/25 hover:shadow-card-hover"
      >
        <div
          className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl ${glowClass}`}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-violet/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        <div
          className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass}`}
        >
          {icon}
        </div>
        <p className="relative font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h3 className="relative mt-2 text-xl font-semibold tracking-[-0.03em] text-gray-950 dark:text-white">
          {title}
        </h3>
        <p className="relative mt-3 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{body}</p>
        <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
          {cta}
          <ArrowRightIcon className="h-4 w-4" />
        </span>
      </Link>
    </motion.div>
  );
}

function SoundprintIdentitySection({
  aiCached,
  aiError,
  aiLoading,
  compactSignature = false,
  interactiveAiBlockedByGenreBackfill,
  profileDescription,
  showAiUnavailable,
  topArtistName,
  topGenreName,
}: {
  aiCached?: boolean;
  aiError: Error | null;
  aiLoading: boolean;
  compactSignature?: boolean;
  interactiveAiBlockedByGenreBackfill: boolean;
  profileDescription: string;
  showAiUnavailable?: boolean;
  topArtistName: string;
  topGenreName: string | undefined;
}) {
  const t = useTranslations("musical-profile");

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-accent-violet/30 bg-gray-950 text-white shadow-2xl shadow-accent-violet/25 ring-1 ring-accent-violet/15">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(240,64,104,0.38),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.28),transparent_34%),linear-gradient(155deg,rgba(3,7,18,0.98),rgba(30,27,75,0.92)_50%,rgba(8,47,73,0.82))]" />
      <CinematicFloatingOrbs />
      <CinematicFilmGrain />
      <CinematicLightSweep />
      <div className="pointer-events-none absolute -bottom-28 left-1/2 h-64 w-[85%] -translate-x-1/2 rounded-full bg-accent-violet/20 blur-3xl" />
      <div className="relative p-5 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          {compactSignature ? null : (
            <div className="flex shrink-0 flex-col items-center text-center lg:items-start lg:text-left">
              <SoundprintBrandMark
                size="xl"
                layout="stacked"
                tone="onDark"
                showAiBadgeOnMobile
                priority
                interactive={false}
                tagline={t("identityWelcome")}
                className="flex-col items-center lg:items-start"
              />
              <div className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
                {topArtistName ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                    {topArtistName}
                  </span>
                ) : null}
                {topGenreName ? (
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                    {topGenreName}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              {t("identityTitle")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              {t("identitySubtitle")}
            </p>

            <div className="relative mt-8 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur-sm sm:p-7">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,144,224,0.16),transparent_40%)]"
                aria-hidden
              />
              <AiIdentityQuote
                aiError={aiError}
                aiLoading={aiLoading}
                interactiveAiBlockedByGenreBackfill={interactiveAiBlockedByGenreBackfill}
                profileDescription={profileDescription}
                quoteClassName="text-lg font-semibold leading-8 text-white sm:text-2xl sm:leading-9 sm:tracking-tight"
              />
            </div>

            {aiCached ? (
              <p className="mt-4 text-[0.7rem] text-white/40" title={t("aiCached")}>
                {t("aiCached")}
              </p>
            ) : null}
            {showAiUnavailable ? (
              <p className="mt-4 text-xs leading-6 text-white/45">{t("aiUnavailable")}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExploreFeaturesSection({
  withFilters,
}: {
  withFilters: (href: string) => string;
}) {
  const t = useTranslations("musical-profile");

  const pillars = [
    {
      href: withFilters("/dashboard/overview"),
      eyebrow: t("features.yourMusic.eyebrow"),
      title: t("features.yourMusic.title"),
      body: t("features.yourMusic.body"),
      cta: t("features.yourMusic.cta"),
      icon: <BarsIcon className="h-6 w-6" />,
      accentClass: "bg-accent-violet/15 text-accent-violet",
      glowClass: "bg-accent-violet/20",
    },
    {
      href: withFilters("/dashboard/ask-your-soundprint"),
      eyebrow: t("features.aiChat.eyebrow"),
      title: t("features.aiChat.title"),
      body: t("features.aiChat.body"),
      cta: t("features.aiChat.cta"),
      icon: <ChatIcon className="h-6 w-6" />,
      accentClass: "bg-accent-cyan/15 text-accent-cyan",
      glowClass: "bg-accent-cyan/20",
    },
    {
      href: withFilters("/dashboard/duet/friends"),
      eyebrow: t("features.duet.eyebrow"),
      title: t("features.duet.title"),
      body: t("features.duet.body"),
      cta: t("features.duet.cta"),
      icon: <DuetIcon className="h-6 w-6" />,
      accentClass: "bg-accent-rose/15 text-accent-rose",
      glowClass: "bg-accent-rose/20",
    },
  ] as const;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-card-border bg-card-surface p-5 shadow-card sm:p-8 lg:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          background:
            "radial-gradient(circle at 10% 0%, rgba(139, 92, 246, 0.1), transparent 34%), radial-gradient(circle at 95% 80%, rgba(6, 182, 212, 0.08), transparent 30%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
          {t("features.badge")}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-4xl">
          {t("features.title")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300 sm:text-base">
          {t("features.lead")}
        </p>
      </div>
      <StaggerContainer className="relative mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
        {pillars.map((pillar) => (
          <FeaturePillarCard key={pillar.href} {...pillar} />
        ))}
      </StaggerContainer>
    </section>
  );
}

function MusicalProfileNoDataView({
  locale,
  withFilters,
}: {
  locale: string;
  withFilters: (href: string) => string;
}) {
  const t = useTranslations("musical-profile");
  const emptyStatePresets = useEmptyStatePresets();
  const { startDate, endDate } = useListenDateRange();

  return (
    <div className="hidden space-y-8 pb-10 lg:block">
      <ParallaxHero>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-accent-violet/20 bg-gray-950 px-6 py-8 text-white shadow-2xl shadow-accent-violet/20 sm:px-10 sm:py-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.45),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.28),transparent_30%),linear-gradient(135deg,rgba(17,24,39,0.98),rgba(76,29,149,0.78))]" />
          <CinematicFloatingOrbs />
          <CinematicFilmGrain />
          <CinematicLightSweep />
          <div className="absolute -bottom-24 left-1/2 h-56 w-[80%] -translate-x-1/2 rounded-full bg-accent-violet/25 blur-3xl" />
          <CinematicStagger className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end" delay={0.1}>
            <div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                <CinematicWordReveal text={t("heroTitle")} />
              </h1>
              <MusicalProfilePeriodBadge
                startDate={startDate}
                endDate={endDate}
                locale={locale}
                className="mt-5"
              />
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent shadow-2xl shadow-black/35 ring-2 ring-white/15 sm:h-32 sm:w-32">
                    <ProfileIcon className="h-14 w-14 text-white/35 sm:h-16 sm:w-16" aria-hidden />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-600/15 via-transparent to-cyan-500/10"
                      aria-hidden
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute -inset-1 -z-10 rounded-[1.35rem] bg-gradient-to-br from-accent-violet/30 via-transparent to-accent-cyan/25 opacity-70 blur-md"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
                    {t("heroSignature")}
                  </p>
                  <p className="mt-3 text-2xl font-bold leading-tight text-white/50">{t("unknownArtist")}</p>
                  <p className="mt-2 text-sm text-white/55">{t("heroSignatureHintFallback")}</p>
                </div>
              </div>
            </div>
          </CinematicStagger>
        </motion.section>
      </ParallaxHero>

      <PageFramingSection withFilters={withFilters} />

      <EmptyState
        variant="startup"
        {...emptyStatePresets.importData}
        message={t("noData")}
        description={t("importDescription")}
      />

      <ExploreFeaturesSection withFilters={withFilters} />
    </div>
  );
}

function MusicalProfileContent() {
  const t = useTranslations("musical-profile");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const withFilters = useMemo(
    () => (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams]
  );

  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch } =
    useOverviewStats(startDate, endDate, userId);
  const { data: artistsData, isLoading: artistsLoading, error: artistsError } =
    useArtistStats(startDate, endDate, userId, TOP_LIMIT, 0);
  const { data: genresData, isLoading: genresLoading, error: genresError } =
    useGenres(startDate, endDate, userId);
  const { data: temporalData, isLoading: temporalLoading, error: temporalError } =
    useTemporalAnalysis(startDate, endDate, userId);

  const topArtists = useMemo(
    () => artistsData?.topArtists ?? [],
    [artistsData?.topArtists]
  );

  const profileInput = useMemo(() => {
    if (!startDate || !endDate || !overview || !genresData || !temporalData) {
      return null;
    }

    return buildTasteProfileInput({
      startDate,
      endDate,
      overview,
      genres: genresData.data,
      temporal: temporalData,
      artists: topArtists,
      locale,
    });
  }, [endDate, genresData, locale, overview, startDate, temporalData, topArtists]);

  const {
    data: aiProfile,
    isLoading: aiLoading,
    error: aiError,
  } = usePreparedTasteProfile({
    input: profileInput,
    startDate,
    endDate,
    locale,
    userId,
    interactiveAiBlockedByGenreBackfill,
  });

  const isLoading =
    isRangeLoading ||
    overviewLoading ||
    artistsLoading ||
    genresLoading ||
    temporalLoading;

  const dataError = overviewError ?? artistsError ?? genresError ?? temporalError;
  const hasListeningData = (overview?.totalListens ?? 0) > 0 || topArtists.length > 0;

  if (!isLoading && dataError && !hasListeningData) {
    return (
      <div className="max-w-4xl">
        <ErrorState
          variant="startup"
          error={dataError}
          message={t("errorLoading")}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!isLoading && !hasListeningData) {
    return (
      <>
        <MusicalProfileNoDataMobileView locale={locale} />
        <MusicalProfileNoDataView locale={locale} withFilters={withFilters} />
      </>
    );
  }

  const topArtistName = getTopArtistFallback(topArtists, overview);
  const topGenreName = firstKnownGenreName(genresData?.data);
  const profileDescription =
    aiProfile?.description?.trim() ||
    t("deterministicProfile", {
      artist: topArtistName || t("unknownArtist"),
      genre: topGenreName || t("unknownGenre"),
    });
  const showAiUnavailable = aiProfile?.aiUnavailable;
  const profileMetrics: ProfileMetric[] = [
    {
      label: t("metrics.totalListens"),
      value: formatCompactNumber(overview?.totalListens, locale),
      hint: t("metrics.totalListensHint"),
    },
    {
      label: t("metrics.listeningTime"),
      value: formatListeningTime(overview?.totalPlayTime, t),
      hint: t("metrics.listeningTimeHint"),
    },
    {
      label: t("metrics.uniqueArtists"),
      value: formatCompactNumber(overview?.uniqueArtists, locale),
      hint: t("metrics.uniqueArtistsHint"),
    },
  ];

  return (
    <>
      <MobileMusicalProfileView
        aiCached={aiProfile?.cached}
        aiError={aiError ?? null}
        aiLoading={aiLoading}
        startDate={startDate}
        endDate={endDate}
        interactiveAiBlockedByGenreBackfill={interactiveAiBlockedByGenreBackfill}
        locale={locale}
        profileDescription={profileDescription}
        profileMetrics={profileMetrics}
        showAiUnavailable={showAiUnavailable}
        topArtistName={topArtistName}
        topArtists={topArtists}
        topGenreName={topGenreName}
        withFilters={withFilters}
      />

      <div className="hidden space-y-12 pb-6 lg:block lg:pb-10">
        <ParallaxHero>
          <motion.section
            key="musical-profile-hero"
            initial={{ opacity: 0, y: 40, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-accent-violet/20 sm:px-8 sm:py-9 lg:px-10 lg:py-10"
          >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.28),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(79,144,224,0.24),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
          <CinematicFloatingOrbs />
          <CinematicFilmGrain />
          <CinematicLightSweep />
          <div className="absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl" />
          <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/20 blur-3xl" />
          <CinematicStagger className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center" delay={0.12}>
            <div>
              <h1 className="max-w-4xl text-balance text-3xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
                <CinematicWordReveal text={t("heroTitle")} />
              </h1>
              <MusicalProfilePeriodBadge
                startDate={startDate}
                endDate={endDate}
                locale={locale}
                className="mt-5"
              />
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={withFilters("/dashboard/overview")}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100 sm:w-auto"
                >
                  {t("overviewCallout.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>

            <CinematicReveal delay={0.25} className="relative">
              <motion.div
                className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl"
                animate={{ opacity: [0.55, 0.85, 0.6] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
                <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {t("profileCockpit.label")}
                    </p>
                    <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-cyan-100">
                      {t("profileCockpit.live")}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                    <CinematicFloat className="relative mx-auto h-32 w-32 sm:mx-0" intensity="subtle">
                      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-2xl shadow-black/35 ring-1 ring-white/15">
                      {topArtists[0] ? (
                        <ArtistAvatarHydrated
                          artistId={topArtists[0].artistId}
                          artistName={topArtists[0].artistName}
                          imageUrl={topArtists[0].imageUrl}
                          avatarApiSize={384}
                          colorIndex={0}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="eager"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getAvatarUrl(topArtistName || t("unknownArtist"), 384, 0)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="eager"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = getAvatarUrl(
                              topArtistName || t("unknownArtist"),
                              384,
                              0
                            );
                          }}
                        />
                      )}
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-600/20 via-transparent to-cyan-500/20"
                        aria-hidden
                      />
                      </div>
                    </CinematicFloat>
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
                        {t("heroSignature")}
                      </p>
                      <p className="mt-2 truncate text-2xl font-semibold tracking-tight">
                        <CinematicWordReveal text={topArtistName || t("unknownArtist")} delay={0.35} />
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        {topGenreName
                          ? t("heroSignatureHint", { genre: topGenreName })
                          : t("heroSignatureHintFallback")}
                      </p>
                    </div>
                  </div>

                  <CinematicStagger className="mt-5 grid gap-2 sm:grid-cols-3" delay={0.4} inView>
                    {profileMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"
                        title={metric.hint}
                      >
                        <p className="text-xl font-semibold tracking-tight">{metric.value}</p>
                        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </CinematicStagger>

                  <ProfileCockpitRhythm
                    locale={locale}
                    peakDay={temporalData?.peakDay ?? null}
                    peakHour={temporalData?.peakHour ?? null}
                    uniqueTracks={overview?.uniqueTracks}
                  />
                </div>
              </div>
            </CinematicReveal>
          </CinematicStagger>
        </motion.section>
      </ParallaxHero>

      <PageFramingSection withFilters={withFilters} />

      <ScrollRevealSection>
        <ExploreFeaturesSection withFilters={withFilters} />
      </ScrollRevealSection>

      <SoundprintBrandDividerSection logoSize="md" lineStyle="gradient" maxWidth="narrow" className="py-4 sm:py-6" />

      <ScrollRevealSection>
        <SoundprintIdentitySection
          aiCached={aiProfile?.cached}
          aiError={aiError ?? null}
          aiLoading={aiLoading}
          interactiveAiBlockedByGenreBackfill={interactiveAiBlockedByGenreBackfill}
          profileDescription={profileDescription}
          showAiUnavailable={showAiUnavailable}
          topArtistName={topArtistName}
          topGenreName={topGenreName}
        />
      </ScrollRevealSection>
      </div>
    </>
  );
}

function MusicalProfileFallback() {
  return (
    <div className="space-y-8">
      <motion.div
        className="h-72 rounded-[2rem] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="h-80 rounded-[2rem] bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
    </div>
  );
}

export default function MusicalProfilePage() {
  const pathname = usePathname();

  return (
    <div className="relative sm:py-6">
      <Suspense fallback={<MusicalProfileFallback />}>
        <div key={pathname}>
          <MusicalProfileContent />
        </div>
      </Suspense>
    </div>
  );
}
