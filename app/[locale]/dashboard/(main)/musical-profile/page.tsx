"use client";

import Image from "next/image";
import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { ParallaxHero, ScrollRevealSection, StaggerContainer } from "@/lib/components/overview-bis";
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

const TOP_LIMIT = 6;
const PROFILE_AI_STALE_TIME = 5 * 60 * 1000;

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

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

function formatDateRange(startDate: string | undefined, endDate: string | undefined, locale: string): string {
  if (!startDate || !endDate) return "";
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
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

function LandingValueCard({
  title,
  body,
  icon,
  accentClass,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-card-hover">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-accent-violet/10 via-transparent to-accent-cyan/10 opacity-80 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className={`relative mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}>
        {icon}
      </div>
      <h3 className="relative text-base font-semibold text-gray-950 dark:text-white">{title}</h3>
      <p className="relative mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{body}</p>
    </div>
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
  const dateRangeLabel = formatDateRange(startDate, endDate, locale);
  const previewBullets = [t("emptyFeature.item1"), t("emptyFeature.item2"), t("emptyFeature.item3")];

  return (
    <div className="space-y-8 pb-10">
      <ParallaxHero>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-accent-violet/20 bg-gray-950 px-6 py-8 text-white shadow-2xl shadow-accent-violet/20 sm:px-10 sm:py-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.45),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.28),transparent_30%),linear-gradient(135deg,rgba(17,24,39,0.98),rgba(76,29,149,0.78))]" />
          <div className="absolute -bottom-24 left-1/2 h-56 w-[80%] -translate-x-1/2 rounded-full bg-accent-violet/25 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                {t("heroSubtitle")}
              </p>
              {dateRangeLabel ? (
                <p className="mt-5 text-sm font-medium text-white/55">{dateRangeLabel}</p>
              ) : null}
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
          </div>
        </motion.section>
      </ParallaxHero>

      <section className="relative min-h-[240px] w-full overflow-hidden rounded-2xl border border-accent-violet/25 bg-card-surface shadow-2xl ring-1 ring-accent-violet/10 transition-all duration-300 dark:border-accent-violet/30 dark:ring-accent-violet/20">
        <div
          className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-50"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(139, 92, 246, 0.18), transparent 34%), radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.12), transparent 28%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-violet via-accent-indigo to-accent-cyan opacity-80" />
        <div className="relative border-b border-gray-100/80 px-6 py-5 dark:border-gray-700/50">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-violet/20 bg-accent-violet/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-violet dark:bg-accent-violet/15">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-violet" aria-hidden />
            {t("emptyFeature.badge")}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("emptyFeature.title")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("emptyFeature.lead")}</p>
        </div>
        <div className="relative space-y-6 p-6">
          <ul className="list-none space-y-3">
            {previewBullets.map((text) => (
              <li key={text} className="flex gap-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-violet"
                  aria-hidden
                />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <Link
            href={withFilters("/dashboard/overview")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            {t("overviewCallout.cta")}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      <EmptyState
        {...emptyStatePresets.importData}
        message={t("noData")}
        description={t("importDescription")}
      />

      <div className="flex justify-center pt-6">
        <Link
          href={withFilters("/dashboard/overview")}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          {t("overviewCallout.cta")}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
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
          error={dataError}
          message={t("errorLoading")}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!isLoading && !hasListeningData) {
    return <MusicalProfileNoDataView locale={locale} withFilters={withFilters} />;
  }

  const dateRangeLabel = formatDateRange(startDate, endDate, locale);
  const topArtistName = getTopArtistFallback(topArtists, overview);
  const topGenreName = firstKnownGenreName(genresData?.data);
  const profileDescription =
    aiProfile?.description?.trim() ||
    t("deterministicProfile", {
      artist: topArtistName || t("unknownArtist"),
      genre: topGenreName || t("unknownGenre"),
    });
  const showAiUnavailable = aiProfile?.aiUnavailable;
  const profileMetrics = [
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
  const genrePreview = (genresData?.data ?? []).slice(0, 3);
  const topArtistShare =
    overview?.totalListens && topArtists[0]?.listenCount
      ? Math.round((topArtists[0].listenCount / overview.totalListens) * 100)
      : 0;

  return (
    <div className="space-y-12 pb-10">
      <ParallaxHero>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-accent-violet/20 sm:px-8 sm:py-9 lg:px-10 lg:py-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.28),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(79,144,224,0.24),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
          <div className="absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl" />
          <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
                {t("heroBadge")}
              </div>
              <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                {t("heroSubtitle")}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={withFilters("/dashboard/overview")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
                >
                  {t("overviewCallout.cta")}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              {dateRangeLabel ? (
                <p className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/55">
                  {dateRangeLabel}
                </p>
              ) : null}
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
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
                    <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-3xl shadow-2xl shadow-black/35 ring-1 ring-white/15 sm:mx-0">
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
                    <div className="min-w-0 text-center sm:text-left">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
                        {t("heroSignature")}
                      </p>
                      <p className="mt-2 truncate text-2xl font-semibold tracking-tight">
                        {topArtistName || t("unknownArtist")}
                      </p>
                      <p className="mt-2 text-sm text-white/60">
                        {topGenreName
                          ? t("heroSignatureHint", { genre: topGenreName })
                          : t("heroSignatureHintFallback")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {profileMetrics.map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                        <p className="text-xl font-semibold tracking-tight">{metric.value}</p>
                        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {t("profileCockpit.genreMix")}
                      </span>
                      {topArtistShare > 0 ? (
                        <span className="text-cyan-100">
                          {t("profileCockpit.anchorShare", { percent: topArtistShare })}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {genrePreview.map((genre) => (
                        <div key={genre.genre}>
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                            <span className="truncate">{genre.genre}</span>
                            <span>{Math.round(genre.percentage)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-cyan"
                              style={{ width: `${Math.min(100, Math.max(4, genre.percentage))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </ParallaxHero>

      <ScrollRevealSection>
        <section className="relative overflow-hidden rounded-[2rem] border border-card-border bg-surface-glass p-4 shadow-card backdrop-blur-xl sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent-violet/15 blur-3xl" />
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                {t("overviewCallout.badge")}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-4xl">
                {t("overviewCallout.title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {t("overviewCallout.body")}
              </p>
              <Link
                href={withFilters("/dashboard/overview")}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                {t("overviewCallout.cta")}
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
            <div className="relative flex min-h-[220px] flex-col justify-center overflow-hidden rounded-3xl border border-card-border bg-card-surface p-6 shadow-card">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.28] dark:opacity-[0.18]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgb(139 92 246 / 0.22) 1px, transparent 0)",
                  backgroundSize: "22px 22px",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-20 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-accent-cyan/15 blur-3xl dark:bg-accent-cyan/10"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -left-16 bottom-0 h-36 w-36 rounded-full bg-accent-violet/10 blur-2xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <div className="relative overflow-hidden rounded-2xl border border-accent-violet/25 bg-white/90 p-2.5 shadow-md shadow-accent-violet/10 ring-1 ring-accent-violet/10 dark:bg-gray-950/80">
                    <Image
                      src="/brand/favicon.png"
                      alt={t("overviewCallout.philosophyLogoAlt")}
                      width={80}
                      height={80}
                      className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {t("overviewCallout.philosophyEyebrow")}
                  </p>
                  <ul className="mt-4 list-none space-y-4">
                    <li className="flex gap-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-violet"
                        aria-hidden
                      />
                      <span>{t("overviewCallout.philosophyBullet1")}</span>
                    </li>
                    <li className="flex gap-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-cyan"
                        aria-hidden
                      />
                      <span>{t("overviewCallout.philosophyBullet2")}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollRevealSection>

      <ScrollRevealSection>
        <section className="relative overflow-hidden rounded-[2rem] border border-card-border bg-card-surface shadow-2xl ring-1 ring-accent-violet/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(152,80,208,0.16),transparent_32%),radial-gradient(circle_at_90%_40%,rgba(79,144,224,0.14),transparent_28%)]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/60 to-transparent" />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
            <div>
              <div className="mb-5 h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-accent-violet/25 bg-card-surface shadow-lg shadow-accent-violet/20 ring-1 ring-accent-violet/15">
                <Image
                  src="/brand/favicon.png"
                  alt=""
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-violet">
                {t("sections.sonicIdentity")}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
                {t("identityTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {t("identitySubtitle")}
              </p>
              {aiProfile?.cached && (
                <p className="mt-4 inline-flex rounded-full bg-accent-violet/10 px-3 py-1 text-xs font-medium text-accent-violet">
                  {t("aiCached")}
                </p>
              )}
              {showAiUnavailable && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  {t("aiUnavailable")}
                </p>
              )}
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl shadow-black/20 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,144,224,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%)]"
                aria-hidden
              />
              <div className="relative">
              {aiLoading ? (
                <div className="space-y-3 animate-pulse" aria-busy="true">
                  <div className="h-5 w-full rounded bg-white/15" />
                  <div className="h-5 w-11/12 rounded bg-white/15" />
                  <div className="h-5 w-4/5 rounded bg-white/15" />
                </div>
              ) : aiError ? (
                isGroqDailyQuotaError(aiError) ? (
                  <GroqQuotaNotice error={aiError} />
                ) : isGroqGenreClassificationBlockingError(aiError) ? (
                  <div className="space-y-4">
                    {!interactiveAiBlockedByGenreBackfill ? (
                      <InteractiveAiGenreBackfillNotice force />
                    ) : null}
                    <blockquote className="text-2xl font-semibold leading-9 tracking-tight text-white">
                      &ldquo;{profileDescription}&rdquo;
                    </blockquote>
                  </div>
                ) : (
                  <div role="alert" className="space-y-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {t("aiErrorTitle")}
                    </p>
                    <p className="text-xl font-semibold leading-8 text-white">
                      {profileDescription}
                    </p>
                  </div>
                )
              ) : (
                <blockquote className="text-2xl font-semibold leading-9 tracking-tight text-white">
                  &ldquo;{profileDescription}&rdquo;
                </blockquote>
              )}
              </div>
            </div>
          </div>
        </section>
      </ScrollRevealSection>

      <ScrollRevealSection>
        <section className="relative overflow-hidden rounded-[2rem] border border-accent-violet/20 bg-gradient-to-br from-card-surface via-card-surface to-accent-violet/[0.06] p-6 shadow-2xl ring-1 ring-accent-violet/10 sm:p-8 lg:p-10 dark:to-accent-violet/[0.09]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,0.12),transparent_32%),radial-gradient(circle_at_95%_80%,rgba(6,182,212,0.1),transparent_30%)]" />
          <div className="relative space-y-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-violet">
                {t("landing.badge")}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
                {t("landing.title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{t("landing.lead")}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <LandingValueCard
                title={t("landing.cards.statsTitle")}
                body={t("landing.cards.statsBody")}
                icon={<BarsIcon className="h-5 w-5" />}
                accentClass="bg-accent-violet/10 text-accent-violet"
              />
              <LandingValueCard
                title={t("landing.cards.movementTitle")}
                body={t("landing.cards.movementBody")}
                icon={<SparkIcon className="h-5 w-5" />}
                accentClass="bg-accent-cyan/10 text-accent-cyan"
              />
              <LandingValueCard
                title={t("landing.cards.mixTitle")}
                body={t("landing.cards.mixBody")}
                icon={<ProfileIcon className="h-5 w-5" />}
                accentClass="bg-accent-indigo/10 text-accent-indigo"
              />
            </div>
            <div className="flex flex-col items-stretch gap-4 sm:items-center">
              <Link
                href={withFilters("/dashboard/overview")}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:w-auto sm:min-w-[280px]"
              >
                {t("landing.primaryCta")}
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <p className="text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("landing.secondaryHint")}
              </p>
              <StaggerContainer className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    href: withFilters("/dashboard/artists"),
                    label: t("ctas.artists"),
                    icon: <ProfileIcon className="h-5 w-5" />,
                  },
                  {
                    href: withFilters("/dashboard/tracks"),
                    label: t("ctas.tracks"),
                    icon: <BarsIcon className="h-5 w-5" />,
                  },
                  {
                    href: withFilters("/dashboard/genres"),
                    label: t("ctas.genres"),
                    icon: <BarsIcon className="h-5 w-5" />,
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-surface px-4 py-3 text-sm font-medium text-gray-700 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent-violet/30 hover:text-accent-violet hover:shadow-card-hover dark:text-gray-300"
                  >
                    <span className="text-accent-violet">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>
      </ScrollRevealSection>
    </div>
  );
}

function MusicalProfileFallback() {
  return (
    <div className="space-y-8">
      <div className="h-72 rounded-[2rem] bg-gray-100 animate-shimmer dark:bg-gray-800" />
      <div className="h-80 rounded-[2rem] bg-gray-100 animate-shimmer dark:bg-gray-800" />
    </div>
  );
}

export default function MusicalProfilePage() {
  return (
    <div className="relative px-4 py-6 sm:px-0">
      <Suspense fallback={<MusicalProfileFallback />}>
        <MusicalProfileContent />
      </Suspense>
    </div>
  );
}
