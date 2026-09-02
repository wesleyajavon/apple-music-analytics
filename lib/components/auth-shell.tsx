"use client";

import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Footer } from "@/lib/components/footer";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { AuthSplitLayout } from "@/lib/components/auth-split-layout";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { LayoutDashboard } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth");
  const { publicDemoOverviewPath: publicDemoPath } = usePublicDemo();

  return (
    <div className="auth-forced-dark dark flex min-h-screen flex-col overflow-x-hidden bg-[#050508] text-white lg:min-h-dvh">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#050508]"
      >
        {t("skipToContent")}
      </a>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-x-clip overflow-y-auto scroll-pt-24 lg:scroll-pt-28">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-6 py-5 sm:px-10 lg:px-14 lg:py-6 xl:px-20">
          <Link
            href="/"
            className="group inline-flex min-w-0 shrink items-center gap-2 rounded-full py-1.5 pr-1 text-white outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508] sm:gap-3 sm:pr-3"
            aria-label={t("homeLinkAriaLabel")}
          >
            <SoundprintBrandMark
              tone="onDark"
              priority
              wordmarkClassName="max-lg:max-w-[9rem] lg:max-w-none"
            />
          </Link>
          <nav
            className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-3"
            aria-label={t("authNavAriaLabel")}
          >
            {publicDemoPath ? (
              <Link
                href={publicDemoPath}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:min-w-0 sm:gap-2 sm:border-transparent sm:bg-transparent sm:px-3 sm:py-2"
                aria-label={t("dashboardLink")}
              >
                <LayoutDashboard className="h-5 w-5 shrink-0 sm:hidden" aria-hidden />
                <span className="hidden text-sm font-medium sm:inline">{t("dashboardLink")}</span>
              </Link>
            ) : null}
            <Suspense
              fallback={
                <div
                  className="h-10 w-10 animate-pulse rounded-xl bg-white/10 sm:w-32"
                  aria-hidden
                />
              }
            >
              <LanguageSwitcher placement="bottom" compactOnMobile tone="onDark" />
            </Suspense>
          </nav>
        </header>

        <AuthSplitLayout>{children}</AuthSplitLayout>
      </div>

      <div className="lg:hidden">
        <Footer variant="home" />
      </div>
    </div>
  );
}
