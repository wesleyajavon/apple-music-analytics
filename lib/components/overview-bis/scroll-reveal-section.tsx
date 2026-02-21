"use client";

import { motion, type Variants } from "motion/react";

const defaultVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 48,
    filter: "blur(12px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

interface ScrollRevealSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Délai avant que l'animation ne se déclenche (viewport offset, 0-1) */
  amount?: number;
}

/**
 * Section qui se révèle au scroll avec effet fade-in + slide-up + blur.
 * Crée une expérience de storytelling fluide.
 */
export function ScrollRevealSection({
  children,
  className = "",
  amount = 0.15,
}: ScrollRevealSectionProps) {
  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={defaultVariants}
    >
      {children}
    </motion.section>
  );
}
