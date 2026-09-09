"use client";

import { useId, useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { DashboardSectionPanel } from "@/lib/components/dashboard-section-switcher";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
} from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import {
  GenresCanvasSection,
  GenresMasthead,
  GenresMetricStrip,
  GenresPaletteLink,
} from "@/lib/components/genres-chrome";
import {
  GenreDistributionChart,
  type GenreChartType,
} from "@/lib/components/genres-distribution-chart";
import type { GenreChartRow } from "@/lib/components/genres-ranking-list";
import { GenresSectionSwitcher } from "@/lib/components/genres-section-switcher";
import { GenresSpotlight } from "@/lib/components/genres-spotlight";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";
import { useWaitingForImportDemoHref } from "@/lib/components/waiting-for-import-demo";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import type { GenresLocalView } from "@/lib/utils/genres-section";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";

const MOBILE_CANVAS = "space-y-8 pb-8 lg:hidden";

function formatShare(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(share);
}

export type GenreMobileArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export function GenresMobileSkeleton() {
  const locale = useLocale();
  return (
    <div className={MOBILE_CANVAS} aria-busy="true">
      <GenresMasthead compact />
      <GenresMetricStrip locale={locale} loading />
      <ReplayRankingSkeleton />
    </div>
  );
}

export function GenresMobileEmpty() {
  const t = useTranslations("genres.mobile");
  const demoHref = useWaitingForImportDemoHref("/dashboard/genres");

  return (
    <div className={MOBILE_CANVAS}>
      <OverviewHeroFrame compact title={t("emptyTitle")} description={t("emptyLead")}>
        <div className="mt-6 flex flex-col gap-3">
          <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={`${DASHBOARD_BTN_OUTLINE} w-full`}>
            {t("emptyCta")}
          </Link>
          <Link href={demoHref} className={`${DASHBOARD_BTN_GHOST} w-full`}>
            {t("emptyDemoCta")}
          </Link>
        </div>
      </OverviewHeroFrame>
    </div>
  );
}

export function GenresMobileError({
  error,
  onRetry,
}: {
  locale?: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("genres");
  const tm = useTranslations("genres.mobile");
  const tCommon = useTranslations("common");
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_CANVAS}>
      <GenresMasthead compact />
      <OverviewHeroFrame compact title={t("title")} description={tm("errorLead")}>
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

export function GenreDetailSheet({
  genre,
  artists,
  locale,
  open,
  onClose,
}: {
  genre: GenreChartRow | null;
  artists: GenreMobileArtist[];
  locale: string;
  open: boolean;
  onClose: () => void;
}) {
  const tm = useTranslations("genres.mobile");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      insetAboveBottomNav
    >
      {genre ? (
        <div className="px-4 pb-2 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight text-foreground">
                {genre.name}
              </h2>
              <p className="mt-1 text-sm tabular-nums text-muted">
                {tm("shareLabel", { share: formatShare(genre.percentage / 100, locale) })}
                {" · "}
                {tm("listenCount", { count: formatter.format(genre.count) })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tm("sheetCloseAria")}
            >
              {tCommon("close")}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-[13px] font-medium text-muted">{tm("sheetArtistsTitle")}</h3>
            {artists.length > 0 ? (
              <ul className="space-y-2">
                {artists.map((artist, index) => (
                  <li key={artist.id} className="flex min-h-11 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <ArtistAvatarHydrated
                        artistId={artist.id}
                        artistName={artist.name}
                        imageUrl={artist.imageUrl}
                        avatarApiSize={80}
                        colorIndex={index}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {artist.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted">{tm("sheetNoArtists")}</p>
            )}
          </div>
        </div>
      ) : null}
    </MobileBottomSheet>
  );
}

export function GenresMobileExperience({
  genreCount,
  totalListens,
  topGenreName,
  chartData,
  isLoading,
  locale,
  activeView,
  onViewChange,
  chartType,
  onChartTypeChange,
  chartDisplayData,
  rankingList,
  onSelectGenre,
  paletteHref,
  showPalette,
  paletteRestricted,
}: {
  genreCount?: number;
  totalListens?: number;
  topGenreName?: string;
  chartData: GenreChartRow[];
  isLoading: boolean;
  locale: string;
  activeView: GenresLocalView;
  onViewChange: (view: GenresLocalView) => void;
  chartType: GenreChartType;
  onChartTypeChange: (type: GenreChartType) => void;
  chartDisplayData: GenreChartRow[];
  rankingList: ReactNode;
  onSelectGenre: (genre: GenreChartRow) => void;
  paletteHref: string;
  showPalette: boolean;
  paletteRestricted: boolean;
}) {
  const t = useTranslations("genres");

  if (isLoading) return <GenresMobileSkeleton />;

  return (
    <div className={MOBILE_CANVAS}>
      <GenresMasthead compact />
      <GenresMetricStrip
        genreCount={genreCount}
        totalListens={totalListens}
        topGenreName={topGenreName}
        locale={locale}
      />
      {showPalette || paletteRestricted ? (
        <GenresPaletteLink href={paletteHref} restricted={paletteRestricted} />
      ) : null}

      <GenresSectionSwitcher
        idPrefix="genres-mobile"
        activeSection={activeView}
        onLocalViewChange={onViewChange}
      />

      <DashboardSectionPanel idPrefix="genres-mobile" view="spotlight" activeView={activeView}>
        <GenresSpotlight
          titleId="genres-mobile-spotlight-title"
          genres={chartData}
          isLoading={isLoading}
          locale={locale}
          onSelectGenre={onSelectGenre}
        />
      </DashboardSectionPanel>

      <DashboardSectionPanel idPrefix="genres-mobile" view="distribution" activeView={activeView}>
        <GenresCanvasSection
          titleId="genres-mobile-distribution-title"
          eyebrow={t("sections.distribution.eyebrow")}
          title={t("sections.distribution.title")}
          description={t("sections.distribution.description")}
        >
          <GenreDistributionChart
            chartType={chartType}
            onChartTypeChange={onChartTypeChange}
            isLoading={isLoading}
            chartDisplayData={chartDisplayData}
          />
        </GenresCanvasSection>
      </DashboardSectionPanel>

      <DashboardSectionPanel idPrefix="genres-mobile" view="ranking" activeView={activeView}>
        <GenresCanvasSection
          titleId="genres-mobile-ranking-title"
          eyebrow={t("sections.ranking.eyebrow")}
          title={t("sections.ranking.title")}
          description={t("sections.ranking.description")}
        >
          {rankingList}
        </GenresCanvasSection>
      </DashboardSectionPanel>
    </div>
  );
}
