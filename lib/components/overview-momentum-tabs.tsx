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
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";

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
          className={`${DASHBOARD_SEGMENTED_TRACK} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
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
                className={isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
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
