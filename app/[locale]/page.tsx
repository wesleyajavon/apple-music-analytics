"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { Footer } from "@/lib/components/footer";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { SoundprintBrandDividerSection } from "@/lib/components/soundprint-brand-divider";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { DemoTerminalHero } from "@/lib/components/demo-terminal-hero";
import { Home3DHero } from "@/lib/components/home-3d/home-3d-hero";
import { HomeMobileNav } from "@/lib/components/home-mobile-nav";
import { HomeDashboardPreviewsSection } from "@/lib/components/home-dashboard-previews";
import { HomeDuetPreview } from "@/lib/components/home-duet-preview";
import { HomeMobileStickyCta } from "@/lib/components/home-mobile-sticky-cta";
import { StreamingProviderLogos } from "@/lib/components/streaming-provider-logos";
import { UserAvatar } from "@/lib/components/user-avatar";
import { withPublicDemoUserId } from "@/lib/constants/public-profile";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  HomeBlurFadeReveal,
  HomeClipReveal,
  HomePerspectiveReveal,
  HomeTextReveal,
  HomeTextRevealLines,
} from "@/lib/components/home-animations";

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

  const demoHighlights = [
    {
      id: "artist-analysis",
      videoSrc: "/media/artist1.mp4",
      videoLabel: t("demoHighlights.artistAnalysis.videoLabel"),
      eyebrow: t("demoHighlights.artistAnalysis.eyebrow"),
      title: t("demoHighlights.artistAnalysis.title"),
      description: t("demoHighlights.artistAnalysis.description"),
      metric: t("demoHighlights.artistAnalysis.metric"),
      reverse: false,
    },
    {
      id: "listening-trends",
      videoSrc: "/media/artist2.mp4",
      videoLabel: t("demoHighlights.listeningTrends.videoLabel"),
      eyebrow: t("demoHighlights.listeningTrends.eyebrow"),
      title: t("demoHighlights.listeningTrends.title"),
      description: t("demoHighlights.listeningTrends.description"),
      metric: t("demoHighlights.listeningTrends.metric"),
      reverse: true,
    },
  ] as const;

  const closingHighlights = [
    {
      label: t("closingCta.highlights.import.label"),
      value: t("closingCta.highlights.import.value"),
    },
    {
      label: t("closingCta.highlights.patterns.label"),
      value: t("closingCta.highlights.patterns.value"),
    },
    {
      label: t("closingCta.highlights.ai.label"),
      value: t("closingCta.highlights.ai.value"),
    },
  ];

  const soundprintAiChatFeatures = useMemo(
    () =>
      (
        ["compareEras", "plainLanguage", "groundedAnswers"] as const
      ).map((key) => ({
        label: t(`soundprintAiChatDemo.features.${key}.label`),
        supportingText: t(`soundprintAiChatDemo.features.${key}.supporting`),
      })),
    [t],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
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

            <div className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
              <a href="#product" className="transition-colors hover:text-foreground">
                {t("nav.product")}
              </a>
              <a href="#dashboard-widgets" className="transition-colors hover:text-foreground">
                {t("nav.insights")}
              </a>
              <a href="#demo" className="transition-colors hover:text-foreground">
                {t("nav.demo")}
              </a>
              <a
                href="#soundprint-ai-chat"
                className="transition-colors hover:text-foreground"
              >
                {t("nav.aiChat")}
              </a>
            </div>

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

        <section className="relative mx-auto grid w-full max-w-7xl scroll-mt-24 items-center gap-10 px-4 pb-16 pt-10 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="relative z-10 text-left">
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
                className="group mb-6 inline-flex items-center gap-2.5 rounded-full border border-card-border bg-card-surface px-3 py-1.5 text-sm font-semibold text-primary shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
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

            <HomeTextRevealLines
              as="h1"
              className="max-w-4xl overflow-visible text-balance text-[2.35rem] font-semibold leading-[1.15] tracking-[-0.05em] text-foreground sm:text-6xl sm:leading-snug sm:tracking-[-0.06em] lg:text-7xl lg:leading-[1.12]"
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

            <HomeBlurFadeReveal delay={0.2} className="mt-5 max-w-2xl">
              <p className="text-base leading-7 text-muted sm:text-xl sm:leading-8">
                {t("subtitle")}
              </p>
            </HomeBlurFadeReveal>

            <HomeBlurFadeReveal delay={0.32}>
              <StreamingProviderLogos
                caption={t("supportedStreamingCaption")}
                spotifyLogoAlt={t("spotifyLogoAlt")}
                appleMusicLogoAlt={t("appleMusicLogoAlt")}
                className="mt-5"
              />
            </HomeBlurFadeReveal>

            <HomeBlurFadeReveal delay={0.44} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 md:inline-flex"
                >
                  {t("goToDashboard")}
                  <ArrowRightIcon />
                </Link>
              ) : (
                <Link
                  href="/sign-up"
                  className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 md:inline-flex"
                >
                  {t("heroPrimaryCta")}
                  <ArrowRightIcon />
                </Link>
              )}
            </HomeBlurFadeReveal>
          </div>

          <HomeClipReveal className="relative z-10" delay={0.15} immediate>
            <HomeDuetPreview />
          </HomeClipReveal>
        </section>

        <SoundprintBrandDividerSection
          logoSize="lg"
          lineStyle="fade"
          maxWidth="medium"
          className="py-8 sm:py-12"
        />

        <section className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Home3DHero
            variant="ambient"
            className="relative -z-10 mx-auto hidden h-48 w-full max-w-4xl overflow-visible md:block [&_canvas]:h-full [&_canvas]:w-full"
          />
        </section>

        <HomeDashboardPreviewsSection />

        <SoundprintBrandDividerSection
          logoSize="xl"
          className="py-6 sm:py-10"
        />

        <section
          id="soundprint-ai-chat"
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8"
        >
          <div className="mb-10 text-center lg:mb-12">
            <HomeBlurFadeReveal>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t("soundprintAiChatDemo.sectionEyebrow")}
              </p>
            </HomeBlurFadeReveal>
            <HomeTextReveal
              as="h2"
              onScroll
              className="mx-auto mt-3 block max-w-4xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl"
              text={t("soundprintAiChatDemo.sectionTitle")}
              stagger={0.05}
            />
          </div>

          <DemoTerminalHero
            videoSrc="/media/aichat.mp4"
            videoLabel={t("soundprintAiChatDemo.videoLabel")}
            eyebrow={t("soundprintAiChatDemo.heroEyebrow")}
            subtitle={t("soundprintAiChatDemo.heroSubtitle")}
            badge={t("soundprintAiChatDemo.heroBadge")}
            features={soundprintAiChatFeatures}
            showFeaturesOnMobile={false}
            className="max-w-6xl"
          />

          <HomeBlurFadeReveal delay={0.15} className="mt-10 flex justify-center">
            <Link
              href={
                isAuthenticated
                  ? "/dashboard/ask-your-soundprint"
                  : publicProfileId
                    ? withPublicDemoUserId("/dashboard/ask-your-soundprint", publicProfileId)
                    : "/sign-in"
              }
              className="inline-flex min-h-11 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
            >
              {t(
                isAuthenticated
                  ? "soundprintAiChatDemo.ctaSignedIn"
                  : "soundprintAiChatDemo.cta",
              )}
              <ArrowRightIcon />
            </Link>
          </HomeBlurFadeReveal>
        </section>

        <SoundprintBrandDividerSection
          logoSize="md"
          lineStyle="gradient"
          maxWidth="narrow"
          sectionClassName="hidden md:block"
          className="py-6 sm:py-8"
        />

        <section
          id="demo"
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-10 sm:px-6 sm:pb-20 lg:px-8"
        >
          <div className="mb-8 hidden text-center md:block">
            <HomeBlurFadeReveal>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t("demoHighlightsSection.eyebrow")}
              </p>
            </HomeBlurFadeReveal>
            <HomeTextReveal
              as="h2"
              onScroll
              className="mx-auto mt-3 block max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl"
              text={t("demoHighlightsSection.title")}
              stagger={0.05}
            />
          </div>

          <div className="hidden w-full gap-6 md:grid">
            {demoHighlights.map((highlight) => (
              <HomePerspectiveReveal
                key={highlight.id}
                direction={highlight.reverse ? "right" : "left"}
              >
                <section className="grid items-center gap-5 rounded-3xl border border-card-border bg-surface-glass p-4 text-left shadow-card backdrop-blur-xl sm:gap-6 sm:rounded-[2rem] md:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
                  <div
                    className={
                      highlight.reverse
                        ? "relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl shadow-cyan-950/20 lg:order-2"
                        : "relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl shadow-cyan-950/20"
                    }
                  >
                    <video
                      aria-label={highlight.videoLabel}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full rounded-2xl object-cover ring-1 ring-white/10"
                    >
                      <source src={highlight.videoSrc} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  <HomeBlurFadeReveal
                    delay={0.12}
                    direction={highlight.reverse ? "right" : "left"}
                    className={highlight.reverse ? "lg:order-1" : undefined}
                  >
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                      {highlight.eyebrow}
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {highlight.title}
                    </h2>
                    <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
                      {highlight.description}
                    </p>
                    <p className="mt-5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                      {highlight.metric}
                    </p>
                  </HomeBlurFadeReveal>
                </section>
              </HomePerspectiveReveal>
            ))}
          </div>
        </section>

        <SoundprintBrandDividerSection
          logoSize="lg"
          lineStyle="fade"
          maxWidth="medium"
          className="py-8 sm:py-12"
        />

        <section className="mx-auto w-full max-w-7xl px-4 pb-28 sm:px-6 sm:pb-24 md:pb-24 lg:px-8">
          <HomeBlurFadeReveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 px-5 py-8 shadow-2xl shadow-black/20 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(240,64,104,0.24),transparent_34%),radial-gradient(circle_at_86%_22%,rgba(79,144,224,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl"
              aria-hidden
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="text-center lg:text-left">
                <HomeBlurFadeReveal>
                  <SoundprintLogo
                    src="/brand/favicon.png"
                    showText={false}
                    className="mx-auto mb-5 lg:mx-0"
                    imageClassName="h-16 w-16 object-contain"
                  />
                </HomeBlurFadeReveal>
                <HomeBlurFadeReveal delay={0.06}>
                  <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                    {t("closingCta.eyebrow")}
                  </p>
                </HomeBlurFadeReveal>
                <HomeTextReveal
                  as="h2"
                  onScroll
                  className="mt-4 block max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-white sm:text-5xl"
                  text={t("closingCta.title")}
                  stagger={0.045}
                />
                <HomeBlurFadeReveal delay={0.12} className="mt-4 max-w-2xl">
                  <p className="text-base leading-7 text-slate-300">
                    {t("closingCta.subtitle")}
                  </p>
                </HomeBlurFadeReveal>
                <HomeBlurFadeReveal delay={0.2} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href={isAuthenticated ? "/dashboard" : "/sign-up"}
                    className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5 hover:bg-slate-100 md:inline-flex"
                  >
                    {isAuthenticated ? t("goToDashboard") : t("heroPrimaryCta")}
                    <ArrowRightIcon />
                  </Link>
                  {publicDemoPath ? (
                    <Link
                      href={publicDemoPath}
                      className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-slate-950 md:w-auto md:bg-white/10 md:text-white md:shadow-none md:hover:bg-white/15 md:hover:text-white md:active:scale-100"
                    >
                      {t("accessDashboard")}
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : null}
                </HomeBlurFadeReveal>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {closingHighlights.map((highlight, index) => (
                  <HomeBlurFadeReveal key={highlight.label} delay={0.08 * index}>
                    <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 text-left shadow-2xl shadow-black/10 backdrop-blur">
                      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                        {highlight.label}
                      </p>
                      <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">
                        {highlight.value}
                      </p>
                    </div>
                  </HomeBlurFadeReveal>
                ))}
              </div>
            </div>
          </div>
          </HomeBlurFadeReveal>
        </section>
        </div>
      </main>
      <HomeMobileStickyCta isAuthenticated={isAuthenticated} />
      <Footer variant="home" />
    </div>
  );
}
