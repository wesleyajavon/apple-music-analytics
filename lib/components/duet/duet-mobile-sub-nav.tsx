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

export function DuetMobileSubNav({ current, withFilters }: DuetMobileSubNavProps) {
  const t = useTranslations("duet.friends");
  const friendsActive = current === "friends";
  const compareActive = current === "compare";

  return (
    <div role="group" aria-label={t("duetNavLabel")} className={`${DASHBOARD_SEGMENTED_TRACK} w-full`}>
      {friendsActive ? (
        <span aria-current="page" className={`${DASHBOARD_SEGMENTED_PILL_ACTIVE} flex-1`}>
          {t("duetNavFriends")}
        </span>
      ) : (
        <Link
          href={withFilters("/dashboard/duet/friends")}
          className={`${DASHBOARD_SEGMENTED_PILL} flex-1 no-underline`}
        >
          {t("duetNavFriends")}
        </Link>
      )}
      {compareActive ? (
        <span aria-current="page" className={`${DASHBOARD_SEGMENTED_PILL_ACTIVE} flex-1`}>
          {t("duetNavCompare")}
        </span>
      ) : (
        <Link
          href={withFilters("/dashboard/duet/compare")}
          className={`${DASHBOARD_SEGMENTED_PILL} flex-1 no-underline`}
        >
          {t("duetNavCompare")}
        </Link>
      )}
    </div>
  );
}
