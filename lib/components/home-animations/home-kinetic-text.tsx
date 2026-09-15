"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const SCRAMBLE_GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&";

const letterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: "0.55em",
    rotateX: 55,
    filter: "blur(10px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.55,
      ease: EASE_OUT_EXPO,
    },
  },
};

type HomeKineticTextProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  /** Trigger when scrolled into view instead of on mount */
  onScroll?: boolean;
  /** Random glyph scramble before each letter settles */
  scramble?: boolean;
  /** Delay between letters (seconds) */
  stagger?: number;
  /** Extra start delay (seconds) */
  delay?: number;
};

type KineticToken =
  | { type: "word"; chars: string[]; key: string }
  | { type: "space"; key: string };

/**
 * Split on whitespace only so animated inline-block letters cannot wrap
 * mid-word (e.g. "S" / "potify").
 */
function tokenize(text: string): KineticToken[] {
  const tokens: KineticToken[] = [];
  const parts = text.split(/(\s+)/);

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;

    if (/^\s+$/.test(part)) {
      tokens.push({ type: "space", key: `space-${i}` });
      continue;
    }

    tokens.push({
      type: "word",
      chars: Array.from(part),
      key: `word-${i}-${part}`,
    });
  }

  return tokens;
}

function ScrambleLetter({
  char,
  delayMs,
  active,
}: {
  char: string;
  delayMs: number;
  active: boolean;
}) {
  const [display, setDisplay] = useState(char);
  const [settled, setSettled] = useState(!active);

  useEffect(() => {
    if (!active) {
      setDisplay(char);
      setSettled(true);
      return;
    }

    let frame = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const startTimeout = setTimeout(() => {
      intervalId = setInterval(() => {
        frame += 1;
        if (frame >= 6) {
          setDisplay(char);
          setSettled(true);
          if (intervalId) clearInterval(intervalId);
          return;
        }
        const glyph =
          SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)] ??
          char;
        setDisplay(glyph);
      }, 28);
    }, delayMs);

    return () => {
      clearTimeout(startTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [active, char, delayMs]);

  return (
    <span
      className={
        settled
          ? "inline-block"
          : "inline-block text-white/55 tabular-nums"
      }
    >
      {display}
    </span>
  );
}

/**
 * Kinetic typography: per-letter 3D reveal (+ optional decode scramble).
 * Keeps a screen-reader-friendly full string alongside the animated glyphs.
 */
export function HomeKineticText({
  text,
  className = "",
  as: Tag = "span",
  onScroll = false,
  scramble = true,
  stagger = 0.028,
  delay = 0,
}: HomeKineticTextProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, {
    once: true,
    amount: 0.45,
    margin: "0px 0px -8% 0px",
  });
  const tokens = useMemo(() => tokenize(text), [text]);
  const shouldAnimate = !reducedMotion && (!onScroll || isInView);

  if (reducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  const MotionTag = motion[Tag] as typeof motion.span;
  let letterIndex = 0;

  return (
    <MotionTag
      ref={ref as never}
      className={className}
      initial="hidden"
      animate={shouldAnimate ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      style={{ perspective: 900 }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline">
        {tokens.map((token) => {
          if (token.type === "space") {
            return (
              <span key={token.key} className="inline-block w-[0.28em]">
                {"\u00A0"}
              </span>
            );
          }

          return (
            <span
              key={token.key}
              className="inline-block whitespace-nowrap"
            >
              {token.chars.map((char, charOffset) => {
                const index = letterIndex;
                letterIndex += 1;
                const scrambleDelayMs = Math.round(
                  (delay + index * stagger) * 1000
                );

                return (
                  <span
                    key={`${token.key}-${charOffset}-${char}`}
                    className="inline-block overflow-hidden pb-[0.12em] align-bottom"
                  >
                    <motion.span
                      className="inline-block origin-bottom will-change-transform"
                      variants={letterVariants}
                    >
                      {scramble ? (
                        <ScrambleLetter
                          char={char}
                          delayMs={scrambleDelayMs}
                          active={shouldAnimate}
                        />
                      ) : (
                        char
                      )}
                    </motion.span>
                  </span>
                );
              })}
            </span>
          );
        })}
      </span>
    </MotionTag>
  );
}
