"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard/overview",
    label: "Vue d'ensemble",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/timeline",
    label: "Timeline",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.5 4.5L21.75 7M21.75 7h-5.25M21.75 7v5.25" />
      </svg>
    ),
  },
  {
    href: "/dashboard/heatmap",
    label: "Heatmap",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-1.333-2.532 3.75 3.75 0 0 0 2.763 6.453Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/genres",
    label: "Genres",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-2.048-2.315l1.503-.43a.75.75 0 00.547-.721V7.19a.75.75 0 01.547-.721l4.423-1.263a.75.75 0 01.953.721v2.962C21 11.215 19.332 11.458 18 11.5a2.25 2.25 0 00-1.368.448l-1.32.94a1.803 1.803 0 11-2.048-1.41l1.503-.537a.75.75 0 00.547-.721V9.282a.75.75 0 01.547-.721l4.423-1.263a.75.75 0 01.953.721v1.168z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/genres/trends",
    label: "Tendances Genres",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/artists",
    label: "Artistes",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/temporal-analysis",
    label: "Analyse Temporelle",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/replay",
    label: "Replay",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/network",
    label: "Réseau",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/insights",
    label: "Insights",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/sentry-test",
    label: "Test Sentry",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 shadow-card hover:shadow-card-hover transition-all focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
          aria-label="Ouvrir le menu"
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
          fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700/50
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-20 px-6 border-b border-gray-100 dark:border-gray-700/50">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet to-accent-indigo text-white shadow-lg shadow-accent-violet/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Analytics
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
            <div className="px-3 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Navigation
              </span>
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
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
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <div className="w-1 h-5 rounded-full bg-accent-violet shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
