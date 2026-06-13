type LiveStatusDotTone = "emerald" | "amber" | "cyan" | "pink";

type LiveStatusDotSize = "sm" | "md";

const TONE_CLASS: Record<
  LiveStatusDotTone,
  { ring: string; ping: string; dot: string }
> = {
  emerald: {
    ring: "bg-emerald-500/15 ring-emerald-400/35",
    ping: "bg-emerald-400/80",
    dot: "bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153_/0.95)]",
  },
  amber: {
    ring: "bg-amber-500/15 ring-amber-400/35",
    ping: "bg-amber-400/80",
    dot: "bg-amber-400 shadow-[0_0_10px_rgb(251_191_36_/0.95)]",
  },
  cyan: {
    ring: "bg-cyan-500/15 ring-cyan-400/35",
    ping: "bg-cyan-400/80",
    dot: "bg-cyan-400 shadow-[0_0_10px_rgb(34_211_238_/0.95)]",
  },
  pink: {
    ring: "bg-pink-500/15 ring-pink-400/35",
    ping: "bg-pink-400/80",
    dot: "bg-pink-400 shadow-[0_0_10px_rgb(244_114_182_/0.95)]",
  },
};

/**
 * Pulsing status dot — matches the live indicator on the public demo CTA.
 */
export function LiveStatusDot({
  tone = "emerald",
  size = "sm",
  className = "",
}: {
  tone?: LiveStatusDotTone;
  size?: LiveStatusDotSize;
  className?: string;
}) {
  const colors = TONE_CLASS[tone];

  if (size === "md") {
    return (
      <span
        className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ${colors.ring} ${className}`}
        aria-hidden
      >
        <span className={`absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full ${colors.ping}`} />
        <span className={`relative h-2 w-2 rounded-full ${colors.dot}`} />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex h-3 w-3 shrink-0 items-center justify-center ${className}`}
      aria-hidden
    >
      <span className={`absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full ${colors.ping}`} />
      <span className={`relative h-2 w-2 rounded-full ${colors.dot}`} />
    </span>
  );
}
