"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  DashboardSectionSwitcher,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import {
  ARTISTS_LOCAL_VIEWS,
  buildArtistsSectionHref,
  isArtistsLocalView,
  type ArtistsLocalView,
  type ArtistsSection,
} from "@/lib/utils/artists-section";

export const ARTISTS_VIEWS = ARTISTS_LOCAL_VIEWS;
export type ArtistsView = ArtistsLocalView;

export function ArtistsViewSwitcher({
  idPrefix,
  activeSection,
  onLocalViewChange,
}: {
  idPrefix: string;
  activeSection: ArtistsSection;
  onLocalViewChange?: (view: ArtistsLocalView) => void;
}) {
  const t = useTranslations("artists.viewSwitcher");
  const searchParams = useSearchParams();
  const router = useRouter();

  const items: DashboardSectionItem<ArtistsSection>[] = [
    { id: "spotlight", label: t("views.spotlight") },
    { id: "leaderboard", label: t("views.leaderboard") },
    { id: "ranking", label: t("views.ranking") },
    { id: "trends", label: t("views.trends") },
  ];

  const onChange = useCallback(
    (section: ArtistsSection) => {
      if (section === activeSection) return;
      if (onLocalViewChange && isArtistsLocalView(section)) {
        onLocalViewChange(section);
        return;
      }
      router.push(buildArtistsSectionHref(section, searchParams));
    },
    [activeSection, onLocalViewChange, router, searchParams]
  );

  return (
    <DashboardSectionSwitcher
      items={items}
      activeView={activeSection}
      onChange={onChange}
      idPrefix={idPrefix}
      navLabel={t("navLabel")}
    />
  );
}
