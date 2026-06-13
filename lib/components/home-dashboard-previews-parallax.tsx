"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

type ParallaxCardProps = {
  children: ReactNode;
  index: number;
  className?: string;
};

function ParallaxCard({ children, index, className = "" }: ParallaxCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const direction = index % 2 === 0 ? 1 : -1;
  const depth = 28 + (index % 3) * 16;
  const y = useTransform(scrollYProgress, [0, 1], [depth, -depth]);
  const x = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [direction * 14, 0, direction * -10],
  );
  const rotate = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [direction * 1.8, 0, direction * -1.2],
  );
  const scale = useTransform(scrollYProgress, [0, 0.42, 1], [0.93, 1, 0.97]);

  if (reducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      style={{ y, x, rotate, scale }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

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
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const headlineY = useTransform(scrollYProgress, [0, 1], [40, -24]);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.72, 1, 1, 0.82]);

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

      {reducedMotion ? (
        children
      ) : (
        <motion.div style={{ y: headlineY, opacity: headlineOpacity }}>
          {children}
        </motion.div>
      )}
    </div>
  );
}

type HomeDashboardPreviewsParallaxGridProps = {
  items: ReactNode[];
};

export function HomeDashboardPreviewsParallaxGrid({
  items,
}: HomeDashboardPreviewsParallaxGridProps) {
  const layoutClasses = [
    "lg:mt-0",
    "lg:mt-20",
    "lg:-mt-6",
    "lg:mt-14",
    "lg:col-span-2 lg:mt-10",
  ];

  return (
    <div className="relative grid gap-8 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-6 xl:gap-x-14">
      {items.map((item, index) => (
        <ParallaxCard
          key={index}
          index={index}
          className={layoutClasses[index] ?? ""}
        >
          {item}
        </ParallaxCard>
      ))}
    </div>
  );
}
