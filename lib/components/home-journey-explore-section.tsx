"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HomeDashboardPreviewsSection } from "@/lib/components/home-dashboard-previews";
import { HomeDemoHighlights } from "@/lib/components/home-demo-highlights";
import { HomeBlurFadeReveal, HomeTextReveal } from "@/lib/components/home-animations";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";

type HomeJourneyExploreSectionProps = {
  publicDemoPath: string | null;
};

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

export function HomeJourneyExploreSection({ publicDemoPath }: HomeJourneyExploreSectionProps) {
  const t = useTranslations("home.journey.steps.explore");

  return (
    <section
      id="explore"
      className={`relative ${HOME_JOURNEY_SECTION_SCROLL_MT} pb-12 sm:pb-20`}
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 md:mb-12">
          <HomeBlurFadeReveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {t("eyebrow")}
            </p>
          </HomeBlurFadeReveal>
          <HomeTextReveal
            as="h2"
            onScroll
            className="mt-3 block max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl"
            text={t("title")}
            stagger={0.05}
          />
          <HomeBlurFadeReveal delay={0.1} className="mt-4 max-w-2xl">
            <p className="text-base leading-7 text-muted sm:text-lg">{t("description")}</p>
          </HomeBlurFadeReveal>
        </div>
      </div>

      <HomeDashboardPreviewsSection embedded />

      <div className="mt-10 space-y-12 sm:mt-14 sm:space-y-16">
        <HomeDemoHighlights />

        {publicDemoPath ? (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <HomeBlurFadeReveal>
              <Link
                href={publicDemoPath}
                className="inline-flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto"
              >
                {t("cta")}
                <ArrowRightIcon />
              </Link>
            </HomeBlurFadeReveal>
          </div>
        ) : null}
      </div>
    </section>
  );
}
