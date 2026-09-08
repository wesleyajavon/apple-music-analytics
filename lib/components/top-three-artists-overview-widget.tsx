"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import {
  SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT,
  SpotlightArtistsFeaturedList,
} from "@/lib/components/spotlight-artists-featured-list";
import { ErrorState } from "@/lib/components/error-state";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";

export type TopThreeArtistsOverviewWidgetProps = {
  startDate?: string;
  endDate?: string;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
};

function SpotlightSectionChrome({
  eyebrow,
  title,
  description,
  seeAllHref,
  seeAllLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  seeAllHref: string;
  seeAllLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full min-w-0" aria-labelledby="overview-spotlight-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
          <h2 id="overview-spotlight-title" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        <Link href={seeAllHref} className={`${DASHBOARD_BTN_GHOST} shrink-0 self-start`}>
          {seeAllLabel}
        </Link>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function SpotlightArtistsSkeleton() {
  return (
    <div className="w-full min-w-0" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[3/4] w-full animate-pulse rounded-[22px] bg-black/10 dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

/**
 * Overview spotlight artists (up to 10): Replay tiles + page selector.
 */
export function TopThreeArtistsOverviewWidget({
  startDate,
  endDate,
  onOpenArtistInsights,
}: TopThreeArtistsOverviewWidgetProps) {
  const tArtists = useTranslations("artists");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();

  const { data, isLoading, error, refetch } = useArtistStats(
    startDate,
    endDate,
    viewerUserId,
    SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT
  );

  const topArtists = (data?.topArtists ?? []).slice(0, SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT);

  const artistsQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [startDate, endDate, viewerUserId]);

  const chrome = {
    eyebrow: tOverview("artistSpotlight.badge"),
    title: tOverview("artistSpotlight.title"),
    seeAllHref: `/dashboard/artists${artistsQuery}`,
    seeAllLabel: tOverview("seeAll"),
  };

  if (isLoading) {
    return (
      <SpotlightSectionChrome {...chrome} description={tOverview("artistSpotlight.description")}>
        <SpotlightArtistsSkeleton />
      </SpotlightSectionChrome>
    );
  }

  if (error) {
    return (
      <SpotlightSectionChrome {...chrome} description={tOverview("artistSpotlight.description")}>
        <ErrorState error={error} message={tArtists("errorLoading")} onRetry={() => refetch()} />
      </SpotlightSectionChrome>
    );
  }

  if (topArtists.length === 0) {
    return (
      <SpotlightSectionChrome {...chrome}>
        <p className="text-[13px] text-muted">{tArtists("mobile.emptyTitle")}</p>
      </SpotlightSectionChrome>
    );
  }

  return (
    <SpotlightSectionChrome {...chrome} description={tOverview("artistSpotlight.description")}>
      <SpotlightArtistsFeaturedList
        artists={topArtists}
        t={tArtists}
        locale={locale}
        onArtistSelect={onOpenArtistInsights}
        maxArtists={SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT}
        pageRangeLabel={(start, end) => tOverview("artistSpotlight.pageRange", { start, end })}
        pagesNavLabel={tOverview("artistSpotlight.pagesNav")}
        previousPageLabel={tOverview("artistSpotlight.previousPage")}
        nextPageLabel={tOverview("artistSpotlight.nextPage")}
      />
    </SpotlightSectionChrome>
  );
}
