"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

function ParallaxBlob({
  className,
  scrollYProgress,
  range,
}: {
  className: string;
  scrollYProgress: MotionValue<number>;
  range: [number, number];
}) {
  const reducedMotion = useReducedMotion();
  const y = useTransform(scrollYProgress, [0, 1], range);

  if (reducedMotion) {
    return <div className={className} aria-hidden />;
  }

  return <motion.div style={{ y }} className={className} aria-hidden />;
}

type HomeDashboardPreviewsParallaxProps = {
  children: ReactNode;
};

export function HomeDashboardPreviewsParallax({
  children,
}: HomeDashboardPreviewsParallaxProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  return (
    <div ref={sectionRef} className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgb(152_80_208_/_0.12),transparent_55%)]" />

        <ParallaxBlob
          scrollYProgress={scrollYProgress}
          range={[80, -120]}
          className="absolute -left-32 top-32 h-72 w-72 rounded-full bg-accent-rose/20 blur-3xl sm:-left-24"
        />
        <ParallaxBlob
          scrollYProgress={scrollYProgress}
          range={[-40, 100]}
          className="absolute -right-32 top-[42%] h-80 w-80 rounded-full bg-accent-cyan/18 blur-3xl sm:-right-20"
        />
        <ParallaxBlob
          scrollYProgress={scrollYProgress}
          range={[60, -90]}
          className="absolute bottom-8 left-[38%] h-64 w-64 rounded-full bg-accent-violet/16 blur-3xl"
        />
      </div>

      {children}
    </div>
  );
}
