"use client";

import { useTranslations } from "next-intl";
import { HomeAskSoundprintPreview } from "@/lib/components/home-ask-soundprint-preview";
import { HomeDuetPreview } from "@/lib/components/home-duet-preview";
import { HomeBlurFadeReveal, HomeClipReveal, HomeTextReveal } from "@/lib/components/home-animations";
import { HOME_JOURNEY_SECTION_SCROLL_MT } from "@/lib/constants/home-journey-nav";

export function HomeJourneyInteractSection() {
  const t = useTranslations("home.journey.steps.interact");
  const tHome = useTranslations("home");

  return (
    <section
      id="interact"
      className={`mx-auto w-full max-w-7xl ${HOME_JOURNEY_SECTION_SCROLL_MT} px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8`}
    >
      <div className="mb-10 grid gap-8 text-center sm:gap-10 lg:mb-12 lg:grid-cols-2 lg:gap-12 lg:text-left">
        <div>
          <HomeBlurFadeReveal>
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
              {t("askLabel")}
            </p>
          </HomeBlurFadeReveal>
          <HomeTextReveal
            as="h2"
            onScroll
            className="mx-auto mt-3 block max-w-xl text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[2.05rem] sm:text-4xl sm:leading-[1.08] sm:tracking-[-0.055em] lg:mx-0 lg:text-[2.55rem]"
            text={t("askTitle")}
            stagger={0.05}
          />
          <HomeBlurFadeReveal delay={0.1} className="mx-auto mt-4 max-w-xl lg:mx-0">
            <p className="text-base leading-7 text-white/68 sm:text-lg sm:leading-8">{t("askDescription")}</p>
          </HomeBlurFadeReveal>
        </div>
        <div>
          <HomeBlurFadeReveal delay={0.06}>
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
              {t("duetLabel")}
            </p>
          </HomeBlurFadeReveal>
          <HomeTextReveal
            as="h2"
            onScroll
            className="mx-auto mt-3 block max-w-xl text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.045em] text-white min-[380px]:text-[2.05rem] sm:text-4xl sm:leading-[1.08] sm:tracking-[-0.055em] lg:mx-0 lg:text-[2.55rem]"
            text={t("duetTitle")}
            stagger={0.05}
          />
          <HomeBlurFadeReveal delay={0.16} className="mx-auto mt-4 max-w-xl lg:mx-0">
            <p className="text-base leading-7 text-white/68 sm:text-lg sm:leading-8">{t("duetDescription")}</p>
          </HomeBlurFadeReveal>
        </div>
      </div>

      <HomeClipReveal className="relative z-10" delay={0.12}>
        <div
          className="relative overflow-visible rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:rounded-[2.4rem] sm:p-6 lg:p-7"
          role="region"
          aria-label={t("stageLabel")}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] sm:rounded-[2.4rem]" aria-hidden>
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[rgb(152_80_208_/_0.28)] blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-cyan-400/16 blur-3xl" />
            <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 rounded-full bg-fuchsia-500/12 blur-3xl" />
          </div>

          <div className="relative mb-4 hidden items-end justify-between gap-4 lg:flex">
            <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
              {tHome("soundprintAiChatDemo.sectionEyebrow")}
            </p>
            <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
              {tHome("duetPreview.sectionEyebrow")}
            </p>
          </div>

          <div className="relative flex flex-col items-center lg:flex-row lg:items-stretch">
            <div
              id="soundprint-ai-chat"
              className="relative z-20 w-full max-w-[20.5rem] scroll-mt-28 lg:-mr-12 lg:w-[20.5rem] lg:shrink-0 lg:self-center xl:-mr-16"
            >
              <p className="mb-3 text-center font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/70 lg:hidden">
                {tHome("soundprintAiChatDemo.sectionEyebrow")}
              </p>
              <div className="lg:-rotate-2">
                <HomeAskSoundprintPreview />
              </div>
            </div>

            <div
              className="relative z-20 -my-1 flex items-center justify-center lg:hidden"
              aria-hidden
            >
              <span className="rounded-full border border-white/15 bg-[#080913] px-3 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/70 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)]">
                {t("connector")}
              </span>
            </div>

            <div id="duet" className="relative z-10 mt-2 w-full min-w-0 scroll-mt-28 lg:mt-0 lg:flex-1 lg:pl-6 xl:pl-8">
              <HomeDuetPreview />
            </div>
          </div>
        </div>
      </HomeClipReveal>
    </section>
  );
}
