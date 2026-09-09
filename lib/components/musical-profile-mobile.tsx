"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  MusicalProfileDestinations,
  MusicalProfileIdentity,
  MusicalProfileMasthead,
  MusicalProfileMetricStrip,
} from "@/lib/components/musical-profile-chrome";
import { MusicalProfileSpotlight } from "@/lib/components/musical-profile-spotlight";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
} from "@/lib/components/dashboard-ui";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { useWaitingForImportDemoHref } from "@/lib/components/waiting-for-import-demo";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";

const MOBILE_CANVAS = "space-y-8 pb-8 lg:hidden";

export function MobileMusicalProfileView({
  aiCached,
  aiError,
  aiLoading,
  artistsLoading,
  interactiveAiBlockedByGenreBackfill,
  locale,
  peakDay,
  peakHour,
  profileDescription,
  seeAllArtistsHref,
  showAiUnavailable,
  aiUnavailableReason,
  topArtists,
  totalListens,
  totalPlayTime,
  uniqueArtists,
  uniqueTracks,
  withFilters,
  onOpenArtistInsights,
}: {
  aiCached?: boolean;
  aiError: Error | null;
  aiLoading: boolean;
  artistsLoading: boolean;
  interactiveAiBlockedByGenreBackfill: boolean;
  locale: string;
  peakDay?: TemporalAnalysisDto["peakDay"];
  peakHour?: TemporalAnalysisDto["peakHour"];
  profileDescription: string;
  seeAllArtistsHref: string;
  showAiUnavailable?: boolean;
  aiUnavailableReason?: AiUnavailableReason;
  topArtists: ArtistStatsDto[];
  totalListens?: number;
  totalPlayTime?: number;
  uniqueArtists?: number;
  uniqueTracks?: number;
  withFilters: (href: string) => string;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  return (
    <div className={MOBILE_CANVAS}>
      <MusicalProfileMasthead compact>
        <MusicalProfileIdentity
          titleId="musical-profile-mobile-identity-title"
          dense
          aiCached={aiCached}
          aiError={aiError}
          aiLoading={aiLoading}
          interactiveAiBlockedByGenreBackfill={interactiveAiBlockedByGenreBackfill}
          profileDescription={profileDescription}
          showAiUnavailable={showAiUnavailable}
          aiUnavailableReason={aiUnavailableReason}
        />
      </MusicalProfileMasthead>
      <MusicalProfileMetricStrip
        locale={locale}
        totalListens={totalListens}
        totalPlayTime={totalPlayTime}
        uniqueArtists={uniqueArtists}
        uniqueTracks={uniqueTracks}
        peakDay={peakDay}
        peakHour={peakHour}
      />
      <MusicalProfileSpotlight
        titleId="musical-profile-mobile-signature-title"
        artists={topArtists}
        isLoading={artistsLoading}
        locale={locale}
        seeAllHref={seeAllArtistsHref}
        onOpenArtistInsights={onOpenArtistInsights}
      />
      <MusicalProfileDestinations
        titleId="musical-profile-mobile-explore-title"
        yourMusicHref={withFilters("/dashboard/overview")}
        chatHref={withFilters("/dashboard/ask-your-soundprint")}
        duetHref={withFilters("/dashboard/duet/friends")}
      />
    </div>
  );
}

export function MusicalProfileMobileSkeleton({ locale }: { locale: string }) {
  return (
    <div className={MOBILE_CANVAS} aria-busy="true">
      <MusicalProfileMasthead compact />
      <MusicalProfileMetricStrip locale={locale} loading />
      <ReplayRankingSkeleton count={4} />
    </div>
  );
}

export function MusicalProfileMobileError({
  error,
  onRetry,
}: {
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("musical-profile");
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={t("title")} description={t("mobile.errorLead")}>
        {isQuota ? (
          <div className="mt-4">
            <GroqQuotaNotice error={error} />
          </div>
        ) : (
          <button type="button" onClick={onRetry} className={`${DASHBOARD_BTN_OUTLINE} mt-4 w-full`}>
            {tCommon("retry")}
          </button>
        )}
      </OverviewHeroFrame>
    </div>
  );
}

export function MusicalProfileNoDataMobileView() {
  const t = useTranslations("musical-profile");
  const demoHref = useWaitingForImportDemoHref("/dashboard/musical-profile");

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={t("mobile.emptyTitle")} description={t("mobile.emptyLead")}>
        <div className="mt-6 flex flex-col gap-3">
          <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={`${DASHBOARD_BTN_OUTLINE} w-full`}>
            {t("mobile.emptyCta")}
          </Link>
          <Link href={demoHref} className={`${DASHBOARD_BTN_GHOST} w-full`}>
            {t("mobile.emptyDemoCta")}
          </Link>
        </div>
      </OverviewHeroFrame>
    </div>
  );
}
