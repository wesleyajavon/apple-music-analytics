"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";

type DuetMobileSubNavProps = {
  current: "friends" | "compare" | "music";
  withFilters: (href: string) => string;
};

const SEGMENTS = [
  { id: "music" as const, href: "/dashboard/duet/music", labelKey: "duetNavMusic" as const },
  { id: "compare" as const, href: "/dashboard/duet/compare", labelKey: "duetNavCompare" as const },
  { id: "friends" as const, href: "/dashboard/duet/friends", labelKey: "duetNavFriends" as const },
];

export function DuetMobileSubNav({ current, withFilters }: DuetMobileSubNavProps) {
  const t = useTranslations("duet.friends");

  return (
    <div role="group" aria-label={t("duetNavLabel")} className={`${DASHBOARD_SEGMENTED_TRACK} w-full`}>
      {SEGMENTS.map((segment) => {
        const active = current === segment.id;
        if (active) {
          return (
            <span key={segment.id} aria-current="page" className={`${DASHBOARD_SEGMENTED_PILL_ACTIVE} flex-1`}>
              {t(segment.labelKey)}
            </span>
          );
        }
        return (
          <Link
            key={segment.id}
            href={withFilters(segment.href)}
            className={`${DASHBOARD_SEGMENTED_PILL} flex-1 no-underline`}
          >
            {t(segment.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
