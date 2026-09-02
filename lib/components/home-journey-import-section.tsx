"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FileArchive, FileSpreadsheet } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";
import { HomeBlurFadeReveal } from "@/lib/components/home-animations";

const SPOTIFY_LOGO_SRC = "/brand/providers/spotify-icon.svg";
const APPLE_MUSIC_LOGO_SRC = "/brand/providers/apple-music-icon.svg";

const PREVIEW_STEPS = ["pick", "upload", "unlock"] as const;

type HomeJourneyImportSectionProps = {
  isAuthenticated: boolean;
  publicDemoPath: string | null;
};

function OverlappingMark({
  children,
  overlap = false,
  rounded = "rounded-full",
}: {
  children: ReactNode;
  overlap?: boolean;
  rounded?: string;
}) {
  return (
    <div
      className={`flex h-9 w-9 items-center justify-center border border-white/15 bg-[#0c0e18] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.85)] ${rounded} ${overlap ? "-ml-2" : ""}`}
    >
      {children}
    </div>
  );
}

function StepVisual({ step }: { step: (typeof PREVIEW_STEPS)[number] }) {
  if (step === "pick") {
    return (
      <div className="flex items-center transition-transform group-hover:scale-105" aria-hidden>
        <OverlappingMark>
          <Image
            src={SPOTIFY_LOGO_SRC}
            alt=""
            width={18}
            height={18}
            className="h-4 w-4 object-contain"
            unoptimized
          />
        </OverlappingMark>
        <OverlappingMark overlap>
          <Image
            src={APPLE_MUSIC_LOGO_SRC}
            alt=""
            width={18}
            height={18}
            className="h-4 w-4 object-contain"
            unoptimized
          />
        </OverlappingMark>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="flex items-center transition-transform group-hover:scale-105" aria-hidden>
        <OverlappingMark rounded="rounded-[10px]">
          <span className="flex flex-col items-center leading-none">
            <FileSpreadsheet className="h-3.5 w-3.5 text-white/80" strokeWidth={2} />
            <span className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-white/70">
              csv
            </span>
          </span>
        </OverlappingMark>
        <OverlappingMark overlap rounded="rounded-[10px]">
          <span className="flex flex-col items-center leading-none">
            <FileArchive className="h-3.5 w-3.5 text-white/80" strokeWidth={2} />
            <span className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-white/70">
              zip
            </span>
          </span>
        </OverlappingMark>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[#050508] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-transform group-hover:scale-105"
      aria-hidden
    >
      <Image
        src="/brand/favicon.png"
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 object-cover"
      />
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
      className={`relative mx-auto w-full max-w-7xl ${HOME_JOURNEY_SECTION_SCROLL_MT} px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8`}
    >
      <HomeBlurFadeReveal>
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7 lg:p-8">
          <div
            className="pointer-events-none absolute -inset-16 -z-10 bg-[radial-gradient(circle_at_center,rgb(152_80_208_/_0.22),transparent_70%)] opacity-70"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-brand-gradient opacity-10 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
                {t("eyebrow")}
              </p>
              <h2 className="mt-3 max-w-xl text-[1.65rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[1.85rem] sm:text-4xl sm:leading-[1.08] sm:tracking-[-0.055em]">
                {t("title")}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
                {t("description")}
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col items-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center lg:justify-end">
              <Link
                href={primaryHref}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
              >
                {primaryLabel}
                <ArrowRightIcon />
              </Link>
              {publicDemoPath ? (
                <Link
                  href={publicDemoPath}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
                >
                  {t("ctaDemo")}
                </Link>
              ) : null}
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
                >
                  {tHome("goToDashboardShort")}
                </Link>
              ) : null}
            </div>
          </div>

          <ol
            className="relative mt-7 grid gap-3 sm:grid-cols-3"
            aria-label={t("previewTitle")}
          >
            {PREVIEW_STEPS.map((step, index) => (
              <li
                key={step}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 transition-all hover:bg-white/10"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 font-mono text-[10px] font-bold text-white/70">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium leading-5 text-white/90">
                    {t(`previewSteps.${step}`)}
                  </span>
                </div>
                <StepVisual step={step} />
              </li>
            ))}
          </ol>
        </div>
      </HomeBlurFadeReveal>
    </section>
  );
}
