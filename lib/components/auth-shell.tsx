"use client";

import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Footer } from "@/lib/components/footer";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";
import { LayoutDashboard } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background"
      >
        {t("skipToContent")}
      </a>

      <div className="relative flex flex-1 flex-col">
        <div className="absolute inset-0 -z-10 bg-app-shell" aria-hidden />
        <div
          className="absolute top-1/4 -left-32 -z-10 h-64 w-64 rounded-full bg-accent-rose/20 blur-3xl dark:bg-accent-rose/20"
          aria-hidden
        />
        <div
          className="absolute bottom-1/4 -right-32 -z-10 h-80 w-80 rounded-full bg-accent-cyan/20 blur-3xl dark:bg-accent-cyan/15"
          aria-hidden
        />

        <header
          className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-4 sm:px-6 sm:py-5"
        >
          <Link
            href="/"
            className="group inline-flex min-w-0 shrink items-center gap-2 rounded-full py-1.5 pr-1 outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-3 sm:pr-3"
            aria-label={t("homeLinkAriaLabel")}
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand-glow ring-1 ring-white/20 transition-transform group-hover:rotate-[-2deg] group-hover:scale-105 sm:h-11 sm:w-11">
              <SoundprintLogo
                src="/brand/favicon.png"
                showText={false}
                imageClassName="h-7 w-7 rounded-xl sm:h-8 sm:w-8"
                priority
              />
            </span>
            <span className="flex min-w-0 items-center gap-2 max-lg:max-w-[9rem] lg:max-w-none">
              <span className="truncate text-sm font-semibold tracking-[-0.03em] text-foreground sm:text-base">
                Soundprint
              </span>
              <span className="hidden shrink-0 rounded-full border border-primary/15 bg-primary/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary sm:inline-flex">
                AI
              </span>
            </span>
          </Link>
          <nav
            className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-3"
            aria-label={t("authNavAriaLabel")}
          >
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-card-border text-muted transition-colors hover:bg-primary/10 hover:text-primary sm:min-w-0 sm:gap-2 sm:border-transparent sm:px-3 sm:py-2"
              aria-label={t("dashboardLink")}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0 sm:hidden" aria-hidden />
              <span className="hidden text-sm font-medium sm:inline">{t("dashboardLink")}</span>
            </Link>
            <ThemeSwitcher placement="bottom" compactOnMobile />
            <Suspense
              fallback={
                <div
                  className="h-10 w-10 animate-pulse rounded-xl bg-card-surface sm:w-32"
                  aria-hidden
                />
              }
            >
              <LanguageSwitcher placement="bottom" compactOnMobile />
            </Suspense>
          </nav>
        </header>

        <div className="relative flex flex-1 flex-col overflow-x-hidden">{children}</div>
      </div>

      <Footer variant="home" />
    </div>
  );
}
