"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { Footer } from "@/lib/components/footer";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { SoundprintBrandDividerSection } from "@/lib/components/soundprint-brand-divider";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { Home3DHero } from "@/lib/components/home-3d/home-3d-hero";
import { HomeJourneyExploreSection } from "@/lib/components/home-journey-explore-section";
import { HomeJourneyImportSection } from "@/lib/components/home-journey-import-section";
import { HomeJourneyInteractSection } from "@/lib/components/home-journey-interact-section";
import { HomeClosingSection } from "@/lib/components/home-closing-section";
import { HomeJourneySteps } from "@/lib/components/home-journey-steps";
import { HomeMobileNav } from "@/lib/components/home-mobile-nav";
import { HomeMobileStickyCta } from "@/lib/components/home-mobile-sticky-cta";
import { UserAvatar } from "@/lib/components/user-avatar";
import {
  HOME_JOURNEY_NAV_ITEMS,
} from "@/lib/constants/home-journey-nav";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  HomeBlurFadeReveal,
  HomeClipReveal,
  HomeTextRevealLines,
} from "@/lib/components/home-animations";
import { HomeHeroDashboardPreview } from "@/lib/components/home-hero-dashboard-preview";

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
  const { publicDemoOverviewPath: publicDemoPath, publicProfileUserId: publicProfileId } =
    usePublicDemo();
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
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <main className="relative flex flex-1 flex-col bg-app-shell">
        <header
          className="sticky top-0 z-30 border-b border-card-border bg-surface-glass backdrop-blur-xl"
          style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
        >
          <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
            <Link
              href="/"
              className="group inline-flex min-w-0 shrink items-center gap-2 rounded-full py-1.5 pr-1 outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-3 sm:pr-3"
              aria-label="Soundprint-AI"
            >
              <SoundprintBrandMark priority showWordmarkOnMobile={false} />
            </Link>

            <nav
              className="hidden items-center gap-6 text-sm font-medium text-muted md:flex"
              aria-label={t("journey.navAriaLabel")}
            >
              {HOME_JOURNEY_NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {t(`journey.nav.${item.labelKey}`)}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              <HomeMobileNav />
              <ThemeSwitcher placement="bottom" compactOnMobile />
              <Suspense
                fallback={<div className="h-10 w-10 animate-pulse rounded-xl bg-card-surface sm:w-28" />}
              >
                <LanguageSwitcher placement="bottom" compactOnMobile />
              </Suspense>
              <Link
                href={isAuthenticated ? "/dashboard" : "/sign-in"}
                className="inline-flex min-h-11 max-w-[8.5rem] items-center justify-center gap-2 truncate rounded-xl border border-card-border bg-card-surface px-2.5 text-xs font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:max-w-none sm:px-4 sm:text-sm md:hover:shadow-card-hover"
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
        <Home3DHero
          variant="hero"
          className="absolute inset-x-0 top-0 -z-10 hidden h-[min(52rem,90vh)] w-full md:block [&_canvas]:h-full [&_canvas]:w-full"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-[min(38rem,72vh)] -z-10 hidden h-40 bg-gradient-to-b from-transparent via-background/40 to-background md:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[42rem] bg-[linear-gradient(to_right,rgb(152_80_208_/_0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(79_144_224_/_0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] lg:block"
          aria-hidden
        />

        <section className="relative mx-auto grid w-full min-w-0 max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="relative z-10 min-w-0 w-full text-left">
            <HomeBlurFadeReveal delay={0} immediate>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="group mb-7 inline-flex max-w-full items-center gap-3 rounded-[1.35rem] border border-card-border bg-card-surface/85 p-2.5 pr-4 shadow-card backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <UserAvatar
                  src={avatarUrl}
                  name={profileName}
                  email={profileEmail}
                  size="lg"
                  alt={profileName ?? profileEmail ?? t("goToDashboard")}
                  className="ring-2 ring-primary/15"
                />
                <div className="min-w-0 pr-1">
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald shadow-[0_0_12px_rgb(22_199_132_/0.7)]" />
                    {t("goToDashboardShort")}
                  </div>
                  <p className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
                    {profileName ?? profileEmail ?? t("goToDashboard")}
                  </p>
                  {profileEmail ? (
                    <p className="truncate text-xs text-muted">{profileEmail}</p>
                  ) : null}
                </div>
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : publicDemoPath ? (
              <Link
                href={publicDemoPath}
                className="group mb-6 inline-flex max-w-full flex-wrap items-center gap-2.5 rounded-full border border-card-border bg-card-surface px-3 py-1.5 text-sm font-semibold text-primary shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span
                  className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/35"
                  aria-hidden
                >
                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/80" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153_/0.95)]" />
                </span>
                {t("heroEyebrow")}
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : null}
            </HomeBlurFadeReveal>

            {!isAuthenticated ? (
              <HomeBlurFadeReveal delay={0.04} immediate>
                <p className="mb-4 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary sm:text-xs">
                  {t("journey.tagline")}
                </p>
              </HomeBlurFadeReveal>
            ) : null}

            <HomeTextRevealLines
              as="h1"
              className="w-full min-w-0 max-w-4xl text-balance text-[2.15rem] font-semibold leading-[1.15] tracking-[-0.05em] text-foreground min-[400px]:text-[2.35rem] sm:text-6xl sm:leading-snug sm:tracking-[-0.06em] lg:text-7xl lg:leading-[1.12]"
              lines={[
                <span key="welcome">{welcomeMessage}</span>,
                ...(!firstName
                  ? [
                      <span
                        key="gradient"
                        className="mt-1 block bg-brand-gradient bg-clip-text pb-1.5 leading-normal text-transparent sm:pb-2"
                      >
                        {t("heroGradient")}
                      </span>,
                    ]
                  : []),
              ]}
            />

            <HomeBlurFadeReveal delay={0.2} className="mt-5 w-full min-w-0 max-w-2xl">
              <p className="text-base leading-7 text-muted sm:text-xl sm:leading-8">
                {t("journey.pitch")}
              </p>
            </HomeBlurFadeReveal>

            <HomeBlurFadeReveal delay={0.28} className="mt-6 w-full min-w-0">
              <HomeJourneySteps />
            </HomeBlurFadeReveal>

            <HomeClipReveal className="mt-8 min-w-0 w-full lg:hidden" delay={0.32} immediate>
              <HomeHeroDashboardPreview compact />
            </HomeClipReveal>

            <HomeBlurFadeReveal delay={0.4} className="mt-8 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95"
                >
                  {t("goToDashboard")}
                  <ArrowRightIcon />
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95"
                >
                  {t("heroPrimaryCta")}
                  <ArrowRightIcon />
                </Link>
              )}
              {!isAuthenticated && publicDemoPath ? (
                <Link
                  href={publicDemoPath}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-surface px-7 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  {t("accessDashboard")}
                  <ArrowRightIcon />
                </Link>
              ) : null}
            </HomeBlurFadeReveal>

            <HomeBlurFadeReveal delay={0.48} className="mt-6 w-full min-w-0">
              <ul className="flex flex-wrap gap-2" aria-label={t("heroProof.ariaLabel")}>
                {(["private", "demoFirst", "appleSpotify"] as const).map((key) => (
                  <li
                    key={key}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-card-border bg-card-surface/70 px-3 py-1.5 text-xs font-medium text-muted backdrop-blur-sm"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-emerald shadow-[0_0_8px_rgb(22_199_132_/0.6)]"
                      aria-hidden
                    />
                    {t(`heroProof.${key}`)}
                  </li>
                ))}
              </ul>
            </HomeBlurFadeReveal>
          </div>

          <HomeClipReveal className="relative z-10 hidden lg:block" delay={0.15} immediate>
            <HomeHeroDashboardPreview />
          </HomeClipReveal>
        </section>

        <SoundprintBrandDividerSection
          align="start"
          logoSize="lg"
          lineStyle="fade"
          maxWidth="medium"
          className="py-8 sm:py-12"
        />

        <HomeJourneyImportSection
          isAuthenticated={isAuthenticated}
          publicDemoPath={publicDemoPath}
        />

        <section className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Home3DHero
            variant="ambient"
            className="relative -z-10 mx-auto hidden h-48 w-full max-w-4xl overflow-visible md:block [&_canvas]:h-full [&_canvas]:w-full"
          />
        </section>

        <HomeJourneyExploreSection publicDemoPath={publicDemoPath} />

        <SoundprintBrandDividerSection
          align="start"
          logoSize="xl"
          className="py-6 sm:py-10"
        />

        <HomeJourneyInteractSection
          isAuthenticated={isAuthenticated}
          publicProfileUserId={publicProfileId}
        />

        <SoundprintBrandDividerSection
          align="start"
          logoSize="lg"
          lineStyle="fade"
          maxWidth="medium"
          className="py-8 sm:py-12"
        />

        <HomeClosingSection
          isAuthenticated={isAuthenticated}
          publicDemoPath={publicDemoPath}
        />
        </div>
      </main>
      <HomeMobileStickyCta isAuthenticated={isAuthenticated} />
      <Footer variant="home" />
    </div>
  );
}
