"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, LineChart, ListMusic } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  DashboardSectionSwitcher,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import {
  buildTracksSectionHref,
  isTracksLocalView,
  type TracksLocalView,
  type TracksSection,
} from "@/lib/utils/tracks-section";

export function TracksSectionSwitcher({
  idPrefix,
  activeSection,
  onLocalViewChange,
}: {
  idPrefix: string;
  activeSection: TracksSection;
  onLocalViewChange?: (view: TracksLocalView) => void;
}) {
  const t = useTranslations("tracks.viewSwitcher");
  const searchParams = useSearchParams();
  const router = useRouter();

  const items: DashboardSectionItem<TracksSection>[] = [
    { id: "leaderboard", label: t("views.leaderboard"), icon: BarChart3 },
    { id: "ranking", label: t("views.ranking"), icon: ListMusic },
    { id: "trends", label: t("views.trends"), icon: LineChart },
  ];

  const onChange = useCallback(
    (section: TracksSection) => {
      if (section === activeSection) return;
      if (onLocalViewChange && isTracksLocalView(section)) {
        onLocalViewChange(section);
        return;
      }
      router.push(buildTracksSectionHref(section, searchParams));
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
