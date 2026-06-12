"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

interface ParallaxHeroProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Hero avec effet parallax : les couches de fond bougent à des vitesses différentes.
 * Crée une illusion de profondeur pendant le scroll.
 */
export function ParallaxHero({ children, className = "" }: ParallaxHeroProps) {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "38%"]);
  const midY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-6%"]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.25]);
  const scale = useTransform(scrollYProgress, [0, 0.6], [1, 0.96]);

  if (prefersReducedMotion) {
    return (
      <section ref={ref} className={`relative overflow-hidden rounded-2xl ${className}`}>
        <div className="relative z-10">{children}</div>
      </section>
    );
  }

  return (
    <motion.section
      ref={ref}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ scale }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-4 rounded-2xl"
        style={{ y: backgroundY }}
      >
        <div
          className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent-violet/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-accent-indigo/15 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-accent-cyan/10 blur-3xl"
          aria-hidden
        />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ y: midY, opacity: glowOpacity }}
      >
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.1) 40%, transparent 70%)",
          }}
        />
      </motion.div>

      <motion.div className="relative z-10" style={{ y: contentY }}>
        {children}
      </motion.div>
    </motion.section>
  );
}
