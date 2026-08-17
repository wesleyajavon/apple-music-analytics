"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { DemoTerminalHero } from "@/lib/components/demo-terminal-hero";
import { HomeDuetPreview } from "@/lib/components/home-duet-preview";
import { HomeBlurFadeReveal, HomeClipReveal, HomeTextReveal } from "@/lib/components/home-animations";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";

export function HomeJourneyInteractSection() {
  const t = useTranslations("home.journey.steps.interact");
  const tHome = useTranslations("home");

  const soundprintAiChatFeatures = useMemo(
    () =>
      (["artistDeepdive", "compareEras", "groundedAnswers"] as const).map((key) => ({
        label: tHome(`soundprintAiChatDemo.features.${key}.label`),
        supportingText: tHome(`soundprintAiChatDemo.features.${key}.supporting`),
      })),
    [tHome],
  );

  return (
    <section
      id="interact"
      className={`mx-auto w-full max-w-7xl ${HOME_JOURNEY_SECTION_SCROLL_MT} px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8`}
    >
      <div className="mb-10 lg:mb-12">
        <HomeBlurFadeReveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {t("eyebrow")}
          </p>
        </HomeBlurFadeReveal>
        <HomeTextReveal
          as="h2"
          onScroll
          className="mt-3 block max-w-4xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl"
          text={t("title")}
          stagger={0.05}
        />
        <HomeBlurFadeReveal delay={0.1} className="mt-4 max-w-2xl">
          <p className="text-base leading-7 text-muted sm:text-lg">{t("description")}</p>
        </HomeBlurFadeReveal>
      </div>

      <div className="space-y-14 sm:space-y-16">
        <div id="soundprint-ai-chat" className="scroll-mt-28">
          <HomeBlurFadeReveal>
            <p className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {tHome("soundprintAiChatDemo.sectionEyebrow")}
            </p>
          </HomeBlurFadeReveal>

          <DemoTerminalHero
            videoSrc="/media/aichat.mp4"
            videoLabel={tHome("soundprintAiChatDemo.videoLabel")}
            eyebrow={tHome("soundprintAiChatDemo.heroEyebrow")}
            subtitle={tHome("soundprintAiChatDemo.heroSubtitle")}
            badge={tHome("soundprintAiChatDemo.heroBadge")}
            features={soundprintAiChatFeatures}
            showFeaturesOnMobile={false}
            className="w-full max-w-6xl"
          />
        </div>

        <div id="duet" className="scroll-mt-28">
          <HomeBlurFadeReveal>
            <p className="mb-6 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {tHome("duetPreview.sectionEyebrow")}
            </p>
          </HomeBlurFadeReveal>

          <HomeClipReveal className="relative z-10" delay={0.15}>
            <HomeDuetPreview />
          </HomeClipReveal>
        </div>
      </div>
    </section>
  );
}
