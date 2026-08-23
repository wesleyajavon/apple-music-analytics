"use client";

import { useTranslations } from "next-intl";
import { HomeDashboardPreviewsSection } from "@/lib/components/home-dashboard-previews";
import { HomeDemoHighlights } from "@/lib/components/home-demo-highlights";
import { HomeBlurFadeReveal, HomeTextReveal } from "@/lib/components/home-animations";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";

export function HomeJourneyExploreSection() {
  const t = useTranslations("home.journey.steps.explore");

  return (
    <section
      id="explore"
      className={`relative ${HOME_JOURNEY_SECTION_SCROLL_MT} pb-12 sm:pb-20`}
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center md:mb-12 lg:text-left">
          <HomeBlurFadeReveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              {t("eyebrow")}
            </p>
          </HomeBlurFadeReveal>
          <HomeTextReveal
            as="h2"
            onScroll
            className="mx-auto mt-3 block max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl lg:mx-0"
            text={t("title")}
            stagger={0.05}
          />
          <HomeBlurFadeReveal delay={0.1} className="mx-auto mt-4 max-w-2xl lg:mx-0">
            <p className="text-base leading-7 text-muted sm:text-lg">{t("description")}</p>
          </HomeBlurFadeReveal>
        </div>
      </div>

      <HomeDashboardPreviewsSection embedded />

      <div className="mt-10 sm:mt-14">
        <HomeDemoHighlights />
      </div>
    </section>
  );
}
