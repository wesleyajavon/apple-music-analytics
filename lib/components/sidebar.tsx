"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { UserAvatar } from "@/lib/components/user-avatar";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { useDuetFriends } from "@/lib/hooks/use-duet";
import {
  DASHBOARD_GLASS_SIDEBAR,
  DASHBOARD_NAV_ITEM,
  DASHBOARD_NAV_ITEM_ACTIVE,
} from "@/lib/components/dashboard-ui";

const STORAGE_KEY = "sidebar-collapsed";
const SIDEBAR_PANE =
  `${DASHBOARD_GLASS_SIDEBAR} hidden rounded-[1.25rem] shadow-[0_8px_40px_rgb(23_19_33_/_0.08)] lg:fixed lg:bottom-3 lg:left-3 lg:top-3 lg:z-20 lg:flex lg:flex-col dark:shadow-[0_12px_40px_rgb(0_0_0_/_0.45)]`;
const SIDEBAR_SPACER_EXPANDED = "hidden lg:block lg:w-[17.5rem] lg:shrink-0";
const SIDEBAR_SPACER_COLLAPSED = "hidden lg:block lg:w-[6.5rem] lg:shrink-0";

interface NavItem {
  href: string;
  labelKey: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
      />
    </svg>
  ),
  artists: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
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
  /** Chat / assistant — Ask your Soundprint */
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
  spotifyLive: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25V6.75m3 10.5v-4.5m3 4.5v-7.5" />
    </svg>
  ),
  code: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8.25 15.75-4.5-3.75 4.5-3.75M15.75 8.25l4.5 3.75-4.5 3.75"
      />
    </svg>
  ),
  settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
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
};

