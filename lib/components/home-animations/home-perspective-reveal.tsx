"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

type HomePerspectiveRevealProps = {
  children: ReactNode;
  className?: string;
  /** Direction de rotation 3D (alternance gauche/droite) */
  direction?: "left" | "right";
};

/**
 * Carte 3D qui pivote en perspective au scroll.
 * L'entrée (opacity/scale) utilise whileInView pour garantir la visibilité.
 */
export function HomePerspectiveReveal({
  children,
  className = "",
  direction = "left",
}: HomePerspectiveRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const rotateY = useTransform(
    scrollYProgress,
    [0, 1],
    [direction === "left" ? 12 : -12, 0],
  );
  const rotateX = useTransform(scrollYProgress, [0, 1], [6, 0]);

  if (reducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: 1200 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.05, margin: "0px 0px 100px 0px" }}
        transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
        style={{
          rotateY,
          rotateX,
          transformStyle: "preserve-3d",
        }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

type HomeBlurFadeRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  immediate?: boolean;
};

const directionOffset = {
  up: { x: 0, y: 40 },
  down: { x: 0, y: -40 },
  left: { x: 40, y: 0 },
  right: { x: -40, y: 0 },
} as const;

/**
 * Fade + blur + slide — révélation douce pour blocs de contenu.
 */
export function HomeBlurFadeReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  immediate = false,
}: HomeBlurFadeRevealProps) {
  const reducedMotion = useReducedMotion();
  const offset = directionOffset[direction];

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const animateTo = {
    opacity: 1,
    x: 0,
    y: 0,
    filter: "blur(0px)",
  };

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        x: offset.x,
        y: offset.y,
        filter: "blur(16px)",
      }}
      {...(immediate
        ? { animate: animateTo }
        : {
            whileInView: animateTo,
            viewport: { once: true, amount: 0.05, margin: "0px 0px 100px 0px" },
          })}
      transition={{
        duration: 0.75,
        ease: EASE_OUT_EXPO,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
