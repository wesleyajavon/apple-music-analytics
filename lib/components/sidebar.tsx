"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";

const STORAGE_KEY = "sidebar-collapsed";

interface NavItem {
  href: string;
  labelKey: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  featured?: boolean;
  badgeKey?: string;
  children?: NavItem[];
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const icons = {
  overview: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  ),
  musicalProfile: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  ),
  tracks: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553z" />
    </svg>
  ),
  artists: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  genres: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9v10.303a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553V5.25l10.5-3v10.303a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163V2.25" />
    </svg>
  ),
  trends: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
    </svg>
  ),
  palette: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm6.75-3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm4.5 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
    </svg>
  ),
  timeline: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.5 4.5L21.75 7M21.75 7h-5.25M21.75 7v5.25" />
    </svg>
  ),
  heatmap: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-1.333-2.532 3.75 3.75 0 0 0 2.763 6.453Z" />
    </svg>
  ),
  clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  aiInsights: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
  settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ),
};

const navGroups: NavGroup[] = [
  {
    labelKey: "home",
    items: [
      { href: "/dashboard/musical-profile", labelKey: "musicalProfile", icon: icons.musicalProfile },
      { href: "/dashboard/overview", labelKey: "overview", icon: icons.overview, featured: true },
    ],
  },
  {
    labelKey: "library",
    items: [
      {
        href: "/dashboard/tracks",
        labelKey: "tracks",
        icon: icons.tracks,
        children: [{ href: "/dashboard/tracks/trends", labelKey: "trackTrends", icon: icons.trends }],
      },
      {
        href: "/dashboard/artists",
        labelKey: "artists",
        icon: icons.artists,
        children: [{ href: "/dashboard/artists/trends", labelKey: "artistTrends", icon: icons.trends }],
      },
      {
        href: "/dashboard/genres",
        labelKey: "genres",
        icon: icons.genres,
        children: [
          { href: "/dashboard/genres/trends", labelKey: "genreTrends", icon: icons.trends },
          { href: "/dashboard/genres/palette", labelKey: "palette", icon: icons.palette },
        ],
      },
    ],
  },
  {
    labelKey: "patterns",
    items: [
      { href: "/dashboard/timeline", labelKey: "timeline", icon: icons.timeline },
      { href: "/dashboard/heatmap", labelKey: "heatmap", icon: icons.heatmap },
      { href: "/dashboard/temporal-analysis", labelKey: "temporalAnalysis", icon: icons.clock },
    ],
  },
  {
    labelKey: "aiPredictions",
    items: [
      {
        href: "/dashboard/ask-your-soundprint",
        labelKey: "askSoundprint",
        icon: icons.aiInsights,
        featured: true,
        badgeKey: "newAiBadge",
      },
      { href: "/dashboard/ai-insights", labelKey: "aiInsights", icon: icons.aiInsights },
      { href: "/dashboard/taste-evolution", labelKey: "tasteEvolution", icon: icons.trends },
    ],
  },
  {
    labelKey: "account",
    items: [{ href: "/dashboard/settings", labelKey: "settings", icon: icons.settings }],
  },
];

function getStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.href || !!item.children?.some((child) => isNavItemActive(child, pathname));
}

function getActiveParentKeys(groups: NavGroup[], pathname: string): string[] {
  return groups.flatMap((group) =>
    group.items
      .filter((item) => !!item.children?.some((child) => isNavItemActive(child, pathname)))
      .map((item) => item.href)
  );
}

