"use client";

import { useTranslations } from "next-intl";
import {
  DashboardSectionSwitcher,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";

export const ARTISTS_VIEWS = ["spotlight", "leaderboard", "ranking"] as const;
export type ArtistsView = (typeof ARTISTS_VIEWS)[number];

export function ArtistsViewSwitcher({
  idPrefix,
  activeView,
  onChange,
}: {
  idPrefix: string;
  activeView: ArtistsView;
  onChange: (view: ArtistsView) => void;
}) {
  const t = useTranslations("artists.viewSwitcher");
  const items: DashboardSectionItem<ArtistsView>[] = [
    { id: "spotlight", label: t("views.spotlight") },
    { id: "leaderboard", label: t("views.leaderboard") },
    { id: "ranking", label: t("views.ranking") },
  ];

  return (
    <DashboardSectionSwitcher
      items={items}
      activeView={activeView}
      onChange={onChange}
      idPrefix={idPrefix}
      navLabel={t("navLabel")}
    />
  );
}
