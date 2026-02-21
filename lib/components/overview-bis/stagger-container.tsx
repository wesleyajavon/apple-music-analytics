"use client";

import { Children, cloneElement, isValidElement } from "react";
import { motion, type Variants } from "motion/react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 32,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Conteneur qui anime ses enfants en cascade (stagger) au scroll.
 */
export function StaggerContainer({ children, className = "" }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={containerVariants}
    >
      {Children.map(children, (child, i) =>
        isValidElement(child) ? (
          <motion.div key={child.key ?? i} variants={itemVariants}>
            {child}
          </motion.div>
        ) : (
          child
        )
      )}
    </motion.div>
  );
}