function SidebarFallback() {
  return (
    <aside
      className="fixed top-0 left-0 z-40 h-screen w-64 flex-shrink-0 -translate-x-full border-r border-card-border bg-surface-sidebar shadow-card transition-all lg:sticky lg:top-0 lg:z-auto lg:translate-x-0"
      aria-hidden
    >
      <div className="min-h-[5.25rem] animate-pulse border-b border-card-border bg-card-surface" />
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-xl bg-card-surface"
          />
        ))}
      </div>
    </aside>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openNavKeys, setOpenNavKeys] = useState<Record<string, boolean>>({});
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(
    undefined
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const t = useTranslations("sidebar");
  const publicProfileUserId = useMemo(() => getPublicProfileUserId(), []);

  const withFilters = useMemo(
    () => (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams]
  );
  const isPublicDemoViewer = useMemo(
    () =>
      authUserId === null &&
      !!publicProfileUserId &&
      searchParams.get("userId") === publicProfileUserId,
    [authUserId, publicProfileUserId, searchParams]
  );
  const activeParentKeys = useMemo(
    () => getActiveParentKeys(navGroups, pathname),
    [pathname]
  );

  // Hydrate collapsed state from localStorage (SSR-safe)
  useEffect(() => {
    setIsCollapsed(getStoredCollapsed());
  }, []);

  useEffect(() => {
    if (activeParentKeys.length === 0) return;

    setOpenNavKeys((prev) => {
      let next = prev;
      for (const key of activeParentKeys) {
        if (!next[key]) {
          next = { ...next, [key]: true };
        }
      }
      return next;
    });
  }, [activeParentKeys]);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function loadAuthUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthEmail(data.user?.email ?? null);
      setAuthUserId(data.user?.id ?? null);
    }

    loadAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthEmail(session?.user?.email ?? null);
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/sign-in";
    } finally {
      setIsSigningOut(false);
    }
  }

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleNavItem = (key: string) => {
    setOpenNavKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (isPublicDemoViewer && item.href === "/dashboard/genres/palette") {
      return null;
    }

    const key = item.href;
    const hasChildren = !!item.children?.length;
    const isDirectActive = pathname === item.href;
    const isActive = isNavItemActive(item, pathname);
    const isOpen = !isCollapsed && hasChildren && !!openNavKeys[key];
    const isFeatured = !!item.featured;
    const Icon = item.icon;
    const label = t(`items.${item.labelKey}`);
    const itemClassName = `
      group flex items-center rounded-xl text-sm font-medium transition-all duration-200
      ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"}
      ${
        isActive
          ? isFeatured
            ? "bg-brand-gradient text-white shadow-brand-glow"
            : "bg-primary/10 text-primary"
          : isFeatured
            ? "bg-gradient-to-r from-primary/15 via-accent-violet/10 to-accent-cyan/10 text-foreground ring-1 ring-primary/20 shadow-sm hover:shadow-brand-glow"
            : "text-muted hover:text-foreground hover:bg-primary/10"
      }
    `;
    const iconClassName = `w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
      isFeatured
        ? isActive
          ? "text-white"
          : "text-primary"
        : isActive
          ? "text-primary"
          : "text-muted/75 group-hover:text-primary"
    }`;

    if (hasChildren) {
      return (
        <div key={key}>
          <div className={itemClassName}>
            <Link
              href={withFilters(item.href)}
              onClick={() => setIsMobileMenuOpen(false)}
              title={isCollapsed ? label : undefined}
              className={`flex min-w-0 flex-1 items-center ${isCollapsed ? "justify-center" : "gap-3"}`}
            >
              <Icon className={iconClassName} />
              {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
            </Link>
            {!isCollapsed && (
              <>
                {isDirectActive && <div className="w-1 h-5 rounded-full bg-brand-gradient shrink-0" />}
                <button
                  type="button"
                  onClick={() => toggleNavItem(key)}
                  className="-mr-1 rounded-md p-1 text-muted transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-expanded={isOpen}
                  aria-label={t(isOpen ? "collapseSection" : "expandSection", { label })}
                >
                  <svg
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                  </svg>
                </button>
              </>
            )}
          </div>
          {isOpen && (
            <div className="ml-5 mt-1 space-y-0.5 border-l border-card-border pl-2">
              {item.children?.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={key}
        href={withFilters(item.href)}
        onClick={() => setIsMobileMenuOpen(false)}
        title={isCollapsed ? label : undefined}
        className={`
          ${itemClassName}
          ${depth > 0 && !isCollapsed ? "py-2 text-[13px]" : ""}
        `}
      >
        <Icon className={iconClassName} />
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {isFeatured && !isDirectActive && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {t(item.badgeKey ?? "featuredBadge")}
              </span>
            )}
            {isDirectActive && <div className="w-1 h-5 rounded-full bg-brand-gradient shrink-0" />}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 rounded-xl text-muted bg-surface-glass border border-card-border shadow-card hover:text-primary hover:shadow-card-hover transition-all focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={t("openMenu")}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/55 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-out flex-shrink-0
          lg:sticky lg:top-0 lg:self-start lg:translate-x-0 lg:z-auto
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          w-64 ${isCollapsed ? "lg:w-20" : "lg:w-64"}
          bg-surface-sidebar
          border-r border-card-border
          shadow-[2px_0_18px_-8px_rgb(152_80_208_/_0.32)]
        `}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo + Toggle */}
          <div
            className={`flex items-center min-h-[5.25rem] py-3 border-b border-card-border transition-all duration-300 ${
              isCollapsed ? "px-3 justify-center" : "px-6"
            }`}
          >
            <Link
              href={isPublicDemoViewer ? "/" : withFilters("/dashboard")}
              className={`flex items-center gap-3 group ${isCollapsed ? "justify-center" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
              title={isCollapsed ? t("logo") : undefined}
            >
              <SoundprintLogo
                showText={false}
                imageClassName="h-12 w-12 rounded-xl shadow-brand-glow transition-transform group-hover:scale-105 ring-1 ring-card-border/40"
              />
              {!isCollapsed && (
                <div className="flex min-w-0 flex-col justify-center gap-0.5">
                  <span className="truncate text-xl font-bold tracking-tight text-foreground">{t("logo")}</span>
                  <span className="text-[11px] font-medium leading-snug text-muted">{t("tagline")}</span>
                </div>
              )}
            </Link>
          </div>

          {/* Desktop collapse toggle */}
          <div
            className={`hidden lg:flex px-2 py-2 border-b border-card-border ${
              isCollapsed ? "justify-center" : "justify-end"
            }`}
          >
            <button
              onClick={toggleCollapsed}
              className="p-2 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
              title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
            >
              <svg
                className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-5 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.labelKey} className="mb-6 last:mb-0">
                {!isCollapsed && (
                  <div className="px-3 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t(`groups.${group.labelKey}`)}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => renderNavItem(item))}
                </div>
              </div>
            ))}
          </nav>

          {/* Theme & Language switchers */}
          <div
            className={`px-3 py-4 border-t border-card-border space-y-4 transition-all duration-300 ${
              isCollapsed ? "flex flex-col items-center gap-2" : ""
            }`}
          >
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {t("appearance")}
                </span>
              </div>
            )}
            <div className={isCollapsed && !isMobileMenuOpen ? "w-full flex justify-center" : ""}>
              <ThemeSwitcher placement="top" collapsed={isCollapsed && !isMobileMenuOpen} />
            </div>
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {t("language")}
                </span>
              </div>
            )}
            <div className={isCollapsed && !isMobileMenuOpen ? "w-full flex justify-center" : ""}>
              <Suspense fallback={<div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
                <LanguageSwitcher collapsed={isCollapsed && !isMobileMenuOpen} />
              </Suspense>
            </div>
            {!isCollapsed && (
              <div className="space-y-2 px-3">
                {authEmail ? (
                  <>
                    <p
                      className="truncate text-xs text-muted"
                      title={authEmail}
                    >
                      {authEmail}
                    </p>
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full rounded-lg border border-card-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSigningOut ? t("signingOut") : t("signOut")}
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/sign-in"
                      className="rounded-lg border border-card-border px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
                    >
                      {t("signIn")}
                    </Link>
                    <Link
                      href="/sign-up"
                      className="rounded-lg bg-brand-gradient px-3 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-95"
                    >
                      {t("signUp")}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <SidebarContent />
    </Suspense>
  );
}
