"use client";

import { motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { useRef, type ReactNode } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const clipVariants: Variants = {
  hidden: {
    clipPath: "inset(100% 0 0 0 round 1.5rem)",
    opacity: 0.4,
    y: 32,
    scale: 0.97,
  },
  visible: {
    clipPath: "inset(0% 0 0 0 round 1.5rem)",
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.9,
      ease: EASE_OUT_EXPO,
    },
  },
};

type HomeClipRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
  /** Anime au chargement (hero above-the-fold) plutôt qu'au scroll */
  immediate?: boolean;
};

/**
 * Révélation par masque clip-path (wipe vertical).
 * Effet signature des sites Awwwards / Apple.
 */
export function HomeClipReveal({
  children,
  className = "",
  delay = 0,
  amount = 0.15,
  immediate = false,
}: HomeClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isInView = useInView(ref, {
    once: true,
    amount,
    margin: "0px 0px 100px 0px",
  });

  if (reducedMotion) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const visibleVariant = {
    ...clipVariants.visible,
    transition: {
      ...(clipVariants.visible as { transition: object }).transition,
      delay,
    },
  };

  return (
    <div ref={ref} className={className}>
      <motion.div
        initial="hidden"
        animate={immediate || isInView ? "visible" : "hidden"}
        variants={{
          hidden: clipVariants.hidden,
          visible: visibleVariant,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: (delay: number) => ({
    transition: {
      staggerChildren: 0.12,
      delayChildren: delay,
    },
  }),
};

const staggerItemVariants: Variants = {
  hidden: {
    clipPath: "inset(0 100% 0 0 round 0.75rem)",
    opacity: 0,
    x: -12,
  },
  visible: {
    clipPath: "inset(0 0% 0 0 round 0.75rem)",
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.65,
      ease: EASE_OUT_EXPO,
    },
  },
};

type HomeClipRevealStaggerProps = {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  delay?: number;
};

/**
 * Cascade horizontale clip-path — idéal pour listes de highlights.
 */
export function HomeClipRevealStagger({
  children,
  className = "",
  itemClassName = "",
  delay = 0,
}: HomeClipRevealStaggerProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <div className={className}>
        {children.map((child, i) => (
          <div key={i} className={itemClassName}>
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05, margin: "0px 0px 100px 0px" }}
      variants={staggerContainerVariants}
      custom={delay}
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={staggerItemVariants} className={itemClassName}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
