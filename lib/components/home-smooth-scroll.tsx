"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "lenis/dist/lenis.css";

/** Sticky header (~scroll-mt-28) — keep anchors readable under the nav. */
const ANCHOR_OFFSET_PX = -112;

type HomeSmoothScrollProps = {
  children: ReactNode;
};

/**
 * Lenis smooth scroll for the marketing home, synced to Motion's frame loop
 * so scroll-linked reveals stay in lockstep. Disabled when reduced motion is on.
 * Activation is deferred until after first paint to protect mobile LCP.
 */
export function HomeSmoothScroll({ children }: HomeSmoothScrollProps) {
  const lenisRef = useRef<LenisRef>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const activate = () => {
      if (!cancelled) setEnabled(true);
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(activate, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(activate, 400);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function update(data: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(data.timestamp);
    }

    frame.update(update, true);
    return () => cancelFrame(update);
  }, [enabled]);

  if (!enabled) {
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
