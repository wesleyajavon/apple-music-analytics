"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

export type OverviewMomentumSlide = {
  id: string;
  label: string;
  content: ReactNode;
};

export type OverviewMomentumTabsProps = {
  slides: OverviewMomentumSlide[];
};

const PANEL_TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.85,
};

export function OverviewMomentumTabs({ slides }: OverviewMomentumTabsProps) {
  const t = useTranslations("overview.momentumTabs");
  const prefersReducedMotion = useReducedMotion();
  const baseId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  const slideCount = slides.length;

  useEffect(() => {
    if (activeIndex >= slideCount && slideCount > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, slideCount]);

  const goTo = useCallback(
    (index: number) => {
      if (slideCount <= 1) return;
      const normalized = ((index % slideCount) + slideCount) % slideCount;
      setActiveIndex(normalized);
    },
    [slideCount]
  );

  const onTabListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (slideCount <= 1) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goTo(activeIndex + 1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        goTo(activeIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(slideCount - 1);
      }
    },
    [activeIndex, goTo, slideCount]
  );

  if (slideCount === 0) return null;

  const activeSlide = slides[activeIndex];

  return (
    <div className="space-y-4">
      {slideCount > 1 ? (
        <div
          role="tablist"
          aria-label={t("navLabel")}
          onKeyDown={onTabListKeyDown}
          className="flex gap-2 overflow-x-auto rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-2 shadow-sm backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] dark:border-white/[0.08] dark:bg-[#0a0c14]/90 [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${slide.id}`}
                aria-selected={isActive}
                aria-controls={`${baseId}-panel-${slide.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => goTo(index)}
                className={`min-h-11 shrink-0 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 sm:px-4 ${
                  isActive
                    ? "border-accent-violet/25 bg-accent-violet/10 text-accent-violet dark:border-violet-400/25 dark:bg-violet-500/15 dark:text-violet-100"
                    : "border-transparent text-slate-500 hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
                }`}
              >
                {slide.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeSlide.id}`}
        aria-labelledby={`${baseId}-tab-${activeSlide.id}`}
        className="relative min-h-[280px] overflow-hidden sm:min-h-[320px]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeSlide.id}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : PANEL_TRANSITION}
            className="w-full min-w-0"
          >
            {activeSlide.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
