"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const containerVariants: Variants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger,
      delayChildren: 0.05,
    },
  }),
};

const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: "1.1em",
    filter: "blur(12px)",
    rotateX: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    rotateX: 0,
    transition: {
      duration: 0.75,
      ease: EASE_OUT_EXPO,
    },
  },
};

type HomeTextRevealProps = {
  text: string;
  className?: string;
  /** Délai entre chaque mot (secondes) */
  stagger?: number;
  /** Déclencher au scroll plutôt qu'au chargement */
  onScroll?: boolean;
  as?: "h1" | "h2" | "h3" | "p" | "span";
};

/**
 * Révélation mot par mot avec blur + slide 3D.
 * Style Linear / Vercel — très tendance 2025-2026.
 */
export function HomeTextReveal({
  text,
  className = "",
  stagger = 0.06,
  onScroll = false,
  as: Tag = "span",
}: HomeTextRevealProps) {
  const reducedMotion = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  if (reducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  const MotionTag = motion[Tag] as typeof motion.span;
  const displayClass = Tag === "span" ? "inline" : "block";

  return (
    <MotionTag
      className={[displayClass, className].filter(Boolean).join(" ")}
      initial="hidden"
      {...(onScroll
        ? { whileInView: "visible", viewport: { once: true, amount: 0.6 } }
        : { animate: "visible" })}
      variants={containerVariants}
      custom={stagger}
      style={{ perspective: 800 }}
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <motion.span
            className="inline-block origin-bottom will-change-transform"
            variants={wordVariants}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

type HomeTextRevealLinesProps = {
  lines: React.ReactNode[];
  className?: string;
  onScroll?: boolean;
  as?: "div" | "h1" | "h2";
};

/**
 * Révèle plusieurs lignes/blocs en cascade (ex. titre + gradient).
 */
export function HomeTextRevealLines({
  lines,
  className = "",
  onScroll = false,
  as: Tag = "div",
}: HomeTextRevealLinesProps) {
  const reducedMotion = useReducedMotion();

  const lineVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 36,
      filter: "blur(14px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.8,
        ease: EASE_OUT_EXPO,
      },
    },
  };

  if (reducedMotion) {
    return (
      <Tag className={`w-full min-w-0 ${className}`}>
        {lines.map((line, i) => (
          <div key={i} className="min-w-0 max-w-full break-words">
            {line}
          </div>
        ))}
      </Tag>
    );
  }

  const MotionTag = motion[Tag] as typeof motion.div;

  return (
    <MotionTag
      className={`w-full min-w-0 ${className}`}
      initial="hidden"
      {...(onScroll
        ? { whileInView: "visible", viewport: { once: true, amount: 0.35 } }
        : { animate: "visible" })}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.14, delayChildren: 0.08 },
        },
      }}
    >
      {lines.map((line, index) => (
        <motion.div
          key={index}
          variants={lineVariants}
          className="block w-full min-w-0 max-w-full break-words pb-[0.08em]"
        >
          {line}
        </motion.div>
      ))}
    </MotionTag>
  );
}
