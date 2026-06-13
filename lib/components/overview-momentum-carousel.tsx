"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

export type OverviewMomentumSlide = {
  id: string;
  label: string;
  content: ReactNode;
};

export type OverviewMomentumCarouselProps = {
  slides: OverviewMomentumSlide[];
};

const SLIDE_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.85,
};

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    x: direction > 0 ? 56 : -56,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -56 : 56,
    opacity: 0,
    scale: 0.985,
  }),
};

const REDUCED_MOTION_VARIANTS = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export function OverviewMomentumCarousel({ slides }: OverviewMomentumCarouselProps) {
  const t = useTranslations("overview.momentumCarousel");
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideCount = slides.length;

  useEffect(() => {
    if (activeIndex >= slideCount && slideCount > 0) {
      setActiveIndex(0);
      setDirection(0);
    }
  }, [activeIndex, slideCount]);

  const goTo = useCallback(
    (index: number) => {
      if (slideCount <= 1) return;
      const normalized = ((index % slideCount) + slideCount) % slideCount;
      if (normalized === activeIndex) return;

      let nextDirection = normalized > activeIndex ? 1 : -1;
      if (activeIndex === slideCount - 1 && normalized === 0) {
        nextDirection = 1;
      } else if (activeIndex === 0 && normalized === slideCount - 1) {
        nextDirection = -1;
      }

      setDirection(nextDirection);
      setActiveIndex(normalized);
    },
    [activeIndex, slideCount]
  );

  const goPrevious = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (slideCount <= 1) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious, slideCount]);

  if (slideCount === 0) return null;

  const activeSlide = slides[activeIndex];
  const variants = prefersReducedMotion ? REDUCED_MOTION_VARIANTS : SLIDE_VARIANTS;

  return (
    <div className="space-y-4">
      {slideCount > 1 ? (
        <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-2 shadow-sm backdrop-blur dark:border-white/[0.08] dark:bg-[#0a0c14]/90">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_40%),radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.06),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.10),transparent_38%)]"
            aria-hidden
          />
          <div className="relative flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={goPrevious}
              aria-label={t("previous")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-all hover:-translate-x-0.5 hover:border-accent-violet/30 hover:text-accent-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 dark:border-white/[0.10] dark:bg-[#141622] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:text-violet-100"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto px-1 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {slides.map((slide, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-current={isActive ? "true" : undefined}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 sm:px-4 sm:text-sm ${
                      isActive
                        ? "border-accent-violet/25 bg-accent-violet/10 text-accent-violet shadow-sm dark:border-violet-400/25 dark:bg-violet-500/15 dark:text-violet-100"
                        : "border-transparent text-slate-500 hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                    }`}
                  >
                    {slide.label}
                  </button>
                );
              })}
            </div>

            <span className="hidden shrink-0 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 sm:inline-flex sm:min-w-[3.25rem] sm:justify-center">
              {t("slideCounter", { current: activeIndex + 1, total: slideCount })}
            </span>

            <button
              type="button"
              onClick={goNext}
              aria-label={t("next")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition-all hover:translate-x-0.5 hover:border-accent-violet/30 hover:text-accent-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 dark:border-white/[0.10] dark:bg-[#141622] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:text-violet-100"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[280px] overflow-hidden sm:min-h-[320px]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={activeSlide.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={prefersReducedMotion ? { duration: 0.15 } : SLIDE_TRANSITION}
            className="w-full min-w-0"
          >
            {activeSlide.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
