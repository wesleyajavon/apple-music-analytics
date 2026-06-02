"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { Footer } from "@/lib/components/footer";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { DemoTerminalHero } from "@/lib/components/demo-terminal-hero";
import { HomeMobileNav } from "@/lib/components/home-mobile-nav";
import { HomeMobileStickyCta } from "@/lib/components/home-mobile-sticky-cta";
import { StreamingProviderLogos } from "@/lib/components/streaming-provider-logos";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const [firstName, setFirstName] = useState<string | null>(null);
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

    async function hydrateUserName() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsAuthenticated(!!data.user);
      setFirstName(resolveFirstName(data.user));
    }

    hydrateUserName();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(!!session?.user);
      setFirstName(resolveFirstName(session?.user ?? null));
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

  const featureCards = [
    {
      title: t("features.timeline.title"),
      description: t("features.timeline.description"),
      accent: "from-accent-rose/20 to-accent-violet/10",
    },
    {
      title: t("features.genresArtists.title"),
      description: t("features.genresArtists.description"),
      accent: "from-accent-cyan/20 to-accent-indigo/10",
    },
    {
      title: t("features.aiInsights.title"),
      description: t("features.aiInsights.description"),
      accent: "from-accent-emerald/20 to-accent-cyan/10",
    },
  ];

  const workflowSteps = [
    t("workflow.import"),
    t("workflow.analyze"),
    t("workflow.share"),
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
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand-glow ring-1 ring-white/20 transition-transform group-hover:rotate-[-2deg] group-hover:scale-105 sm:h-11 sm:w-11">
                <SoundprintLogo
                  src="/brand/favicon.png"
                  showText={false}
                  imageClassName="h-7 w-7 rounded-xl sm:h-8 sm:w-8"
                  priority
                />
              </span>
              <span className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="text-base font-semibold tracking-[-0.03em] text-foreground">
                  Soundprint
                </span>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">
                  AI
                </span>
              </span>
            </Link>

            <div className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
              <a href="#product" className="transition-colors hover:text-foreground">
                {t("nav.product")}
              </a>
              <a href="#insights" className="transition-colors hover:text-foreground">
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
                className="inline-flex min-h-11 max-w-[7.5rem] items-center justify-center truncate rounded-xl border border-card-border bg-card-surface px-3 text-xs font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:max-w-none sm:px-4 sm:text-sm md:hover:shadow-card-hover"
                title={isAuthenticated ? t("goToDashboard") : tAuth("signIn")}
              >
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
        <div
          className="absolute left-1/2 top-0 -z-10 hidden h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-accent-violet/20 blur-3xl md:block"
          aria-hidden
        />
        <div
          className="absolute -left-32 top-36 -z-10 hidden h-72 w-72 rounded-full bg-accent-rose/20 blur-3xl md:block"
          aria-hidden
        />
        <div
          className="absolute -right-40 top-[28rem] -z-10 hidden h-96 w-96 rounded-full bg-accent-cyan/20 blur-3xl md:block"
          aria-hidden
        />

        <section className="mx-auto grid w-full max-w-7xl scroll-mt-24 items-center gap-8 px-4 pb-16 pt-10 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="text-left">
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="group mb-6 inline-flex items-center gap-2 rounded-full border border-card-border bg-card-surface px-3 py-1.5 text-sm font-semibold text-primary shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.7)]" />
              {t("heroEyebrow")}
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <h1 className="max-w-4xl overflow-visible text-balance text-[2.35rem] font-semibold leading-[1.15] tracking-[-0.05em] text-foreground sm:text-6xl sm:leading-snug sm:tracking-[-0.06em] lg:text-7xl lg:leading-[1.12]">
              {welcomeMessage}
              {!firstName ? (
                <span className="mt-1 block bg-brand-gradient bg-clip-text pb-1.5 leading-normal text-transparent sm:pb-2">
                  {t("heroGradient")}
                </span>
              ) : null}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:mt-6 sm:text-xl sm:leading-8">
              {t("subtitle")}
            </p>

            <StreamingProviderLogos
              caption={t("supportedStreamingCaption")}
              spotifyLogoAlt={t("spotifyLogoAlt")}
              appleMusicLogoAlt={t("appleMusicLogoAlt")}
              className="mt-5"
            />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="hidden min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 md:inline-flex"
                >
                  {t("goToDashboard")}
                  <ArrowRightIcon />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="hidden min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 md:inline-flex"
                  >
                    {tAuth("signUp")}
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="hidden min-h-11 items-center justify-center rounded-xl border border-card-border bg-surface-glass px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-card-surface md:inline-flex"
                  >
                    {tAuth("signIn")}
                  </Link>
                </>
              )}
              <Link
                href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-6 py-3 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary/10 md:w-auto"
              >
                {t("accessDashboard")}
              </Link>
            </div>
          </div>

          <div id="product" className="relative scroll-mt-24">
            <div
              className="absolute -inset-6 rounded-[2rem] bg-brand-gradient-soft blur-2xl"
              aria-hidden
            />
            <div className="relative rounded-[2rem] border border-card-border bg-surface-glass p-3 shadow-card backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/30">
                <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  </div>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                    {t("productPreview.label")}
                  </p>
                </div>

                <div className="grid gap-3 p-2 pt-4 sm:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-sm font-semibold text-white">
                        {t("productPreview.cardTitle")}
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        18,420
                      </p>
                      <p className="mt-1 text-xs text-cyan-200">
                        {t("productPreview.cardMeta")}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[70, 48, 86].map((height, index) => (
                        <div
                          key={height}
                          className="flex h-28 items-end rounded-2xl border border-white/10 bg-white/[0.05] p-2"
                        >
                          <div
                            className="w-full rounded-xl bg-gradient-to-t from-accent-violet to-accent-cyan"
                            style={{ height: `${height}%` }}
                            aria-hidden
                          />
                          <span className="sr-only">
                            {t("productPreview.chartBar", { index: index + 1 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                      {t("productPreview.insightEyebrow")}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {t("productPreview.insightTitle")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {t("productPreview.insightCopy")}
                    </p>
                    <div className="mt-5 space-y-3">
                      {workflowSteps.map((step, index) => (
                        <div
                          key={step}
                          className="flex items-center gap-3 rounded-2xl bg-black/20 p-3 text-sm text-slate-200 ring-1 ring-white/10"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-cyan-100">
                            0{index + 1}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="insights"
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8"
        >
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t("featuresEyebrow")}
              </p>
              <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                {t("featuresTitle")}
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-muted">
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-card-border bg-card-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${feature.accent} opacity-80 transition-opacity group-hover:opacity-100`}
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-8 h-10 w-10 rounded-2xl bg-brand-gradient shadow-brand-glow" />
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="demo"
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8"
        >
          <DemoTerminalHero className="mb-8" />

          <div className="mb-8 text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {t("demoHighlightsSection.eyebrow")}
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              {t("demoHighlightsSection.title")}
            </h2>
          </div>

          <div className="grid w-full gap-6">
            {demoHighlights.map((highlight) => (
              <section
                key={highlight.id}
                className="grid items-center gap-5 rounded-3xl border border-card-border bg-surface-glass p-4 text-left shadow-card backdrop-blur-xl sm:gap-6 sm:rounded-[2rem] md:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8"
              >
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

                <div className={highlight.reverse ? "lg:order-1" : undefined}>
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
                </div>
              </section>
            ))}
          </div>
        </section>

        <section
          id="soundprint-ai-chat"
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8"
        >
          <div className="mb-10 text-center lg:mb-12">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {t("soundprintAiChatDemo.sectionEyebrow")}
            </p>
            <h2 className="mx-auto mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              {t("soundprintAiChatDemo.sectionTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              {t("soundprintAiChatDemo.sectionSubtitle")}
            </p>
          </div>

          <DemoTerminalHero
            videoSrc="/media/aichat.mp4"
            videoLabel={t("soundprintAiChatDemo.videoLabel")}
            eyebrow={t("soundprintAiChatDemo.heroEyebrow")}
            subtitle={t("soundprintAiChatDemo.heroSubtitle")}
            badge={t("soundprintAiChatDemo.heroBadge")}
            features={soundprintAiChatFeatures}
            className="max-w-6xl"
          />

          <div className="mt-10 flex justify-center">
            <Link
              href={
                isAuthenticated
                  ? "/dashboard/ask-your-soundprint"
                  : `/dashboard/ask-your-soundprint?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`
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
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-28 sm:px-6 sm:pb-24 md:pb-24 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-card-border bg-slate-950 px-5 py-8 text-center shadow-2xl shadow-black/20 sm:rounded-[2rem] sm:px-10 sm:py-14">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              {t("closingCta.eyebrow")}
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              {t("closingCta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
              {t("closingCta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={isAuthenticated ? "/dashboard" : "/sign-up"}
                className="hidden min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100 md:inline-flex"
              >
                {isAuthenticated ? t("goToDashboard") : tAuth("signUp")}
                <ArrowRightIcon />
              </Link>
              <Link
                href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15 md:w-auto"
              >
                {t("accessDashboard")}
              </Link>
            </div>
          </div>
        </section>
        </div>
      </main>
      <HomeMobileStickyCta isAuthenticated={isAuthenticated} />
      <Footer variant="home" />
    </div>
  );
}
