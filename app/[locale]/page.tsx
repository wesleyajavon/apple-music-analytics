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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="relative flex flex-1 flex-col overflow-hidden bg-app-shell">
        <div
          className="absolute left-1/2 top-0 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-accent-violet/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -left-32 top-36 -z-10 h-72 w-72 rounded-full bg-accent-rose/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -right-40 top-[28rem] -z-10 h-96 w-96 rounded-full bg-accent-cyan/20 blur-3xl"
          aria-hidden
        />

        <header className="sticky top-0 z-30 border-b border-card-border bg-surface-glass backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-full py-1.5 pr-2 outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:pr-3"
              aria-label="Soundprint-AI"
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
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeSwitcher placement="bottom" />
              <Suspense
                fallback={<div className="h-10 w-28 animate-pulse rounded-xl bg-card-surface" />}
              >
                <LanguageSwitcher placement="bottom" />
              </Suspense>
              <Link
                href={isAuthenticated ? "/dashboard" : "/sign-in"}
                className="hidden rounded-xl border border-card-border bg-card-surface px-4 py-2 text-sm font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:inline-flex"
              >
                {isAuthenticated ? t("goToDashboard") : tAuth("signIn")}
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:px-8 lg:pb-28 lg:pt-20">
          <div className="text-left">
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="group mb-6 inline-flex items-center gap-2 rounded-full border border-card-border bg-card-surface px-3 py-1.5 text-sm font-semibold text-primary shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.7)]" />
              {t("heroEyebrow")}
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <h1 className="max-w-4xl overflow-visible text-balance text-5xl font-semibold leading-snug tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl lg:leading-[1.12]">
              {welcomeMessage}
              {!firstName ? (
                <span className="mt-1 block bg-brand-gradient bg-clip-text pb-1.5 leading-normal text-transparent sm:pb-2">
                  {t("heroGradient")}
                </span>
              ) : null}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              {t("subtitle")}
            </p>

            <StreamingProviderLogos
              caption={t("supportedStreamingCaption")}
              spotifyLogoAlt={t("spotifyLogoAlt")}
              appleMusicLogoAlt={t("appleMusicLogoAlt")}
              className="mt-5"
            />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95"
                >
                  {t("goToDashboard")}
                  <ArrowRightIcon />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95"
                  >
                    {tAuth("signUp")}
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center justify-center rounded-xl border border-card-border bg-surface-glass px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-card-surface"
                  >
                    {tAuth("signIn")}
                  </Link>
                </>
              )}
              <Link
                href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {t("accessDashboard")}
              </Link>
            </div>
          </div>

          <div id="product" className="relative">
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
          className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
        >
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t("featuresEyebrow")}
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
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

        <section id="demo" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <DemoTerminalHero className="mb-8" />

          <div className="mb-8 text-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {t("demoHighlightsSection.eyebrow")}
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              {t("demoHighlightsSection.title")}
            </h2>
          </div>

          <div className="grid w-full gap-6">
            {demoHighlights.map((highlight) => (
              <section
                key={highlight.id}
                className="grid items-center gap-6 rounded-[2rem] border border-card-border bg-surface-glass p-4 text-left shadow-card backdrop-blur-xl md:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8"
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

        <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-card-border bg-slate-950 px-6 py-10 text-center shadow-2xl shadow-black/20 sm:px-10 sm:py-14">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              {t("closingCta.eyebrow")}
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              {t("closingCta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
              {t("closingCta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={isAuthenticated ? "/dashboard" : "/sign-up"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-slate-100"
              >
                {isAuthenticated ? t("goToDashboard") : tAuth("signUp")}
                <ArrowRightIcon />
              </Link>
              <Link
                href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15"
              >
                {t("accessDashboard")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="home" />
    </div>
  );
}
