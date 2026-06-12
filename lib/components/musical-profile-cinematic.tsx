"use client";

import { Children, isValidElement, useMemo } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

export const CINEMATIC_EASE = [0.22, 1, 0.36, 1] as const;

const FILM_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export function useCinematicMotion() {
  const reduced = useReducedMotion();
  return useMemo(
    () => ({
      enabled: !reduced,
      ease: CINEMATIC_EASE,
    }),
    [reduced]
  );
}

/** Grain cinématique — texture organique sur les héros sombres */
export function CinematicFilmGrain({ className = "" }: { className?: string }) {
  const { enabled } = useCinematicMotion();

  return (
    <motion.div
      className={`pointer-events-none absolute inset-0 z-[2] mix-blend-overlay ${className}`}
      style={{ backgroundImage: FILM_GRAIN_SVG, backgroundSize: "128px 128px" }}
      initial={{ opacity: enabled ? 0 : 0.08 }}
      animate={enabled ? { opacity: [0.06, 0.12, 0.08] } : { opacity: 0.08 }}
      transition={{ duration: 8, repeat: enabled ? Infinity : 0, ease: "easeInOut" }}
      aria-hidden
    />
  );
}

/** Balayage lumineux diagonal — effet cinématique très visible */
export function CinematicLightSweep({ className = "" }: { className?: string }) {
  const { enabled } = useCinematicMotion();

  return (
    <div className={`pointer-events-none absolute inset-0 z-[3] overflow-hidden ${className}`} aria-hidden>
      <motion.div
        className="absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        animate={enabled ? { x: ["-100%", "320%"] } : undefined}
        transition={
          enabled
            ? { duration: 4.5, repeat: Infinity, repeatDelay: 5, ease: [0.22, 1, 0.36, 1] }
            : undefined
        }
        style={enabled ? undefined : { transform: "translateX(120%)" }}
      />
    </div>
  );
}

/** Orbes flottants — profondeur ambiante type mesh gradient animé */
export function CinematicFloatingOrbs() {
  const { enabled } = useCinematicMotion();

  return (
    <>
      <motion.div
        className="pointer-events-none absolute -left-16 top-8 h-56 w-56 rounded-full bg-accent-violet/40 blur-3xl"
        animate={enabled ? { x: [0, 28, -12, 0], y: [0, -22, 16, 0], scale: [1, 1.12, 0.94, 1] } : undefined}
        transition={{ duration: 12, repeat: enabled ? Infinity : 0, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-10 bottom-6 h-64 w-64 rounded-full bg-accent-cyan/35 blur-3xl"
        animate={enabled ? { x: [0, -24, 18, 0], y: [0, 18, -14, 0], scale: [1, 0.92, 1.08, 1] } : undefined}
        transition={{ duration: 14, repeat: enabled ? Infinity : 0, ease: "easeInOut", delay: 1.2 }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-accent-indigo/30 blur-3xl"
        animate={enabled ? { y: [0, -28, 12, 0], opacity: [0.55, 0.95, 0.6, 0.55] } : undefined}
        transition={{ duration: 10, repeat: enabled ? Infinity : 0, ease: "easeInOut", delay: 0.6 }}
        aria-hidden
      />
    </>
  );
}

const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: delay,
    },
  }),
};

const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
    filter: "blur(14px)",
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: 0.85,
      ease: CINEMATIC_EASE,
    },
  },
};

interface CinematicStaggerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}

/** Cascade d'apparition — storytelling fluide section par section */
export function CinematicStagger({
  children,
  className = "",
  delay = 0,
  inView = false,
}: CinematicStaggerProps) {
  const { enabled } = useCinematicMotion();

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      custom={delay}
      initial="hidden"
      animate={inView ? undefined : "visible"}
      whileInView={inView ? "visible" : undefined}
      viewport={inView ? { once: true, amount: 0.08, margin: "0px 0px -60px 0px" } : undefined}
      variants={staggerContainerVariants}
    >
      {Children.map(children, (child, index) =>
        isValidElement(child) ? (
          <motion.div key={child.key ?? index} variants={staggerItemVariants}>
            {child}
          </motion.div>
        ) : (
          child
        )
      )}
    </motion.div>
  );
}

/** Révélation d'un seul bloc (titre, carte, citation) */
export function CinematicReveal({
  children,
  className = "",
  delay = 0,
  inView = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}) {
  const { enabled } = useCinematicMotion();

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 48, filter: "blur(16px)", scale: 0.96 }}
      animate={inView ? undefined : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
      whileInView={inView ? { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 } : undefined}
      viewport={inView ? { once: true, amount: 0.08, margin: "0px 0px -80px 0px" } : undefined}
      transition={{ duration: 0.9, delay, ease: CINEMATIC_EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Titre mot par mot — effet cinématique type trailer */
export function CinematicWordReveal({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const { enabled } = useCinematicMotion();
  const words = text.split(/\s+/).filter(Boolean);

  if (!enabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className} aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="inline-block"
          initial={{ opacity: 0, y: "0.85em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.7,
            delay: delay + index * 0.11,
            ease: CINEMATIC_EASE,
          }}
          aria-hidden
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : null}
        </motion.span>
      ))}
    </span>
  );
}

/** Barre de progression animée au scroll — genre mix, métriques visuelles */
export function CinematicProgressBar({
  percentage,
  className = "",
  trackClassName = "h-2 overflow-hidden rounded-full bg-white/10",
  delay = 0,
}: {
  percentage: number;
  className?: string;
  trackClassName?: string;
  delay?: number;
}) {
  const { enabled } = useCinematicMotion();
  const width = `${Math.min(100, Math.max(4, percentage))}%`;

  if (!enabled) {
    return (
      <div className={trackClassName}>
        <div
          className={`h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-cyan ${className}`}
          style={{ width }}
        />
      </div>
    );
  }

  return (
    <div className={trackClassName}>
      <motion.div
        className={`h-full origin-left rounded-full bg-gradient-to-r from-accent-violet to-accent-cyan ${className}`}
        initial={{ scaleX: 0, opacity: 0.4 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9, delay, ease: CINEMATIC_EASE }}
        style={{ width }}
      />
    </div>
  );
}

/** Léger flottement — avatar, cartes signature */
export function CinematicFloat({
  children,
  className = "",
  intensity = "normal",
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: "subtle" | "normal";
}) {
  const { enabled } = useCinematicMotion();
  const yRange = intensity === "subtle" ? [-8, 8] : [-14, 14];

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [0, yRange[0], yRange[1], 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Citation IA — apparition douce quand le texte arrive */
export function CinematicQuote({
  children,
  className = "",
  quoteKey,
}: {
  children: React.ReactNode;
  className?: string;
  quoteKey?: string;
}) {
  const { enabled } = useCinematicMotion();

  if (!enabled) {
    return <blockquote className={className}>{children}</blockquote>;
  }

  return (
    <motion.blockquote
      key={quoteKey}
      className={className}
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.85, ease: CINEMATIC_EASE }}
    >
      {children}
    </motion.blockquote>
  );
}
