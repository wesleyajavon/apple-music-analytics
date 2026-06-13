import { SoundprintLogo } from "@/lib/components/soundprint-logo";

type SoundprintBrandDividerProps = {
  orientation?: "horizontal" | "vertical";
  tone?: "default" | "onDark";
  lineStyle?: "solid" | "gradient" | "fade";
  maxWidth?: "full" | "medium" | "narrow";
  showLogo?: boolean;
  className?: string;
  logoSize?: "sm" | "md" | "lg" | "xl" | "2xl";
};

const LINE_STYLE: Record<
  NonNullable<SoundprintBrandDividerProps["lineStyle"]>,
  Record<NonNullable<SoundprintBrandDividerProps["tone"]>, string>
> = {
  solid: {
    default: "bg-card-border",
    onDark: "bg-white/10",
  },
  gradient: {
    default: "bg-gradient-to-r from-transparent via-primary/40 to-transparent",
    onDark: "bg-gradient-to-r from-transparent via-white/30 to-transparent",
  },
  fade: {
    default: "bg-gradient-to-r from-transparent via-card-border to-transparent",
    onDark: "bg-gradient-to-r from-transparent via-white/12 to-transparent",
  },
};

const LOGO_SIZE = {
  sm: "h-6 w-6 object-contain",
  md: "h-8 w-8 object-contain",
  lg: "h-12 w-12 object-contain sm:h-14 sm:w-14",
  xl: "h-16 w-16 object-contain sm:h-20 sm:w-20",
  "2xl": "h-24 w-24 object-contain sm:h-28 sm:w-28",
} as const;

const MAX_WIDTH = {
  full: "",
  medium: "mx-auto max-w-4xl",
  narrow: "mx-auto max-w-2xl",
} as const;

const GAP = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-5",
  xl: "gap-4 sm:gap-6",
  "2xl": "gap-5 sm:gap-8",
} as const;

/**
 * Decorative divider with the Soundprint favicon centered between line segments —
 * horizontal for landing sections, vertical on the auth split layout.
 */
export function SoundprintBrandDivider({
  orientation = "horizontal",
  tone = "default",
  lineStyle = "solid",
  maxWidth = "full",
  showLogo = true,
  className = "",
  logoSize = "md",
}: SoundprintBrandDividerProps) {
  const lineClass = LINE_STYLE[lineStyle][tone];
  const widthClass = MAX_WIDTH[maxWidth];
  const gapClass = GAP[logoSize];

  const logo = showLogo ? (
    <SoundprintLogo
      src="/brand/favicon.png"
      showText={false}
      className="shrink-0"
      imageClassName={LOGO_SIZE[logoSize]}
    />
  ) : null;

  if (orientation === "vertical") {
    return (
      <div className={`flex flex-col items-center ${gapClass} ${className}`} aria-hidden>
        <div className={`w-px flex-1 ${lineClass}`} />
        {logo}
        <div className={`w-px flex-1 ${lineClass}`} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center ${gapClass} ${widthClass} ${className}`}
      aria-hidden
    >
      <div className={`h-px flex-1 ${lineClass}`} />
      {logo}
      <div className={`h-px flex-1 ${lineClass}`} />
    </div>
  );
}

type SoundprintBrandDividerSectionProps = SoundprintBrandDividerProps & {
  sectionClassName?: string;
};

/** Landing-page wrapper: full content width + horizontal padding. */
export function SoundprintBrandDividerSection({
  sectionClassName = "",
  ...dividerProps
}: SoundprintBrandDividerSectionProps) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${sectionClassName}`}
    >
      <SoundprintBrandDivider {...dividerProps} />
    </div>
  );
}
