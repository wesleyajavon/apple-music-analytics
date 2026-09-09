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
  buildGenresSectionHref,
  isGenresLocalView,
  type GenresLocalView,
  type GenresSection,
} from "@/lib/utils/genres-section";

export function GenresSectionSwitcher({
  idPrefix,
  activeSection,
  onLocalViewChange,
}: {
  idPrefix: string;
  activeSection: GenresSection;
  onLocalViewChange?: (view: GenresLocalView) => void;
}) {
  const t = useTranslations("genres.viewSwitcher");
  const searchParams = useSearchParams();
  const router = useRouter();

  const items: DashboardSectionItem<GenresSection>[] = [
    { id: "spotlight", label: t("views.spotlight") },
    { id: "distribution", label: t("views.distribution") },
    { id: "ranking", label: t("views.ranking") },
    { id: "trends", label: t("views.trends") },
  ];

  const onChange = useCallback(
    (section: GenresSection) => {
      if (section === activeSection) return;
      if (onLocalViewChange && isGenresLocalView(section)) {
        onLocalViewChange(section);
        return;
      }
      router.push(buildGenresSectionHref(section, searchParams));
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
