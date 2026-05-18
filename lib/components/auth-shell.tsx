"use client";

import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Footer } from "@/lib/components/footer";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";

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

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-app-shell" aria-hidden />
        <div
          className="absolute top-1/4 -left-32 -z-10 h-64 w-64 rounded-full bg-accent-rose/20 blur-3xl dark:bg-accent-rose/20"
          aria-hidden
        />
        <div
          className="absolute bottom-1/4 -right-32 -z-10 h-80 w-80 rounded-full bg-accent-cyan/20 blur-3xl dark:bg-accent-cyan/15"
          aria-hidden
        />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 rounded-full py-1.5 pr-2 outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:pr-3"
            aria-label={t("homeLinkAriaLabel")}
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand-glow ring-1 ring-white/20 transition-transform group-hover:rotate-[-2deg] group-hover:scale-105">
              <SoundprintLogo
                src="/brand/favicon.png"
                showText={false}
                imageClassName="h-8 w-8 rounded-xl"
                priority
              />
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-base font-semibold tracking-[-0.03em] text-foreground">
                Soundprint
              </span>
              <span className="rounded-full border border-primary/15 bg-primary/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">
                AI
              </span>
            </span>
          </Link>
          <nav
            className="flex flex-wrap items-center justify-end gap-2 sm:gap-3"
            aria-label={t("authNavAriaLabel")}
          >
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-primary/10 hover:text-primary sm:inline-flex"
            >
              {t("dashboardLink")}
            </Link>
            <ThemeSwitcher placement="bottom" />
            <Suspense
              fallback={
                <div
                  className="h-10 w-32 animate-pulse rounded-xl bg-card-surface"
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
