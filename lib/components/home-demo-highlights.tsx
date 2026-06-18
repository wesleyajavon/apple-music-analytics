"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { HomeAutoplayVideo } from "@/lib/components/home-autoplay-video";
import {
  HomeBlurFadeReveal,
  HomePerspectiveReveal,
  HomeTextReveal,
} from "@/lib/components/home-animations";

export function HomeDemoHighlights() {
  const t = useTranslations("home");

  const highlights = useMemo(
    () =>
      [
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
      ] as const,
    [t],
  );

  return (
    <div id="demo" className="mx-auto w-full max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 hidden text-center md:block">
        <HomeBlurFadeReveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {t("demoHighlightsSection.eyebrow")}
          </p>
        </HomeBlurFadeReveal>
        <HomeTextReveal
          as="h3"
          onScroll
          className="mx-auto mt-3 block max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl"
          text={t("demoHighlightsSection.title")}
          stagger={0.05}
        />
      </div>

      <div className="hidden w-full gap-6 md:grid">
        {highlights.map((highlight) => (
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
              <HomeAutoplayVideo src={highlight.videoSrc} label={highlight.videoLabel} />
            </div>

            <HomePerspectiveReveal
              direction={highlight.reverse ? "right" : "left"}
              className={highlight.reverse ? "lg:order-1" : undefined}
            >
              <HomeBlurFadeReveal
                delay={0.12}
                direction={highlight.reverse ? "right" : "left"}
              >
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  {highlight.eyebrow}
                </p>
                <h4 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {highlight.title}
                </h4>
                <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
                  {highlight.description}
                </p>
                <p className="mt-5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  {highlight.metric}
                </p>
              </HomeBlurFadeReveal>
            </HomePerspectiveReveal>
          </section>
        ))}
      </div>
    </div>
  );
}
