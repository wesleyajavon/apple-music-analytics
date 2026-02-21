"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useScrollContainer } from "@/lib/contexts/scroll-container-context";

/**
 * Barre de progression de lecture fixée en haut de la page.
 * S'affiche en dégradé violet/indigo pendant le scroll.
 * Utilise le conteneur de scroll du layout si fourni via ScrollContainerProvider.
 */
export function ScrollProgressBar() {
  const containerRef = useScrollContainer();
  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef } : undefined
  );
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 origin-left bg-gray-200/50 dark:bg-gray-800/50">
      <motion.div
        className="h-full w-full origin-left rounded-r-full bg-gradient-to-r from-accent-violet via-accent-indigo to-accent-cyan"
        style={{ scaleX }}
      />
    </div>
  );
}
