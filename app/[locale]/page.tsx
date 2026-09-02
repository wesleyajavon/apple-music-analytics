"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { Footer } from "@/lib/components/footer";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { HomeJourneyExploreSection } from "@/lib/components/home-journey-explore-section";
import { HomeJourneyImportSection } from "@/lib/components/home-journey-import-section";
import { HomeJourneyInteractSection } from "@/lib/components/home-journey-interact-section";
import { HomeClosingSection } from "@/lib/components/home-closing-section";
import { HomeMobileNav } from "@/lib/components/home-mobile-nav";
import { UserAvatar } from "@/lib/components/user-avatar";
import {
  HOME_JOURNEY_NAV_ITEMS,
} from "@/lib/constants/home-journey-nav";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  HomeBlurFadeReveal,
  HomeTextRevealLines,
} from "@/lib/components/home-animations";
import { HomeHeroAlbumField } from "@/lib/components/home-hero-album-field";

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7l5 5m0 0l-5 5m5-5H6"
      />
    </svg>
  );
}

export default function Home() {
  const t = useTranslations("home");
  const tAuth = useTranslations("auth");
  const { publicDemoOverviewPath: publicDemoPath } = usePublicDemo();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    function extractFirstName(rawName?: string | null) {
      if (!rawName) return null;
      const cleaned = rawName.trim();
      if (!cleaned) return null;
      return cleaned.split(/\s+/)[0] ?? null;
    }

    function resolveFirstName(user: { user_metadata?: Record<string, unknown> } | null) {
      if (!user?.user_metadata) return null;
      const metadata = user.user_metadata;
      const candidate =
        (metadata.full_name as string | undefined) ??
        (metadata.name as string | undefined) ??
        (metadata.given_name as string | undefined) ??
        (metadata.preferred_username as string | undefined) ??
        null;
      return extractFirstName(candidate);
    }

    async function hydrateProfile() {
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
        setProfileEmail(data.user?.email ?? null);
        setAvatarUrl(data.user?.avatarUrl ?? null);
        setFirstName((current) => extractFirstName(data.user?.name) ?? current);
      } catch {
        // Keep auth metadata fallback if the profile endpoint is unavailable.
      }
    }

    async function hydrateUserName() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsAuthenticated(!!data.user);
      setFirstName(resolveFirstName(data.user));
      if (data.user) void hydrateProfile();
      else {
        setProfileName(null);
        setProfileEmail(null);
        setAvatarUrl(null);
      }
    }

    hydrateUserName();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(!!session?.user);
      setFirstName(resolveFirstName(session?.user ?? null));
      if (session?.user) void hydrateProfile();
      else {
        setProfileName(null);
        setProfileEmail(null);
        setAvatarUrl(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const welcomeMessage = useMemo(() => {
    if (!firstName) return t("welcome");
    return t("welcomePersonal", { name: firstName });
  }, [firstName, t]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#050508] text-white">
      <main className="relative flex flex-1 flex-col bg-[#050508]">
        <header
          className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-xl"
          style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
        >
          <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
            <Link
              href="/"
              className="group inline-flex min-w-0 shrink items-center gap-2 rounded-full py-1.5 pr-1 outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508] sm:gap-3 sm:pr-3"
              aria-label="Soundprint-AI"
            >
              <SoundprintBrandMark priority showWordmarkOnMobile={false} tone="onDark" />
            </Link>

            <nav
              className="hidden items-center gap-6 text-sm font-medium text-white/70 md:flex"
              aria-label={t("journey.navAriaLabel")}
            >
              {HOME_JOURNEY_NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-white"
                >
                  {t(`journey.nav.${item.labelKey}`)}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              <HomeMobileNav />
              <Suspense
                fallback={<div className="h-10 w-10 animate-pulse rounded-xl bg-white/10 sm:w-28" />}
              >
                <LanguageSwitcher placement="bottom" compactOnMobile tone="onDark" />
              </Suspense>
              <Link
                href={isAuthenticated ? "/dashboard" : "/sign-in"}
                className="inline-flex min-h-11 max-w-[8.5rem] items-center justify-center gap-2 truncate rounded-xl border border-white/15 bg-white/5 px-2.5 text-xs font-semibold text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:max-w-none sm:px-4 sm:text-sm"
                title={isAuthenticated ? t("goToDashboard") : tAuth("signIn")}
              >
                {isAuthenticated ? (
                  <UserAvatar
                    src={avatarUrl}
                    name={profileName}
                    email={profileEmail}
                    size="sm"
                  />
                ) : null}
                <span className="md:hidden">
                  {isAuthenticated ? t("goToDashboardShort") : tAuth("signIn")}
                </span>
                <span className="hidden md:inline">
                  {isAuthenticated ? t("goToDashboard") : tAuth("signIn")}
                </span>
              </Link>
            </div>
          </div>
        </header>

        <div className="relative flex-1 overflow-x-hidden">
        <section className="relative isolate overflow-hidden bg-[#050508] text-white">
          <HomeHeroAlbumField variant="backdrop" className="lg:hidden" />

          <div className="relative mx-auto grid w-full min-w-0 max-w-7xl items-center gap-10 px-4 pb-20 pt-12 sm:gap-12 sm:px-6 sm:pb-24 sm:pt-16 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,0.5fr)] lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
            <div className="relative z-10 flex min-w-0 w-full flex-col items-stretch text-center lg:items-start lg:text-left">
              <HomeBlurFadeReveal delay={0} immediate className="flex justify-center lg:justify-start">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="group mb-7 inline-flex max-w-full items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/5 p-2.5 pr-4 text-left shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <UserAvatar
                      src={avatarUrl}
                      name={profileName}
                      email={profileEmail}
                      size="lg"
                      alt={profileName ?? profileEmail ?? t("goToDashboard")}
                      className="ring-2 ring-white/15"
                    />
                    <div className="min-w-0 pr-1">
                      <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald shadow-[0_0_12px_rgb(22_199_132_/0.7)]" />
                        {t("goToDashboardShort")}
                      </div>
                      <p className="truncate text-base font-semibold tracking-[-0.02em] text-white">
                        {profileName ?? profileEmail ?? t("goToDashboard")}
                      </p>
                      {profileEmail ? (
                        <p className="truncate text-xs text-white/55">{profileEmail}</p>
                      ) : null}
                    </div>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ) : (
                  <div className="mb-6 inline-flex max-w-full items-center gap-2.5">
                    <Image
                      src="/brand/providers/apple-music-icon.svg"
                      alt=""
                      width={22}
                      height={22}
                      className="h-[1.35rem] w-[1.35rem] object-contain"
                      unoptimized
                    />
                    <Image
                      src="/brand/providers/spotify-icon.svg"
                      alt=""
                      width={22}
                      height={22}
                      className="h-[1.35rem] w-[1.35rem] object-contain"
                      unoptimized
                    />
                    <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
                      {t("heroEyebrow")}
                    </p>
                  </div>
                )}
              </HomeBlurFadeReveal>

              {isAuthenticated ? (
                <HomeBlurFadeReveal delay={0.04} immediate>
                  <p className="mb-4 text-sm font-medium text-white/70 lg:text-left">
                    {welcomeMessage}
                  </p>
                </HomeBlurFadeReveal>
              ) : null}

              <HomeTextRevealLines
                as="h1"
                className="w-full min-w-0 max-w-full text-center text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[2.05rem] sm:max-w-xl sm:text-balance sm:text-5xl sm:leading-[1.08] sm:tracking-[-0.055em] lg:text-left lg:text-[3.35rem] lg:leading-[1.06]"
                lines={[
                  <span key="headline" className="block w-full max-w-full">
                    {t("heroHeadline")}
                  </span>,
                ]}
              />

              <HomeBlurFadeReveal delay={0.18} className="mx-auto mt-5 w-full min-w-0 max-w-lg lg:mx-0">
                <p className="text-center text-base leading-7 text-white/68 sm:text-lg sm:leading-8 lg:text-left">
                  {t("heroSub")}
                </p>
              </HomeBlurFadeReveal>

              <HomeBlurFadeReveal delay={0.32} className="mt-8 flex w-full min-w-0 flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:items-start lg:justify-start">
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
                  >
                    {t("goToDashboard")}
                    <ArrowRightIcon />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
                  >
                    {t("heroPrimaryCta")}
                    <ArrowRightIcon />
                  </Link>
                )}
                {!isAuthenticated && publicDemoPath ? (
                  <Link
                    href={publicDemoPath}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
                  >
                    {t("accessDashboard")}
                    <ArrowRightIcon />
                  </Link>
                ) : null}
              </HomeBlurFadeReveal>

              <HomeBlurFadeReveal delay={0.42} className="mt-6 w-full min-w-0">
                <p className="text-center text-xs font-medium tracking-[0.01em] text-white/45 lg:text-left">
                  {t("heroTrust")}
                </p>
              </HomeBlurFadeReveal>
            </div>

            <div className="relative z-10 hidden overflow-visible lg:block">
              <HomeHeroAlbumField variant="stage" />
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#050508]"
            aria-hidden
          />
        </section>

        <HomeJourneyExploreSection />

        <HomeJourneyInteractSection />

        <HomeJourneyImportSection
          isAuthenticated={isAuthenticated}
          publicDemoPath={publicDemoPath}
        />

        <HomeClosingSection />
        </div>
      </main>
      <Footer variant="home" />
    </div>
  );
}
