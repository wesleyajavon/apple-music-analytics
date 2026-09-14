"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import "lenis/dist/lenis.css";

/** Sticky header (~scroll-mt-28) — keep anchors readable under the nav. */
const ANCHOR_OFFSET_PX = -112;

type HomeSmoothScrollProps = {
  children: ReactNode;
};

/**
 * Lenis smooth scroll for the marketing home, synced to Motion's frame loop
 * so scroll-linked reveals stay in lockstep. Disabled when reduced motion is on.
 */
export function HomeSmoothScroll({ children }: HomeSmoothScrollProps) {
  const lenisRef = useRef<LenisRef>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    function update(data: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(data.timestamp);
    }

    frame.update(update, true);
    return () => cancelFrame(update);
  }, [reducedMotion]);

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        lerp: 0.085,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.05,
        anchors: {
          offset: ANCHOR_OFFSET_PX,
        },
      }}
    >
      {children}
    </ReactLenis>
  );
}
