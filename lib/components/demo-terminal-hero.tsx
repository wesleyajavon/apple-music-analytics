"use client";

import { motion, type Variants } from "motion/react";
import type { ComponentProps } from "react";

type DemoTerminalFeature = {
  label: string;
  supportingText: string;
};

type DemoTerminalHeroProps = {
  videoSrc?: string;
  videoPoster?: string;
  videoLabel?: string;
  eyebrow?: string;
  subtitle?: string;
  badge?: string;
  features?: readonly DemoTerminalFeature[];
  showFeaturesOnMobile?: boolean;
} & Omit<
  ComponentProps<typeof motion.section>,
  "children" | "variants" | "initial" | "whileInView" | "viewport"
>;

const defaultFeatures: readonly DemoTerminalFeature[] = [
  {
    label: "Live analytics",
    supportingText: "Behavior, trends, and context in one place",
  },
  {
    label: "Guided insights",
    supportingText: "AI summaries tuned for product clarity",
  },
  {
    label: "Fast exports",
    supportingText: "Share polished views without extra tooling",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function DemoTerminalHero({
  videoSrc = "/media/demo.mp4",
  videoPoster,
  videoLabel = "Recorded product walkthrough",
  eyebrow = "Recorded walkthrough",
  subtitle = "Single-app overview",
  badge = "Desktop demo",
  features = defaultFeatures,
  showFeaturesOnMobile = true,
  className,
  ...props
}: DemoTerminalHeroProps) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
      className={cx("relative mx-auto w-full max-w-6xl", className)}
      {...props}
    >
      <motion.div
        aria-hidden
        className="absolute -inset-8 hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.28),rgba(139,92,246,0.18)_32%,transparent_68%)] blur-3xl md:block"
        animate={{
          opacity: [0.46, 0.78, 0.46],
          scale: [0.98, 1.03, 0.98],
        }}
        transition={{
          duration: 7,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02)_34%,rgba(34,211,238,0.08)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />

        <motion.header
          variants={itemVariants}
          className="relative flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex shrink-0 items-center gap-2" aria-hidden>
              <span className="h-3 w-3 rounded-full bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.75)]" />
              <span className="h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.65)]" />
              <span className="h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.65)]" />
            </div>

            <div className="min-w-0">
              <p className="truncate font-mono text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-white/80">
                {eyebrow}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
                {subtitle}
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            {badge}
          </span>
        </motion.header>

        <motion.div variants={itemVariants} className="relative p-3 sm:p-5 lg:p-6">
          <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/55 p-2 shadow-2xl shadow-cyan-950/20"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.16),transparent_42%)] opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            />

            <div className="relative overflow-hidden rounded-2xl bg-slate-950">
              <video
                aria-label={videoLabel}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster={videoPoster}
                className="aspect-video w-full rounded-2xl object-cover ring-1 ring-white/10"
              >
                <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className={cx(
            "relative grid-cols-1 border-t border-white/10 sm:grid-cols-3",
            showFeaturesOnMobile ? "grid" : "hidden md:grid",
          )}
        >
          {features.map((feature, index) => (
            <div
              key={`${feature.label}-${index}`}
              className="border-t border-white/10 px-5 py-5 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0 lg:px-6"
            >
              <p className="text-sm font-semibold tracking-[-0.01em] text-white">
                {feature.label}
              </p>
              <p className="mt-2 font-mono text-[0.66rem] font-medium uppercase leading-5 tracking-[0.22em] text-slate-500">
                {feature.supportingText}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
