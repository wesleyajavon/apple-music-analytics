"use client";

import { useEffect, useId, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AiMasterToggleSwitch } from "@/lib/components/ai-master-toggle-switch";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { useMobileSidebar } from "@/lib/components/sidebar";
import {
  usePublicDemoViewer,
  useSupabaseAuthUserId,
} from "@/lib/hooks/use-public-demo-viewer";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

type PlusNavItem = {
  href: string;
  labelKey: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  badgeKey?: "newAiBadge" | "featuredBadge";
};

type PlusNavSection = {
  groupKey: "patterns" | "library" | "aiPredictions" | "helpProduct" | "account" | "social";
  items: PlusNavItem[];
};

const icons = {
  heatmap: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-1.333-2.532 3.75 3.75 0 0 0 2.763 6.453Z"
      />
    </svg>
  ),
  clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  tracks: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
      />
    </svg>
  ),
  musicalProfile: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  ),
  palette: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm6.75-3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm4.5 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
      />
    </svg>
  ),
  askSoundprint: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
      />
    </svg>
  ),
  aiInsights: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
  trends: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
    </svg>
  ),
  settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
  duetUsers: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  duetCompare: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  about: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
      />
    </svg>
  ),
};

const PLUS_SECTIONS: PlusNavSection[] = [
  {
    groupKey: "patterns",
    items: [
      { href: "/dashboard/heatmap", labelKey: "heatmap", icon: icons.heatmap },
      { href: "/dashboard/temporal-analysis", labelKey: "temporalAnalysis", icon: icons.clock },
    ],
  },
  {
    groupKey: "library",
    items: [
      { href: "/dashboard/tracks", labelKey: "tracks", icon: icons.tracks },
      { href: "/dashboard/musical-profile", labelKey: "musicalProfile", icon: icons.musicalProfile },
      { href: "/dashboard/genres/palette", labelKey: "palette", icon: icons.palette },
    ],
  },
  {
    groupKey: "social",
    items: [
      { href: "/dashboard/duet/friends", labelKey: "duetFriends", icon: icons.duetUsers },
      { href: "/dashboard/duet/compare", labelKey: "duetCompare", icon: icons.duetCompare },
    ],
  },
  {
    groupKey: "aiPredictions",
    items: [
      {
        href: "/dashboard/ask-your-soundprint",
        labelKey: "askSoundprint",
        icon: icons.askSoundprint,
        badgeKey: "newAiBadge",
      },
      { href: "/dashboard/ai-insights", labelKey: "aiInsights", icon: icons.aiInsights },
    ],
  },
  {
    groupKey: "helpProduct",
    items: [{ href: "/dashboard/about", labelKey: "about", icon: icons.about }],
  },
  {
    groupKey: "account",
    items: [{ href: "/dashboard/settings", labelKey: "settings", icon: icons.settings }],
  },
];

function isPlusLinkActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type DashboardMobilePlusMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function DashboardMobilePlusMenu({ open, onClose }: DashboardMobilePlusMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("sidebar");
  const tAi = useTranslations("aiMasterToggle");
  const titleId = useId();
  const { open: openFullSidebar, close: closeSidebar, isOpen: isSidebarOpen } = useMobileSidebar();

  const withFilters = useMemo(
    () => (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams],
  );
  const userIdFromUrl = searchParams.get("userId");
  const isPublicDemoViewer = usePublicDemoViewer(userIdFromUrl);
  const authUserId = useSupabaseAuthUserId();

  const visibleSections = useMemo(() => {
    const hideDuet = isPublicDemoViewer || authUserId === null || authUserId === undefined;
    return PLUS_SECTIONS.map((section) => {
      if (section.groupKey !== "social" || !hideDuet) return section;
      return { ...section, items: [] };
    }).filter((section) => section.items.length > 0);
  }, [authUserId, isPublicDemoViewer]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  useEffect(() => {
    if (open && isSidebarOpen) {
      closeSidebar();
    }
  }, [open, isSidebarOpen, closeSidebar]);

  const handleOpenFullMenu = () => {
    onClose();
    openFullSidebar();
  };

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      insetAboveBottomNav
    >
      <div className="px-4 pb-2 pt-1">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
            {t("mobilePlusSheetTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-card-border text-muted transition-colors hover:bg-card-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("closeMenu")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-card-border bg-card-surface/90 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{tAi("label")}</p>
            <p className="text-[11px] leading-snug text-muted">{t("mobilePlusAiHint")}</p>
          </div>
          <AiMasterToggleSwitch showLabel={false} />
        </div>

        <div className="space-y-5">
          {visibleSections.map((section) => (
            <div key={section.groupKey}>
              <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {t(`groups.${section.groupKey}`)}
              </p>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isPlusLinkActive(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={withFilters(item.href)}
                        onClick={onClose}
                        className={[
                          "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-card-surface active:bg-card-surface",
                        ].join(" ")}
                        aria-current={active ? "page" : undefined}
                      >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{t(`items.${item.labelKey}`)}</span>
                        {item.badgeKey ? (
                          <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            {t(item.badgeKey)}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleOpenFullMenu}
          className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-card-border bg-card-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-primary/5 hover:text-primary"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {t("mobilePlusOpenFullMenu")}
        </button>
        <p className="mt-2 px-1 text-center text-[11px] text-muted">{t("mobilePlusHint")}</p>
      </div>
    </MobileBottomSheet>
  );
}

export function usePlusNavActive(pathname: string): boolean {
  return PLUS_SECTIONS.some((section) =>
    section.items.some((item) => isPlusLinkActive(item.href, pathname)),
  );
}
