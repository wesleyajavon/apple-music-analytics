"use client";

import { Link } from "@/i18n/navigation";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";

type HomeMagneticLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
  /** Pull strength toward the cursor (0–1). Default 0.32 */
  strength?: number;
  /** Max pixel travel from center. Default 14 */
  maxDistance?: number;
};

/**
 * CTA that gently follows the cursor on fine-pointer devices.
 * Falls back to a plain Link on touch / reduced motion.
 */
export function HomeMagneticLink({
  children,
  className = "",
  strength = 0.32,
  maxDistance = 14,
  ...props
}: HomeMagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reducedMotion = useReducedMotion();
  const [magnetic, setMagnetic] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.55 });
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.55 });

  useEffect(() => {
    if (reducedMotion) {
      setMagnetic(false);
      return;
    }

    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setMagnetic(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [reducedMotion]);

  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const onMouseMove = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      const node = ref.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const offsetX = event.clientX - (rect.left + rect.width / 2);
      const offsetY = event.clientY - (rect.top + rect.height / 2);

      x.set(Math.max(-maxDistance, Math.min(maxDistance, offsetX * strength)));
      y.set(Math.max(-maxDistance, Math.min(maxDistance, offsetY * strength)));
    },
    [maxDistance, strength, x, y],
  );

  if (!magnetic) {
    return (
      <Link ref={ref} className={className} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <motion.span
      className="inline-flex w-full sm:w-auto"
      style={{ x: springX, y: springY }}
    >
      <Link
        ref={ref}
        className={className}
        onMouseMove={onMouseMove}
        onMouseLeave={reset}
        {...props}
      >
        {children}
      </Link>
    </motion.span>
  );
}