const navGroups: NavGroup[] = [
  {
    labelKey: "home",
    items: [
      { href: "/dashboard/musical-profile", labelKey: "musicalProfile", icon: icons.musicalProfile },
      { href: "/dashboard/overview", labelKey: "overview", icon: icons.overview },
      {
        href: "/dashboard/ask-your-soundprint",
        labelKey: "askSoundprint",
        icon: icons.askSoundprint,
      },
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
      { href: "/dashboard/ai-insights", labelKey: "aiInsights", icon: icons.aiInsights },
    ],
  },
  {
    labelKey: "social",
    items: [
      { href: "/dashboard/duet/friends", labelKey: "duetFriends", icon: icons.duetUsers },
      { href: "/dashboard/duet/compare", labelKey: "duetCompare", icon: icons.duetCompare },
    ],
  },
  {
    labelKey: "account",
    items: [
      {
        href: "/dashboard/spotify-snapshot",
        labelKey: "spotifySnapshot",
        icon: icons.spotifyLive,
      },
      {
        href: "/dashboard/spotify-playground",
        labelKey: "spotifyPlayground",
        icon: icons.code,
      },
      { href: "/dashboard/settings", labelKey: "settings", icon: icons.settings },
    ],
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

function getActiveGroupKeys(groups: NavGroup[], pathname: string): string[] {
  return groups
    .filter((group) => group.items.some((item) => isNavItemActive(item, pathname)))
    .map((group) => group.labelKey);
}

function isNavGroupOpen(openGroupKeys: Record<string, boolean>, key: string): boolean {
  return openGroupKeys[key] ?? false;
}

function formatNavBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function PendingFriendRequestsNavBadge({
  count,
  collapsed,
  ariaLabel,
}: {
  count: number;
  collapsed: boolean;
  ariaLabel: string;
}) {
  if (count <= 0) return null;

  const label = formatNavBadgeCount(count);

  if (collapsed) {
    return (
      <span
        aria-label={ariaLabel}
        className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-background bg-foreground px-1 font-mono text-[10px] font-medium tabular-nums text-background"
      >
        {label}
      </span>
    );
  }

  return (
    <span
      aria-label={ariaLabel}
      className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums text-primary-foreground"
    >
      {label}
    </span>
  );
}

function SidebarFallback() {
  return (
    <>
      <div className={SIDEBAR_SPACER_EXPANDED} aria-hidden />
      <aside className={`${SIDEBAR_PANE} lg:w-64`} aria-hidden>
        <div className="min-h-14 animate-pulse px-4 pt-4" />
        <div className="space-y-1 px-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-[10px] bg-black/[0.05] dark:bg-white/10" />
          ))}
        </div>
      </aside>
    </>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openNavKeys, setOpenNavKeys] = useState<Record<string, boolean>>({});
  const [openGroupKeys, setOpenGroupKeys] = useState<Record<string, boolean>>({});
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null | undefined>(
    undefined
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const t = useTranslations("sidebar");
  const { publicProfileUserId } = usePublicDemo();
  const { data: duetFriendsData } = useDuetFriends({ enabled: !!authUserId });
  const pendingFriendRequestsCount = duetFriendsData?.pendingIncoming.length ?? 0;

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
  const activeGroupKeys = useMemo(
    () => getActiveGroupKeys(navGroups, pathname),
    [pathname]
  );
  const displayCollapsed = isCollapsed;
  const accountDisplayName = profileName?.trim() || authEmail || null;

  /** Évite de mettre en cache une navigation vers le dashboard principal tant que l’onboarding n’est pas marqué complété (sinon redirection → onboarding peut rester « collée » au prefetch). */
  const prefetchDashboardNav = !pathname.includes("/dashboard/onboarding");

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
    if (activeGroupKeys.length === 0) return;

    setOpenGroupKeys((prev) => {
      let next = prev;
      for (const key of activeGroupKeys) {
        if (!isNavGroupOpen(prev, key)) {
          next = { ...next, [key]: true };
        }
      }
      return next;
    });
  }, [activeGroupKeys]);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function loadProfile() {
      try {
        const res = await fetch("/api/user/me", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as {
          user?: {
            name: string | null;
            email: string | null;
            avatarUrl: string | null;
          } | null;
        };
        if (!mounted || !res.ok) return;
        setProfileName(data.user?.name ?? null);
        setAuthEmail(data.user?.email ?? null);
        setProfileAvatarUrl(data.user?.avatarUrl ?? null);
      } catch {
        // Keep auth metadata fallback if the profile endpoint is temporarily unavailable.
      }
    }

    async function loadAuthUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthEmail(data.user?.email ?? null);
      setAuthUserId(data.user?.id ?? null);
      if (data.user) void loadProfile();
      else {
        setProfileName(null);
        setProfileAvatarUrl(null);
      }
    }

    loadAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthEmail(session?.user?.email ?? null);
      setAuthUserId(session?.user?.id ?? null);
      if (session?.user) void loadProfile();
      else {
        setProfileName(null);
        setProfileAvatarUrl(null);
      }
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

  const toggleNavGroup = (key: string) => {
    setOpenGroupKeys((prev) => ({
      ...prev,
      [key]: !isNavGroupOpen(prev, key),
    }));
  };

  const renderNavItem = (item: NavItem) => {
    if (
      isPublicDemoViewer &&
      (item.href === "/dashboard/genres/palette" ||
        item.href === "/dashboard/spotify-playground" ||
        item.href.startsWith("/dashboard/duet"))
    ) {
      return null;
    }

    if (!authUserId && item.href.startsWith("/dashboard/duet")) {
      return null;
    }

    const key = item.href;
    const hasChildren = !!item.children?.length;
    const isActive = isNavItemActive(item, pathname);
    const isOpen = !displayCollapsed && hasChildren && !!openNavKeys[key];
    const Icon = item.icon;
    const label = t(`items.${item.labelKey}`);
    const showPendingFriendRequestsBadge =
      item.href === "/dashboard/duet/friends" && pendingFriendRequestsCount > 0;
    const pendingFriendRequestsBadgeLabel = showPendingFriendRequestsBadge
      ? t("pendingFriendRequestsBadge", { count: pendingFriendRequestsCount })
      : undefined;
    const itemClassName = `
      ${isActive ? DASHBOARD_NAV_ITEM_ACTIVE : DASHBOARD_NAV_ITEM}
      ${displayCollapsed ? "justify-center px-2" : "gap-3 px-3"}
    `;
    const iconClassName = `w-5 h-5 shrink-0 ${
      isActive ? "text-primary" : "text-muted/75 group-hover:text-foreground"
    }`;

    if (hasChildren) {
      return (
        <div key={key}>
          <div className={itemClassName}>
            <Link
              href={withFilters(item.href)}
              prefetch={prefetchDashboardNav}
              title={displayCollapsed ? label : undefined}
              className={`flex min-w-0 flex-1 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${displayCollapsed ? "justify-center" : "gap-3"}`}
            >
              <Icon className={iconClassName} />
              {!displayCollapsed && <span className="flex-1 truncate">{label}</span>}
            </Link>
            {!displayCollapsed && (
              <button
                type="button"
                onClick={() => toggleNavItem(key)}
                className="-mr-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.08]"
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
            )}
          </div>
          {isOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 pl-2">
              {item.children?.map((child) => renderNavItem(child))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={key}
        href={withFilters(item.href)}
        prefetch={prefetchDashboardNav}
        title={displayCollapsed ? label : undefined}
        className={itemClassName}
      >
        <span className="relative shrink-0">
          <Icon className={iconClassName} />
          {displayCollapsed && showPendingFriendRequestsBadge && pendingFriendRequestsBadgeLabel ? (
            <PendingFriendRequestsNavBadge
              count={pendingFriendRequestsCount}
              collapsed
              ariaLabel={pendingFriendRequestsBadgeLabel}
            />
          ) : null}
        </span>
        {!displayCollapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {showPendingFriendRequestsBadge && pendingFriendRequestsBadgeLabel ? (
              <PendingFriendRequestsNavBadge
                count={pendingFriendRequestsCount}
                collapsed={false}
                ariaLabel={pendingFriendRequestsBadgeLabel}
              />
            ) : null}
            {item.badgeKey ? (
              <span
                className={
                  item.badgeKey === "betaBadge"
                    ? "rounded-full border border-glass-hairline px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted"
                    : "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
                }
              >
                {t(item.badgeKey)}
              </span>
            ) : null}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      <div
        className={displayCollapsed ? SIDEBAR_SPACER_COLLAPSED : SIDEBAR_SPACER_EXPANDED}
        aria-hidden
      />
      <aside
        className={`${SIDEBAR_PANE} ${displayCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div
          className={`flex shrink-0 items-center gap-1 px-3 pt-3 ${
            displayCollapsed ? "flex-col" : "justify-between"
          }`}
        >
          <Link
            href={isPublicDemoViewer ? "/" : withFilters("/dashboard")}
            prefetch={isPublicDemoViewer ? undefined : prefetchDashboardNav}
            className="group inline-flex min-w-0 items-center rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={displayCollapsed ? t("logo") : undefined}
          >
            <SoundprintBrandMark
              size="md"
              layout="inline"
              showWordmark={!displayCollapsed}
              showAiBadge={!displayCollapsed}
              priority
            />
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.08]"
            aria-label={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
            title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          >
            <svg
              className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

          {/* Navigation */}
        <nav className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2 pt-3">
            {navGroups.map((group) => {
              const groupLabel = t(`groups.${group.labelKey}`);
              const isGroupOpen = isNavGroupOpen(openGroupKeys, group.labelKey);

              return (
                <div key={group.labelKey} className="mb-4 last:mb-0">
                  {!displayCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleNavGroup(group.labelKey)}
                      className="mb-1 flex w-full items-center justify-between rounded-[10px] px-2.5 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-expanded={isGroupOpen}
                      aria-label={t(isGroupOpen ? "collapseSection" : "expandSection", {
                        label: groupLabel,
                      })}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                        {groupLabel}
                      </span>
                      <svg
                        className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${isGroupOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="m19 9-7 7-7-7"
                        />
                      </svg>
                    </button>
                  )}
                  {(displayCollapsed || isGroupOpen) && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => renderNavItem(item))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

        <div
          className={`relative z-10 shrink-0 space-y-1 px-2.5 pb-3 ${
            displayCollapsed ? "flex flex-col items-center" : ""
          }`}
        >
          <div className={displayCollapsed ? "flex w-full justify-center" : ""}>
            <ThemeSwitcher placement="top" collapsed={displayCollapsed} />
          </div>
          <div className={displayCollapsed ? "flex w-full justify-center" : ""}>
            <Suspense fallback={<div className="h-11 w-full animate-pulse rounded-[10px] bg-black/[0.05] dark:bg-white/10" />}>
              <LanguageSwitcher collapsed={displayCollapsed} />
            </Suspense>
          </div>
          <div className={displayCollapsed ? "flex w-full justify-center pt-1" : "space-y-1 pt-1"}>
            {authEmail ? (
              displayCollapsed ? (
                <Link
                  href={withFilters("/dashboard/settings")}
                  prefetch={prefetchDashboardNav}
                  title={accountDisplayName ?? t("items.settings")}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full outline-none hover:bg-black/[0.05] focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.08]"
                >
                  <UserAvatar
                    src={profileAvatarUrl}
                    name={profileName}
                    email={authEmail}
                    size="md"
                  />
                </Link>
              ) : (
                <>
                  <Link
                    href={withFilters("/dashboard/settings")}
                    prefetch={prefetchDashboardNav}
                    className="flex min-h-11 min-w-0 items-center gap-3 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.08]"
                  >
                    <UserAvatar
                      src={profileAvatarUrl}
                      name={profileName}
                      email={authEmail}
                      size="md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-foreground">
                        {accountDisplayName}
                      </span>
                      {authEmail ? (
                        <span className="block truncate text-xs text-muted" title={authEmail}>
                          {authEmail}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="min-h-11 w-full rounded-full px-3 text-[13px] font-medium text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[0.08]"
                  >
                    {isSigningOut ? t("signingOut") : t("signOut")}
                  </button>
                </>
              )
            ) : !displayCollapsed ? (
              <div className="space-y-1.5">
                <Link
                  href="/sign-in"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brand-gradient px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-center text-[13px] font-medium text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.08]"
                >
                  {t("signUp")}
                </Link>
              </div>
            ) : null}
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
