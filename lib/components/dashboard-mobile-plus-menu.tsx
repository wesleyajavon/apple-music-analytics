"use client";

import { useEffect, useId, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AiMasterToggleSwitch } from "@/lib/components/ai-master-toggle-switch";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import {
  usePublicDemoViewer,
  useSupabaseAuthUserId,
} from "@/lib/hooks/use-public-demo-viewer";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

type PlusNavItem = {
  href: string;
  labelKey: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  badgeKey?: "newAiBadge" | "featuredBadge" | "betaBadge";
};

type PlusNavSection = {
  groupKey: "patterns" | "library" | "aiPredictions" | "social";
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
  timeline: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18 9 11.25l4.5 4.5L21.75 7M21.75 7h-5.25M21.75 7v5.25"
      />
    </svg>
  ),
  genres: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.331-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
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
      { href: "/dashboard/timeline", labelKey: "timeline", icon: icons.timeline },
      { href: "/dashboard/temporal-analysis", labelKey: "temporalAnalysis", icon: icons.clock },
    ],
  },
  {
    groupKey: "library",
    items: [{ href: "/dashboard/genres", labelKey: "genres", icon: icons.genres }],
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
        badgeKey: "betaBadge",
      },
      { href: "/dashboard/ai-insights", labelKey: "aiInsights", icon: icons.aiInsights },
    ],
  },
];

const ABOUT_ITEM: PlusNavItem = {
  href: "/dashboard/about",
  labelKey: "about",
  icon: icons.about,
};

function isPlusLinkActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PlusNavLink({
  item,
  pathname,
  href,
  onClose,
  label,
}: {
  item: PlusNavItem;
  pathname: string;
  href: string;
  onClose: () => void;
  label: string;
}) {
  const t = useTranslations("sidebar");
  const active = isPlusLinkActive(item.href, pathname);
  return (
    <Link
      href={href}
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
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {item.badgeKey ? (
        <span
          className={
            item.badgeKey === "betaBadge"
              ? "shrink-0 rounded-full border border-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:border-white/12 dark:text-slate-500"
              : "shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
          }
        >
          {t(item.badgeKey)}
        </span>
      ) : null}
    </Link>
  );
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
                {section.items.map((item) => (
                  <li key={item.href}>
                    <PlusNavLink
                      item={item}
                      pathname={pathname}
                      href={withFilters(item.href)}
                      onClose={onClose}
                      label={t(`items.${item.labelKey}`)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-card-border pt-3">
          <PlusNavLink
            item={ABOUT_ITEM}
            pathname={pathname}
            href={withFilters(ABOUT_ITEM.href)}
            onClose={onClose}
            label={t(`items.${ABOUT_ITEM.labelKey}`)}
          />
        </div>
      </div>
    </MobileBottomSheet>
  );
}

export function usePlusNavActive(pathname: string): boolean {
  if (pathname.startsWith("/dashboard/duet")) return true;
  if (isPlusLinkActive(ABOUT_ITEM.href, pathname)) return true;
  return PLUS_SECTIONS.some((section) =>
    section.items.some((item) => isPlusLinkActive(item.href, pathname)),
  );
}
