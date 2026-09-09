"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";

export { buildCompareFriendHref } from "@/lib/utils/duet-compare-href";

export type DuetCompareSection = "overview" | "shared" | "target";

const SECTIONS: {
  id: DuetCompareSection;
  labelKey: "sectionOverview" | "sectionShared" | "sectionTarget";
}[] = [
  { id: "overview", labelKey: "sectionOverview" },
  { id: "shared", labelKey: "sectionShared" },
  { id: "target", labelKey: "sectionTarget" },
];

export function isDuetCompareSection(value: string | null | undefined): value is DuetCompareSection {
  return value === "overview" || value === "shared" || value === "target";
}

export function resolveCompareSection(searchParams: {
  get: (key: string) => string | null;
}): DuetCompareSection {
  const section = searchParams.get("section");
  if (isDuetCompareSection(section)) return section;

  const hasTargetDeepLink =
    searchParams.get("arenaMode") ||
    searchParams.get("entityType") ||
    searchParams.get("entityId");

  if (hasTargetDeepLink) return "target";
  return "overview";
}

type DuetCompareSectionTabsProps = {
  activeSection: DuetCompareSection;
};

export function DuetCompareSectionTabs({ activeSection }: DuetCompareSectionTabsProps) {
  const t = useTranslations("duet.compare");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setSection = useCallback(
    (section: DuetCompareSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("section", section);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <nav aria-label={t("sectionNavLabel")}>
      <div
        role="tablist"
        className={`${DASHBOARD_SEGMENTED_TRACK} w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {SECTIONS.map(({ id, labelKey }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setSection(id)}
              className={isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function buildCompareTargetParams(
  baseParams: URLSearchParams,
  artistId: string,
  artistName: string
): URLSearchParams {
  const params = new URLSearchParams(baseParams.toString());
  params.set("section", "target");
  params.set("arenaMode", "artist");
  params.set("entityType", "artist");
  params.set("entityId", artistId);
  params.set("entityName", artistName);
  return params;
}
