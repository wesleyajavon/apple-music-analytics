"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Swords, Users } from "lucide-react";

const DUET_SUB_NAV_SHELL =
  "flex w-full flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-black/30";

type DuetSubNavProps = {
  className?: string;
};

export function DuetSubNav({ className = "" }: DuetSubNavProps) {
  const t = useTranslations("duet.friends");
  const pathname = usePathname();

  const segments = [
    {
      href: "/dashboard/duet/friends",
      label: t("duetNavFriends"),
      icon: Users,
      active: pathname.endsWith("/duet/friends"),
    },
    {
      href: "/dashboard/duet/compare",
      label: t("duetNavCompare"),
      icon: Swords,
      active: pathname.endsWith("/duet/compare"),
    },
  ] as const;

  return (
    <nav aria-label={t("duetNavLabel")} className={`${DUET_SUB_NAV_SHELL} ${className}`.trim()}>
      {segments.map((segment) => {
        const Icon = segment.icon;
        return (
          <Link
            key={segment.href}
            href={segment.href}
            aria-current={segment.active ? "page" : undefined}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold no-underline transition-all sm:flex-none ${
              segment.active
                ? "bg-white text-violet-800 shadow-sm dark:bg-violet-500/20 dark:text-violet-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {segment.label}
          </Link>
        );
      })}
    </nav>
  );
}
