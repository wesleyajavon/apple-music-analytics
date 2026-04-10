"use client";

import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Footer } from "@/lib/components/footer";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent-violet focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      >
        {t("skipToContent")}
      </a>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20"
          aria-hidden
        />
        <div
          className="absolute top-1/4 -left-32 -z-10 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl dark:bg-blue-900/20"
          aria-hidden
        />
        <div
          className="absolute bottom-1/4 -right-32 -z-10 h-80 w-80 rounded-full bg-indigo-100/30 blur-3xl dark:bg-indigo-900/15"
          aria-hidden
        />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold tracking-wide text-gray-900 shadow-sm ring-1 ring-gray-200 backdrop-blur transition-colors hover:bg-white/90 dark:bg-gray-900/70 dark:text-gray-100 dark:ring-gray-700 dark:hover:bg-gray-900/90"
            aria-label={t("homeLinkAriaLabel")}
          >
            Apple Music Analytics
          </Link>
          <nav
            className="flex flex-wrap items-center justify-end gap-2 sm:gap-3"
            aria-label={t("authNavAriaLabel")}
          >
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:inline-flex dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              {t("dashboardLink")}
            </Link>
            <ThemeSwitcher placement="bottom" />
            <Suspense
              fallback={
                <div
                  className="h-10 w-32 animate-pulse rounded-xl bg-gray-200/80 dark:bg-gray-700/80"
                  aria-hidden
                />
              }
            >
              <LanguageSwitcher placement="bottom" />
            </Suspense>
          </nav>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
      </div>

      <Footer variant="home" />
    </div>
  );
}
