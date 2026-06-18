"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DemoTerminalHero } from "@/lib/components/demo-terminal-hero";
import { HomeDuetPreview } from "@/lib/components/home-duet-preview";
import { HomeBlurFadeReveal, HomeClipReveal, HomeTextReveal } from "@/lib/components/home-animations";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";
import { withPublicDemoUserId } from "@/lib/constants/public-profile";

type HomeJourneyInteractSectionProps = {
  isAuthenticated: boolean;
  publicProfileUserId: string | null;
};

function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

export function HomeJourneyInteractSection({
  isAuthenticated,
  publicProfileUserId,
}: HomeJourneyInteractSectionProps) {
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

  const chatHref = isAuthenticated
    ? "/dashboard/ask-your-soundprint"
    : publicProfileUserId
      ? withPublicDemoUserId("/dashboard/ask-your-soundprint", publicProfileUserId)
      : "/sign-in";

  const duetHref = isAuthenticated ? "/dashboard/duet/friends" : "/sign-up";

  return (
    <section
      id="interact"
      className={`mx-auto w-full max-w-7xl ${HOME_JOURNEY_SECTION_SCROLL_MT} px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8`}
    >
      <div className="mb-10 text-center lg:mb-12">
        <HomeBlurFadeReveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {t("eyebrow")}
          </p>
        </HomeBlurFadeReveal>
        <HomeTextReveal
          as="h2"
          onScroll
          className="mx-auto mt-3 block max-w-4xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl"
          text={t("title")}
          stagger={0.05}
        />
        <HomeBlurFadeReveal delay={0.1} className="mx-auto mt-4 max-w-2xl">
          <p className="text-base leading-7 text-muted sm:text-lg">{t("description")}</p>
        </HomeBlurFadeReveal>
      </div>

      <div className="space-y-14 sm:space-y-16">
        <div id="soundprint-ai-chat" className="scroll-mt-28">
          <HomeBlurFadeReveal>
            <p className="mb-6 text-center font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
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
            className="mx-auto max-w-6xl"
          />
        </div>

        <div id="duet" className="scroll-mt-28">
          <HomeBlurFadeReveal>
            <p className="mb-6 text-center font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              {tHome("duetPreview.sectionEyebrow")}
            </p>
          </HomeBlurFadeReveal>

          <HomeClipReveal className="relative z-10" delay={0.15}>
            <HomeDuetPreview />
          </HomeClipReveal>
        </div>

        <HomeBlurFadeReveal delay={0.12} className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={chatHref}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-7 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-95 sm:w-auto sm:min-w-[12rem]"
          >
            {t("ctaChat")}
            <ArrowRightIcon />
          </Link>
          <Link
            href={duetHref}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-surface px-7 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover sm:w-auto sm:min-w-[12rem]"
          >
            {t("ctaDuet")}
            <ArrowRightIcon />
          </Link>
        </HomeBlurFadeReveal>
      </div>
    </section>
  );
}
