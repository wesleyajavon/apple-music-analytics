"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Music2, Swords, Users } from "lucide-react";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";

type DuetSubNavProps = {
  className?: string;
};

export function DuetSubNav({ className = "" }: DuetSubNavProps) {
  const t = useTranslations("duet.friends");
  const pathname = usePathname();

  const segments = [
    {
      href: "/dashboard/duet/music",
      label: t("duetNavMusic"),
      icon: Music2,
      active: pathname.endsWith("/duet/music"),
    },
    {
      href: "/dashboard/duet/compare",
      label: t("duetNavCompare"),
      icon: Swords,
      active: pathname.endsWith("/duet/compare"),
    },
    {
      href: "/dashboard/duet/friends",
      label: t("duetNavFriends"),
      icon: Users,
      active: pathname.endsWith("/duet/friends"),
    },
  ] as const;

  return (
    <nav
      aria-label={t("duetNavLabel")}
      className={`${DASHBOARD_SEGMENTED_TRACK} w-full ${className}`.trim()}
    >
      {segments.map((segment) => {
        const Icon = segment.icon;
        return (
          <Link
            key={segment.href}
            href={segment.href}
            aria-current={segment.active ? "page" : undefined}
            className={`${segment.active ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL} flex-1 gap-2 no-underline sm:flex-none`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {segment.label}
          </Link>
        );
      })}
    </nav>
  );
}
