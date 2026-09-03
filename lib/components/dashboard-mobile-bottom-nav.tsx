"use client";

import { useCallback, useMemo, useState, type RefCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  DashboardMobilePlusMenu,
  usePlusNavActive,
} from "@/lib/components/dashboard-mobile-plus-menu";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

type BottomNavIconProps = {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

type BottomNavItem = {
  href: string;
  labelKey: "musicalProfile" | "overview" | "askSoundprint" | "duetFriends" | "more";
  isMore?: boolean;
  isActive?: (pathname: string) => boolean;
  icon: (props: BottomNavIconProps) => JSX.Element;
};

const icons = {
  musicalProfile: (props: BottomNavIconProps) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  ),
  overview: (props: BottomNavIconProps) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  ),
  askSoundprint: ({ className, ...props }: BottomNavIconProps) => (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-950 ${className ?? ""}`}
      {...props}
    >
      <SoundprintLogo
        src="/brand/favicon.png"
        showText={false}
        alt=""
        imageClassName="h-5 w-5 object-contain"
      />
    </span>
  ),
  duetFriends: (props: BottomNavIconProps) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  ),
  more: (props: BottomNavIconProps) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
};

function isFriendsTabActive(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/duet/compare")) return false;
  return pathname === "/dashboard/duet" || pathname.startsWith("/dashboard/duet/");
}

const NAV_ITEMS: BottomNavItem[] = [
  { href: "/dashboard/musical-profile", labelKey: "musicalProfile", icon: icons.musicalProfile },
  { href: "/dashboard/overview", labelKey: "overview", icon: icons.overview },
  { href: "/dashboard/ask-your-soundprint", labelKey: "askSoundprint", icon: icons.askSoundprint },
  { href: "/dashboard/duet/friends", labelKey: "duetFriends", icon: icons.duetFriends, isActive: isFriendsTabActive },
  { href: "#more", labelKey: "more", isMore: true, icon: icons.more },
];

function isTabActive(item: BottomNavItem, pathname: string): boolean {
  if (item.isActive) return item.isActive(pathname);
  if (item.href === "/dashboard/musical-profile") {
    return pathname === "/dashboard" || pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DashboardMobileBottomNav({
  navRef,
}: {
  navRef?: RefCallback<HTMLElement | null>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");
  const [isPlusOpen, setIsPlusOpen] = useState(false);
  const closePlus = useCallback(() => setIsPlusOpen(false), []);
  const isPlusRouteActive = usePlusNavActive(pathname);

  const withFilters = useMemo(
    () => (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams],
  );

  if (pathname.includes("/dashboard/onboarding")) {
    return null;
  }

  return (
    <>
      <DashboardMobilePlusMenu open={isPlusOpen} onClose={closePlus} />
      <nav
        ref={navRef}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-card-border bg-surface-glass/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label={t("mobileBottomNavLabel")}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
          {NAV_ITEMS.map((item) => {
            const label = item.isMore
              ? tCommon("more")
              : item.labelKey === "musicalProfile"
                ? t("items.musicalProfileShort")
                : item.labelKey === "askSoundprint"
                  ? t("items.askSoundprintShort")
                  : t(`items.${item.labelKey}`);
            const active = item.isMore
              ? isPlusOpen || isPlusRouteActive
              : isTabActive(item, pathname);
            const className = [
              "flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
              active ? "text-primary" : "text-muted hover:text-foreground",
            ].join(" ");

            if (item.isMore) {
              return (
                <li key={item.labelKey} className="flex min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setIsPlusOpen((prev) => !prev)}
                    className={className}
                    aria-expanded={isPlusOpen}
                    aria-haspopup="dialog"
                    aria-label={t("mobilePlusOpenLabel")}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="truncate">{tCommon("more")}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.href} className="flex min-w-0 flex-1">
                <Link
                  href={withFilters(item.href)}
                  className={className}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsPlusOpen(false)}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
