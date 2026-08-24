"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type DuetMobileSubNavProps = {
  current: "friends" | "compare";
  withFilters: (href: string) => string;
};

export function DuetMobileSubNav({ current, withFilters }: DuetMobileSubNavProps) {
  const t = useTranslations("duet.friends");
  const friendsActive = current === "friends";
  const compareActive = current === "compare";

  return (
    <div
      role="group"
      aria-label={t("duetNavLabel")}
      className="inline-flex w-full gap-1 rounded-xl border border-white/15 bg-white/10 p-1"
    >
      {friendsActive ? (
        <span
          aria-current="page"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-gray-950 shadow-sm"
        >
          {t("duetNavFriends")}
        </span>
      ) : (
        <Link
          href={withFilters("/dashboard/duet/friends")}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white/70 no-underline"
        >
          {t("duetNavFriends")}
        </Link>
      )}
      {compareActive ? (
        <span
          aria-current="page"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-gray-950 shadow-sm"
        >
          {t("duetNavCompare")}
        </span>
      ) : (
        <Link
          href={withFilters("/dashboard/duet/compare")}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white/70 no-underline"
        >
          {t("duetNavCompare")}
        </Link>
      )}
    </div>
  );
}
