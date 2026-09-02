"use client";

import { useTranslations } from "next-intl";
import { HomeMusicHubPreview } from "@/lib/components/home-music-hub-preview";
import { HomeDashboardPreviewsParallax } from "@/lib/components/home-dashboard-previews-parallax";
import {
  HomeBlurFadeReveal,
  HomeTextReveal,
} from "@/lib/components/home-animations";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";

export function HomeDashboardPreviewsSection({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("home.dashboardPreviews");

  const hub = (
    <HomeDashboardPreviewsParallax>
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <HomeMusicHubPreview />
      </div>
    </HomeDashboardPreviewsParallax>
  );

  if (embedded) {
    return hub;
  }

  return (
    <section id="explore" className={`relative ${HOME_JOURNEY_SECTION_SCROLL_MT} pb-10 sm:pb-20`}>
      <HomeDashboardPreviewsParallax>
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 md:mb-12">
            <HomeBlurFadeReveal>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
                {t("eyebrow")}
              </p>
            </HomeBlurFadeReveal>
            <HomeTextReveal
              as="h2"
              onScroll
              className="mt-3 block max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[2.05rem] sm:text-5xl sm:leading-[1.08] sm:tracking-[-0.055em]"
              text={t("title")}
              stagger={0.05}
            />
            <HomeBlurFadeReveal delay={0.1} className="mt-4 max-w-2xl">
              <p className="text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
                {t("subtitle")}
              </p>
            </HomeBlurFadeReveal>
          </div>

          <HomeMusicHubPreview />
        </div>
      </HomeDashboardPreviewsParallax>
    </section>
  );
}
