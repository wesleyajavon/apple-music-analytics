"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StreamingProviderLogos } from "@/lib/components/streaming-provider-logos";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";
import { HomeBlurFadeReveal } from "@/lib/components/home-animations";

const SPOTIFY_LOGO_SRC = "/brand/providers/spotify-icon.svg";
const APPLE_MUSIC_LOGO_SRC = "/brand/providers/apple-music-icon.svg";

const PREVIEW_STEPS = ["pick", "upload", "unlock"] as const;

type HomeJourneyImportSectionProps = {
  isAuthenticated: boolean;
  publicDemoPath: string | null;
};

function ImportPreviewPanel() {
  const t = useTranslations("home.journey.steps.import");

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-card-border bg-card-surface/80 p-5 shadow-card backdrop-blur-xl sm:p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
          {t("previewBadge")}
        </p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
          {t("previewTitle")}
        </p>
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-background/60 p-4">
          <Image
            src={SPOTIFY_LOGO_SRC}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            unoptimized
            aria-hidden
          />
          <Image
            src={APPLE_MUSIC_LOGO_SRC}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            unoptimized
            aria-hidden
          />
          <span className="text-sm font-medium text-muted">{t("previewProviders")}</span>
        </div>
        <ol className="mt-5 space-y-3">
          {PREVIEW_STEPS.map((key, index) => (
            <li
              key={key}
              className="flex items-start gap-3 rounded-xl border border-card-border/80 bg-background/50 px-3.5 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-300/70 bg-violet-100 font-mono text-[0.65rem] font-bold text-violet-800 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200">
                {index + 1}
              </span>
              <span className="pt-0.5 text-sm leading-6 text-foreground/90">
                {t(`previewSteps.${key}`)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

export function HomeJourneyImportSection({
  isAuthenticated,
  publicDemoPath,
}: HomeJourneyImportSectionProps) {
  const t = useTranslations("home.journey.steps.import");
  const tHome = useTranslations("home");

  const primaryHref = isAuthenticated ? "/dashboard/onboarding" : "/sign-up";
  const primaryLabel = isAuthenticated ? t("ctaOnboarding") : t("cta");

  return (
    <section
      id="import"
      className={`relative mx-auto w-full max-w-7xl ${HOME_JOURNEY_SECTION_SCROLL_MT} px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8`}
    >
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-12">
        <HomeBlurFadeReveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">
            {t("description")}
          </p>

          <StreamingProviderLogos
            caption={tHome("supportedStreamingCaption")}
            spotifyLogoAlt={tHome("spotifyLogoAlt")}
            appleMusicLogoAlt={tHome("appleMusicLogoAlt")}
            className="mt-6"
          />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={primaryHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95"
            >
              {primaryLabel}
              <ArrowRightIcon />
            </Link>
            {publicDemoPath ? (
              <Link
                href={publicDemoPath}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-surface px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {t("ctaDemo")}
              </Link>
            ) : null}
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-surface px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {tHome("goToDashboardShort")}
              </Link>
            ) : null}
          </div>
        </HomeBlurFadeReveal>

        <HomeBlurFadeReveal delay={0.1} direction="right">
          <ImportPreviewPanel />
        </HomeBlurFadeReveal>
      </div>
    </section>
  );
}
