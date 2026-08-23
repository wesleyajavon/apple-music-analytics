"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { getAvatarUrl } from "@/lib/components/artist-avatar-utils";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { InteractiveAiGenreBackfillNotice } from "@/lib/components/interactive-ai-genre-backfill-notice";
import {
  CinematicFilmGrain,
  CinematicFloat,
  CinematicFloatingOrbs,
  CinematicLightSweep,
  CinematicQuote,
  CinematicStagger,
  CinematicWordReveal,
} from "@/lib/components/musical-profile-cinematic";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import {
  isGroqDailyQuotaError,
  isGroqGenreClassificationBlockingError,
} from "@/lib/utils/groq-quota-message";

export type ProfileMetric = {
  hint: string;
  label: string;
  value: string;
};

function BarsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
      />
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

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CompactIdentityQuote({
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
  const quoteClassName = "text-base font-semibold leading-7 tracking-tight text-white";

  if (aiLoading) {
    return (
      <div className="space-y-2.5 animate-pulse" aria-busy="true">
        <div className="h-4 w-full rounded-full bg-white/15" />
        <div className="h-4 w-10/12 rounded-full bg-white/15" />
        <div className="h-4 w-2/3 rounded-full bg-white/15" />
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
      <div className="space-y-3">
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

function DestinationRow({
  href,
  title,
  lead,
  icon,
  primary = false,
}: {
  href: string;
  title: string;
  lead: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-gray-950 shadow-lg shadow-black/20"
          : "flex min-h-14 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-3 text-gray-950 shadow-sm dark:text-white"
      }
    >
      <span
        className={
          primary
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet"
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span
          className={`mt-0.5 block truncate text-xs leading-5 ${
            primary ? "text-gray-600" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {lead}
        </span>
      </span>
      <ChevronIcon className={`h-4 w-4 shrink-0 ${primary ? "text-gray-500" : "text-gray-400"}`} />
    </Link>
  );
}

function SignatureArt({
  primaryArtist,
  topArtistName,
}: {
  primaryArtist?: ArtistStatsDto;
  topArtistName: string;
}) {
  return (
    <CinematicFloat className="relative h-[4.5rem] w-[4.5rem] shrink-0" intensity="subtle">
      <div className="relative h-full w-full overflow-hidden rounded-[1.2rem] shadow-2xl shadow-black/35 ring-1 ring-white/15">
        {primaryArtist ? (
          <ArtistAvatarHydrated
            artistId={primaryArtist.artistId}
            artistName={primaryArtist.artistName}
            imageUrl={primaryArtist.imageUrl}
            avatarApiSize={256}
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
            src={getAvatarUrl(topArtistName, 256, 0)}
            alt=""
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-600/20 via-transparent to-cyan-500/20"
          aria-hidden
        />
      </div>
    </CinematicFloat>
  );
}

export function MobileMusicalProfileView({
  aiCached,
  aiError,
  aiLoading,
  endDate,
  interactiveAiBlockedByGenreBackfill,
  locale,
  profileDescription,
  profileMetrics,
  showAiUnavailable,
  startDate,
  topArtistName,
  topArtists,
  topGenreName,
  withFilters,
}: {
  aiCached?: boolean;
  aiError: Error | null;
  aiLoading: boolean;
  endDate?: string;
  interactiveAiBlockedByGenreBackfill: boolean;
  locale: string;
  profileDescription: string;
  profileMetrics: ProfileMetric[];
  showAiUnavailable?: boolean;
  startDate?: string;
  topArtistName: string;
  topArtists: ArtistStatsDto[];
  topGenreName: string | undefined;
  withFilters: (href: string) => string;
}) {
  const t = useTranslations("musical-profile");
  const primaryArtist = topArtists[0];
  const artistLabel = topArtistName || t("unknownArtist");

  return (
    <div className="-mx-4 -mt-4 space-y-4 pb-8 lg:hidden">
      <motion.section
        className="relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(240,64,104,0.32),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.22),transparent_34%),linear-gradient(165deg,rgba(3,7,18,0.98),rgba(30,27,75,0.92)_55%,rgba(8,47,73,0.78))]" />
        <CinematicFloatingOrbs />
        <CinematicFilmGrain />
        <CinematicLightSweep />
        <CinematicStagger className="relative space-y-4" delay={0.08}>
          <div className="flex justify-end">
            <MusicalProfilePeriodBadge
              startDate={startDate}
              endDate={endDate}
              locale={locale}
              variant="mobile"
              className="min-w-0"
            />
          </div>
          <div className="flex items-center gap-3.5">
            <SignatureArt primaryArtist={primaryArtist} topArtistName={artistLabel} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
                {t("mobile.signatureLabel")}
              </p>
              <h1 className="mt-1 text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
                <CinematicWordReveal text={artistLabel} delay={0.12} />
              </h1>
              <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/62">
                {topGenreName ? t("heroSignatureHint", { genre: topGenreName }) : t("mobile.genreFallback")}
              </p>
            </div>
          </div>
        </CinematicStagger>
      </motion.section>

      <section className="px-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.storyTitle")}
        </p>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {profileMetrics.map((metric) => (
            <article
              key={metric.label}
              className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10"
              title={metric.hint}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em]">{metric.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-2 px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.destinationsTitle")}
        </h2>
        <div className="space-y-2">
          <DestinationRow
            href={withFilters("/dashboard/overview")}
            title={t("features.yourMusic.title")}
            lead={t("mobile.yourMusicLead")}
            icon={<BarsIcon className="h-5 w-5" />}
            primary
          />
          <DestinationRow
            href={withFilters("/dashboard/ask-your-soundprint")}
            title={t("features.aiChat.title")}
            lead={t("mobile.chatLead")}
            icon={<ChatIcon className="h-5 w-5" />}
          />
          <DestinationRow
            href={withFilters("/dashboard/duet/friends")}
            title={t("features.duet.title")}
            lead={t("mobile.duetLead")}
            icon={<DuetIcon className="h-5 w-5" />}
          />
        </div>
      </section>

      <section className="px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.identityTitle")}
        </h2>
        <div className="relative mt-2 overflow-hidden rounded-2xl border border-white/10 bg-gray-950 p-4 text-white shadow-lg shadow-black/15">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,144,224,0.16),transparent_42%)]"
            aria-hidden
          />
          <div className="relative">
            <CompactIdentityQuote
              aiError={aiError}
              aiLoading={aiLoading}
              interactiveAiBlockedByGenreBackfill={interactiveAiBlockedByGenreBackfill}
              profileDescription={profileDescription}
            />
            {aiCached ? (
              <p className="mt-3 text-[0.65rem] text-white/40" title={t("aiCached")}>
                {t("aiCached")}
              </p>
            ) : null}
            {showAiUnavailable ? (
              <p className="mt-3 text-xs leading-5 text-white/45">{t("aiUnavailable")}</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

export function MusicalProfileNoDataMobileView({ locale }: { locale: string }) {
  const t = useTranslations("musical-profile");
  return (
    <div className="-mx-4 -mt-4 space-y-4 pb-8 lg:hidden">
      <section className="relative overflow-hidden bg-gray-950 px-4 pb-6 pt-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.4),transparent_36%),radial-gradient(circle_at_85%_20%,rgba(6,182,212,0.24),transparent_32%),linear-gradient(160deg,rgba(3,7,18,0.98),rgba(76,29,149,0.72))]" />
        <CinematicFloatingOrbs />
        <CinematicFilmGrain />
        <CinematicLightSweep />
        <div className="relative space-y-4">
          <div className="flex justify-end">
            <MusicalProfilePeriodBadge locale={locale} variant="mobile" className="min-w-0" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
              {t("mobile.signatureLabel")}
            </p>
            <h1 className="mt-2 max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
              {t("mobile.emptyTitle")}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-white/62">{t("mobile.emptyLead")}</p>
          </div>
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {t("mobile.emptyCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
