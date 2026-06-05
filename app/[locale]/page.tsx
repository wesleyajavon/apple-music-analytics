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
import { UserAvatar } from "@/lib/components/user-avatar";
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

  const featureCards = [
    {
      id: "timeline",
      title: t("features.timeline.title"),
      description: t("features.timeline.description"),
      accent: "from-accent-rose/20 to-accent-violet/10",
    },
    {
      id: "genres",
      title: t("features.genresArtists.title"),
      description: t("features.genresArtists.description"),
      accent: "from-accent-cyan/20 to-accent-indigo/10",
    },
    {
      id: "ai",
      title: t("features.aiInsights.title"),
      description: t("features.aiInsights.description"),
      accent: "from-accent-emerald/20 to-accent-cyan/10",
    },
  ] as const;

  const discoveryCards = [
    {
      label: t("discoveries.lateNight.label"),
      title: t("discoveries.lateNight.title"),
      metric: "1:14 AM",
      accentClassName: "from-accent-cyan/30 to-accent-violet/10",
    },
    {
      label: t("discoveries.artistStreak.label"),
      title: t("discoveries.artistStreak.title"),
      metric: "42 days",
      accentClassName: "from-accent-rose/30 to-accent-violet/10",
    },
    {
      label: t("discoveries.tasteShift.label"),
      title: t("discoveries.tasteShift.title"),
      metric: "+18%",
      accentClassName: "from-accent-violet/30 to-accent-cyan/10",
    },
    {
      label: t("discoveries.hiddenEra.label"),
      title: t("discoveries.hiddenEra.title"),
      metric: "2022",
      accentClassName: "from-accent-emerald/25 to-accent-cyan/10",
    },
  ];

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

  const workflowSteps = [
    t("workflow.import"),
    t("workflow.analyze"),
    t("workflow.share"),
  ];

  const heroInsightChips = [
    {
      label: t("heroInsightChips.lateNight"),
      dotClassName: "bg-accent-cyan",
    },
    {
      label: t("heroInsightChips.tasteShift"),
      dotClassName: "bg-accent-rose",
    },
    {
      label: t("heroInsightChips.artistStreak"),
      dotClassName: "bg-accent-emerald",
    },
  ];

  const productSignalRows = [
    {
      label: t("productPreview.signalRows.obsession"),
      value: "42d",
      accentClassName: "bg-accent-rose",
    },
    {
      label: t("productPreview.signalRows.shift"),
      value: "+18%",
      accentClassName: "bg-accent-violet",
    },
    {
      label: t("productPreview.signalRows.ritual"),
      value: "1:14a",
      accentClassName: "bg-accent-cyan",
    },
  ];

  const productWaveBars = [34, 62, 48, 78, 56, 92, 66, 44, 72, 58];

  const productGenrePills = [
    t("productPreview.genrePills.indie"),
    t("productPreview.genrePills.electronic"),
    t("productPreview.genrePills.altPop"),
  ];

  const heroProofPills = [
    t("heroProof.private"),
    t("heroProof.demoFirst"),
    t("heroProof.appleSpotify"),
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
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[42rem] bg-[linear-gradient(to_right,rgb(152_80_208_/_0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(79_144_224_/_0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)] lg:block"
          aria-hidden
        />

        <section className="mx-auto grid w-full max-w-7xl scroll-mt-24 items-center gap-10 px-4 pb-16 pt-10 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="text-left">
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
            ) : (
              <Link
                href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
                className="group mb-6 inline-flex items-center gap-2 rounded-full border border-card-border bg-card-surface px-3 py-1.5 text-sm font-semibold text-primary shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.7)]" />
                {t("heroEyebrow")}
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}

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
                  className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 md:inline-flex"
                >
                  {t("goToDashboard")}
                  <ArrowRightIcon />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 md:inline-flex"
                  >
                    {t("heroPrimaryCta")}
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="hidden min-h-12 items-center justify-center rounded-2xl border border-card-border bg-surface-glass px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-card-surface md:inline-flex"
                  >
                    {tAuth("signIn")}
                  </Link>
                </>
              )}
              <Link
                href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 py-3 text-center text-sm font-semibold transition-all hover:-translate-y-0.5 md:w-auto ${
                  isAuthenticated
                    ? "border border-card-border bg-surface-glass text-muted backdrop-blur hover:bg-card-surface hover:text-foreground"
                    : "border border-primary/15 bg-primary/10 text-primary shadow-card backdrop-blur hover:bg-primary/15"
                }`}
              >
                {t("accessDashboard")}
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {heroProofPills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card-surface/70 px-3 py-1.5 text-xs font-semibold text-muted shadow-sm backdrop-blur"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-accent-emerald shadow-[0_0_12px_rgb(22_199_132_/0.7)]"
                    aria-hidden
                  />
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div id="product" className="relative scroll-mt-24">
            <div
              className="absolute -inset-6 rounded-[2rem] bg-brand-gradient-soft blur-2xl"
              aria-hidden
            />
            <div className="relative space-y-3 rounded-[2rem] border border-card-border bg-surface-glass p-3 shadow-card backdrop-blur-xl">
              <div className="hidden gap-2 sm:grid sm:grid-cols-3">
                {heroInsightChips.map((chip) => (
                  <div
                    key={chip.label}
                    className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-black/10 backdrop-blur-xl"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${chip.dotClassName} shadow-[0_0_16px_currentColor]`}
                      aria-hidden
                    />
                    <span className="min-w-0 text-balance leading-4">{chip.label}</span>
                  </div>
                ))}
              </div>
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 p-3 shadow-2xl shadow-black/30">
                <div
                  className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl"
                  aria-hidden
                />
                <div className="relative flex items-center justify-between border-b border-white/10 px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  </div>
                  <div className="flex items-center gap-2">
                    <SoundprintLogo
                      src="/brand/favicon.png"
                      showText={false}
                      imageClassName="h-6 w-6 rounded-lg ring-1 ring-white/15"
                    />
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
                      {t("productPreview.label")}
                    </p>
                  </div>
                </div>

                <div className="relative grid gap-3 p-2 pt-4 sm:grid-cols-[0.88fr_1.12fr]">
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                      <div
                        className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-accent-rose/20 blur-2xl"
                        aria-hidden
                      />
                      <div className="relative flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {t("productPreview.cardTitle")}
                          </p>
                          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                            18,420
                          </p>
                        </div>
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                          {t("productPreview.liveBadge")}
                        </span>
                      </div>
                      <p className="relative mt-1 text-xs text-cyan-200">
                        {t("productPreview.cardMeta")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {t("productPreview.waveformLabel")}
                        </p>
                        <p className="text-xs font-semibold text-cyan-200">+31%</p>
                      </div>
                      <div className="flex h-16 items-end gap-1.5 sm:h-24">
                        {productWaveBars.map((height, index) => (
                          <div
                            key={`${height}-${index}`}
                            className="flex-1 rounded-full bg-gradient-to-t from-accent-violet via-accent-cyan to-white/80"
                            style={{ height: `${height}%` }}
                            aria-hidden
                          />
                        ))}
                      </div>
                      <span className="sr-only">{t("productPreview.waveformLabel")}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {productGenrePills.map((genre) => (
                        <div
                          key={genre}
                          className="rounded-2xl border border-white/10 bg-white/[0.05] p-2 text-center text-[0.65rem] font-semibold text-slate-200"
                        >
                          {genre}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                      {t("productPreview.insightEyebrow")}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {t("productPreview.insightTitle")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {t("productPreview.insightCopy")}
                    </p>
                    <div className="mt-5 grid gap-2">
                      {productSignalRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-2xl bg-black/20 p-3 ring-1 ring-white/10"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.accentClassName}`}
                              aria-hidden
                            />
                            <span className="truncate text-sm font-medium text-slate-200">
                              {row.label}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-semibold text-white">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 hidden space-y-3 sm:block">
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
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-10 sm:px-6 sm:pb-20 lg:px-8"
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

          <div className="grid gap-3 md:hidden">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-2xl border border-card-border bg-card-surface p-4 shadow-card"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient p-1.5 shadow-brand-glow ring-1 ring-white/20">
                  <SoundprintLogo
                    src="/brand/favicon.png"
                    showText={false}
                    imageClassName="h-full w-full rounded-xl"
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden gap-4 md:grid lg:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-card-border bg-card-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${feature.accent} opacity-80 transition-opacity group-hover:opacity-100`}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -right-10 -top-10 opacity-[0.06] transition-opacity group-hover:opacity-[0.1]"
                  aria-hidden
                >
                  <SoundprintLogo
                    src="/brand/favicon.png"
                    showText={false}
                    imageClassName="h-32 w-32 rounded-[2rem]"
                  />
                </div>
                <div className="relative">
                  <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient p-1.5 shadow-brand-glow ring-1 ring-white/20 transition-transform group-hover:rotate-[-2deg] group-hover:scale-105">
                    <SoundprintLogo
                      src="/brand/favicon.png"
                      showText={false}
                      imageClassName="h-full w-full rounded-xl"
                    />
                  </div>
                  <div className="mb-6 rounded-2xl border border-card-border/80 bg-surface-glass/70 p-3 backdrop-blur">
                    {feature.id === "timeline" ? (
                      <div className="flex h-20 items-end gap-1.5">
                        {[28, 52, 38, 74, 46, 88, 58, 66, 44, 80].map(
                          (height, index) => (
                            <div
                              key={`${height}-${index}`}
                              className="flex-1 rounded-full bg-gradient-to-t from-accent-rose via-accent-violet to-accent-cyan opacity-85 transition-opacity group-hover:opacity-100"
                              style={{ height: `${height}%` }}
                              aria-hidden
                            />
                          ),
                        )}
                      </div>
                    ) : null}
                    {feature.id === "genres" ? (
                      <div className="grid h-20 grid-cols-4 gap-2">
                        {[
                          "bg-accent-rose",
                          "bg-accent-violet",
                          "bg-accent-cyan",
                          "bg-accent-emerald",
                          "bg-accent-indigo",
                          "bg-accent-pink",
                          "bg-accent-cyan/70",
                          "bg-accent-violet/70",
                        ].map((className, index) => (
                          <span
                            key={`${className}-${index}`}
                            className={`rounded-2xl ${className} shadow-sm transition-transform group-hover:scale-105`}
                            aria-hidden
                          />
                        ))}
                      </div>
                    ) : null}
                    {feature.id === "ai" ? (
                      <div className="flex h-20 flex-col justify-center gap-2">
                        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm">
                          {t("features.aiInsights.demoQuestion")}
                        </div>
                        <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md border border-primary/15 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                          {t("features.aiInsights.demoAnswer")}
                        </div>
                      </div>
                    ) : null}
                  </div>
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

        <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-card-border bg-surface-glass p-4 shadow-card backdrop-blur-xl sm:p-6 lg:p-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                  {t("discoveriesEyebrow")}
                </p>
                <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                  {t("discoveriesTitle")}
                </h2>
              </div>
              <p className="max-w-md text-base leading-7 text-muted">
                {t("discoveriesSubtitle")}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {discoveryCards.map((card) => (
                <div
                  key={card.label}
                  className="group relative overflow-hidden rounded-3xl border border-card-border bg-card-surface p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${card.accentClassName}`}
                    aria-hidden
                  />
                  <div className="relative">
                    <div className="mb-8 flex items-center justify-between">
                      <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">
                        {card.label}
                      </span>
                      <SoundprintLogo
                        src="/brand/favicon.png"
                        showText={false}
                        imageClassName="h-8 w-8 rounded-xl opacity-80 transition-transform group-hover:rotate-[-2deg] group-hover:scale-105"
                      />
                    </div>
                    <p className="font-mono text-3xl font-semibold tracking-[-0.04em] text-foreground">
                      {card.metric}
                    </p>
                    <h3 className="mt-3 text-base font-semibold leading-6 tracking-tight text-foreground">
                      {card.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="demo"
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-10 sm:px-6 sm:pb-20 lg:px-8"
        >
          <DemoTerminalHero className="mb-8" />

          <div className="mb-8 hidden text-center md:block">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {t("demoHighlightsSection.eyebrow")}
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
              {t("demoHighlightsSection.title")}
            </h2>
          </div>

          <div className="hidden w-full gap-6 md:grid">
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
          className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8"
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

          <div className="rounded-3xl border border-card-border bg-card-surface p-5 shadow-card md:hidden">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient p-1.5 shadow-brand-glow ring-1 ring-white/20">
              <SoundprintLogo
                src="/brand/favicon.png"
                showText={false}
                imageClassName="h-full w-full rounded-xl"
              />
            </div>
            <div className="space-y-3">
              {soundprintAiChatFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="rounded-2xl border border-card-border bg-surface-glass/70 p-3"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {feature.label}
                  </p>
                  <p className="mt-1 font-mono text-[0.65rem] font-medium uppercase leading-5 tracking-[0.18em] text-muted">
                    {feature.supportingText}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <DemoTerminalHero
            videoSrc="/media/aichat.mp4"
            videoLabel={t("soundprintAiChatDemo.videoLabel")}
            eyebrow={t("soundprintAiChatDemo.heroEyebrow")}
            subtitle={t("soundprintAiChatDemo.heroSubtitle")}
            badge={t("soundprintAiChatDemo.heroBadge")}
            features={soundprintAiChatFeatures}
            className="hidden max-w-6xl md:block"
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
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-gradient p-2 shadow-brand-glow ring-1 ring-white/20 lg:mx-0">
                  <SoundprintLogo
                    src="/brand/favicon.png"
                    showText={false}
                    imageClassName="h-full w-full rounded-2xl"
                  />
                </div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                  {t("closingCta.eyebrow")}
                </p>
                <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  {t("closingCta.title")}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                  {t("closingCta.subtitle")}
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href={isAuthenticated ? "/dashboard" : "/sign-up"}
                    className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5 hover:bg-slate-100 md:inline-flex"
                  >
                    {isAuthenticated ? t("goToDashboard") : t("heroPrimaryCta")}
                    <ArrowRightIcon />
                  </Link>
                  <Link
                    href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/15 md:w-auto"
                  >
                    {t("accessDashboard")}
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {closingHighlights.map((highlight) => (
                  <div
                    key={highlight.label}
                    className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 text-left shadow-2xl shadow-black/10 backdrop-blur"
                  >
                    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                      {highlight.label}
                    </p>
                    <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">
                      {highlight.value}
                    </p>
                  </div>
                ))}
              </div>
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
