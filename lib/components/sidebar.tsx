"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const STORAGE_KEY = "sidebar-collapsed";

interface NavItem {
  href: string;
  labelKey: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: "main",
    items: [
      {
        href: "/dashboard/overview",
        labelKey: "overview",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/overview-bis",
        labelKey: "overviewBis",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        ),
      },
      {
        href: "/dashboard/settings",
        labelKey: "settings",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    labelKey: "temporal",
    items: [
      {
        href: "/dashboard/timeline",
        labelKey: "timeline",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.5 4.5L21.75 7M21.75 7h-5.25M21.75 7v5.25" />
          </svg>
        ),
      },
      {
        href: "/dashboard/heatmap",
        labelKey: "heatmap",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-1.333-2.532 3.75 3.75 0 0 0 2.763 6.453Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/temporal-analysis",
        labelKey: "temporalAnalysis",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
      },
    ],
  },
  {
    labelKey: "content",
    items: [
      {
        href: "/dashboard/genres",
        labelKey: "genres",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-2.048-2.315l1.503-.43a.75.75 0 00.547-.721V7.19a.75.75 0 01.547-.721l4.423-1.263a.75.75 0 01.953.721v2.962C21 11.215 19.332 11.458 18 11.5a2.25 2.25 0 00-1.368.448l-1.32.94a1.803 1.803 0 11-2.048-1.41l1.503-.537a.75.75 0 00.547-.721V9.282a.75.75 0 01.547-.721l4.423-1.263a.75.75 0 01.953.721v1.168z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/genres/trends",
        labelKey: "genreTrends",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/genres/palette",
        labelKey: "palette",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm6.75-3a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm4.5 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/artists",
        labelKey: "artists",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/artists/trends",
        labelKey: "artistTrends",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/tracks",
        labelKey: "tracks",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/tracks/trends",
        labelKey: "trackTrends",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
        ),
      },
    ],
  },
  {
    labelKey: "ai",
    items: [
      {
        href: "/dashboard/musical-profile",
        labelKey: "musicalProfile",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/ai-insights",
        labelKey: "aiInsights",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/taste-evolution",
        labelKey: "tasteEvolution",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/when-will-i-listen",
        labelKey: "whenWillIListen",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/taste-profile",
        labelKey: "tasteProfile",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
        ),
      },
    ],
  },
  {
    labelKey: "other",
    items: [
      {
        href: "/dashboard/about",
        labelKey: "about",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/demo",
        labelKey: "demo",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/insights",
        labelKey: "methodology",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
          </svg>
        ),
      },
      {
        href: "/dashboard/sentry-test",
        labelKey: "sentryTest",
        icon: (props) => (
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c3.556 0 6.592-1.42 8.864-3.476m-12.728 0C3.5 17.5 4.5 16 6 16h12c1.5 0 2.5 1.5 2.5 3 0 1.5-1.5 3-2.5 3H6c-1.5 0-2.5-1.5-2.5-3 0-1.5 1-3 2.5-3m0 0c0-.5.5-1 1-1h1c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1H7c-.5 0-1-.5-1-1v-2c0-.5.5-1 1-1h1c.5 0 1 .5 1 1m0 0h4m0 0h4" />
          </svg>
        ),
      },
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

function SidebarFallback() {
  return (
    <aside
      className="fixed top-0 left-0 z-40 h-screen w-64 flex-shrink-0 -translate-x-full border-r border-gray-200/80 bg-white shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)] transition-all dark:border-gray-800 dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.2)] lg:sticky lg:top-0 lg:z-auto lg:translate-x-0"
      aria-hidden
    >
      <div className="h-20 animate-pulse border-b border-gray-100 bg-gray-100 dark:border-gray-800 dark:bg-gray-800" />
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
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
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const t = useTranslations("sidebar");
  const adminUserIds = useMemo(
    () =>
      (process.env.NEXT_PUBLIC_ADMIN_USER_IDS ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    []
  );
  const isAdminUser = useMemo(
    () => !!authUserId && adminUserIds.includes(authUserId),
    [authUserId, adminUserIds]
  );

  const withFilters = useMemo(
    () => (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams]
  );

  // Hydrate collapsed state from localStorage (SSR-safe)
  useEffect(() => {
    setIsCollapsed(getStoredCollapsed());
  }, []);

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

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-card hover:shadow-card-hover transition-all focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
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
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
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
          bg-white dark:bg-gray-900
          border-r border-gray-200/80 dark:border-gray-800
          shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.2)]
        `}
      >
        <div className="flex flex-col h-full w-full">
          {/* Logo + Toggle */}
          <div
            className={`flex items-center h-20 border-b border-gray-100 dark:border-gray-800 transition-all duration-300 ${
              isCollapsed ? "px-3 justify-center" : "px-6"
            }`}
          >
            <Link
              href={withFilters("/dashboard")}
              className={`flex items-center group ${isCollapsed ? "justify-center" : "gap-3"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet to-accent-indigo text-white shadow-lg shadow-accent-violet/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              {!isCollapsed && (
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate">
                  {t("logo")}
                </span>
              )}
            </Link>
          </div>

          {/* Desktop collapse toggle */}
          <div
            className={`hidden lg:flex px-2 py-2 border-b border-gray-100 dark:border-gray-800 ${
              isCollapsed ? "justify-center" : "justify-end"
            }`}
          >
            <button
              onClick={toggleCollapsed}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
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
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {t(`groups.${group.labelKey}`)}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items
                    .filter(
                      (item) =>
                        !(
                          item.href === '/dashboard/sentry-test' &&
                          process.env.NODE_ENV === 'production' &&
                          !isAdminUser
                        )
                    )
                    .map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const label = t(`items.${item.labelKey}`);
                    return (
                      <Link
                        key={item.href}
                        href={withFilters(item.href)}
                        onClick={() => setIsMobileMenuOpen(false)}
                        title={isCollapsed ? label : undefined}
                        className={`
                          group flex items-center rounded-xl text-sm font-medium transition-all duration-200
                          ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"}
                          ${
                            isActive
                              ? "bg-accent-violet/10 text-accent-violet dark:text-accent-violet"
                              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }
                        `}
                      >
                        <Icon
                          className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                            isActive ? "text-accent-violet" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                          }`}
                        />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 truncate">{label}</span>
                            {isActive && (
                              <div className="w-1 h-5 rounded-full bg-accent-violet shrink-0" />
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Theme & Language switchers */}
          <div
            className={`px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-4 transition-all duration-300 ${
              isCollapsed ? "flex flex-col items-center gap-2" : ""
            }`}
          >
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t("appearance")}
                </span>
              </div>
            )}
            <div className={isCollapsed && !isMobileMenuOpen ? "w-full flex justify-center" : ""}>
              <ThemeSwitcher placement="top" collapsed={isCollapsed && !isMobileMenuOpen} />
            </div>
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
                      className="truncate text-xs text-gray-500 dark:text-gray-400"
                      title={authEmail}
                    >
                      {authEmail}
                    </p>
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      {isSigningOut ? t("signingOut") : t("signOut")}
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/sign-in"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      {t("signIn")}
                    </Link>
                    <Link
                      href="/sign-up"
                      className="rounded-lg bg-accent-violet px-3 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
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
