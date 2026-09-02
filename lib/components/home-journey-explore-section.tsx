"use client";

import { useTranslations } from "next-intl";
import { HomeDashboardPreviewsSection } from "@/lib/components/home-dashboard-previews";
import { HomeBlurFadeReveal, HomeTextReveal } from "@/lib/components/home-animations";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";

export function HomeJourneyExploreSection() {
  const t = useTranslations("home.journey.steps.explore");

  return (
    <section
      id="explore"
      className={`relative ${HOME_JOURNEY_SECTION_SCROLL_MT} pb-16 pt-8 sm:pb-24 sm:pt-12`}
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center md:mb-12 lg:text-left">
          <HomeBlurFadeReveal>
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
              {t("eyebrow")}
            </p>
          </HomeBlurFadeReveal>
          <HomeTextReveal
            as="h2"
            onScroll
            className="mx-auto mt-3 block max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[2.05rem] sm:text-5xl sm:leading-[1.08] sm:tracking-[-0.055em] lg:mx-0"
            text={t("title")}
            stagger={0.05}
          />
          <HomeBlurFadeReveal delay={0.1} className="mx-auto mt-4 max-w-2xl lg:mx-0">
            <p className="text-base leading-7 text-white/68 sm:text-lg sm:leading-8">{t("description")}</p>
          </HomeBlurFadeReveal>
        </div>
      </div>

      <HomeDashboardPreviewsSection embedded />
    </section>
  );
}
