import { SoundprintLogo } from "@/lib/components/soundprint-logo";

type BrandMarkSize = "sm" | "md" | "lg" | "xl";
type BrandMarkTone = "default" | "onDark";
type BrandMarkLayout = "inline" | "stacked";

type SoundprintBrandMarkProps = {
  size?: BrandMarkSize;
  tone?: BrandMarkTone;
  layout?: BrandMarkLayout;
  showWordmark?: boolean;
  showAiBadge?: boolean;
  /** When false, the AI badge is hidden below the `sm` breakpoint. */
  showAiBadgeOnMobile?: boolean;
  /** When false, the wordmark is hidden below the `sm` breakpoint (icon only on mobile). */
  showWordmarkOnMobile?: boolean;
  tagline?: string;
  priority?: boolean;
  interactive?: boolean;
  className?: string;
  wordmarkClassName?: string;
};

const ICON_SHELL: Record<BrandMarkSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10 sm:h-11 sm:w-11",
  lg: "h-11 w-11",
  xl: "h-28 w-28 sm:h-32 sm:w-32",
};

const ICON_IMAGE: Record<BrandMarkSize, string> = {
  sm: "h-6 w-6 rounded-lg",
  md: "h-7 w-7 rounded-xl sm:h-8 sm:w-8",
  lg: "h-8 w-8 rounded-xl",
  xl: "h-24 w-24 rounded-2xl sm:h-28 sm:w-28",
};

const NAME_TEXT: Record<BrandMarkSize, string> = {
  sm: "text-sm font-semibold tracking-[-0.03em]",
  md: "text-sm font-semibold tracking-[-0.03em] sm:text-base",
  lg: "text-base font-semibold tracking-[-0.03em]",
  xl: "text-lg font-semibold tracking-[-0.03em]",
};

const GAP: Record<BrandMarkSize, string> = {
  sm: "gap-2",
  md: "gap-2 sm:gap-3",
  lg: "gap-3",
  xl: "gap-4",
};

/**
 * Marque Soundprint cohérente : favicon dans un carré dégradé + wordmark + badge AI.
 * Utilisée sur la page de connexion, la sidebar, les en-têtes et les pages légales.
 */
export function SoundprintBrandMark({
  size = "md",
  tone = "default",
  layout = "inline",
  showWordmark = true,
  showAiBadge = true,
  showAiBadgeOnMobile = false,
  showWordmarkOnMobile = true,
  tagline,
  priority = false,
  interactive = true,
  className = "",
  wordmarkClassName = "",
}: SoundprintBrandMarkProps) {
  const badgeToneClasses =
    tone === "onDark"
      ? "border-primary/15 bg-primary/10 text-primary lg:border-white/20 lg:bg-white/10 lg:text-white/90"
      : "border-primary/15 bg-primary/10 text-primary";

  const nameToneClasses = tone === "onDark" ? "" : "text-foreground";

  const badgeVisibility = showAiBadgeOnMobile ? "inline-flex" : "hidden sm:inline-flex";

  const iconShellInteractive = interactive
    ? "transition-transform group-hover:rotate-[-2deg] group-hover:scale-105"
    : "";

  const aiBadge = showAiBadge ? (
    <span
      className={`${showWordmark ? badgeVisibility : "inline-flex"} shrink-0 rounded-full border px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] ${badgeToneClasses}`}
    >
      AI
    </span>
  ) : null;

  const wordmarkVisibility = showWordmarkOnMobile ? "flex" : "hidden sm:flex";

  const wordmark = showWordmark ? (
    layout === "stacked" ? (
      <div
        className={`${wordmarkVisibility} min-w-0 flex-col justify-center gap-1 ${wordmarkClassName}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate ${NAME_TEXT[size]} ${nameToneClasses}`}>Soundprint</span>
          {aiBadge}
        </div>
        {tagline ? (
          <span className="text-[11px] font-medium leading-snug text-muted">{tagline}</span>
        ) : null}
      </div>
    ) : (
      <span className={`${wordmarkVisibility} min-w-0 items-center gap-2 ${wordmarkClassName}`}>
        <span className={`truncate ${NAME_TEXT[size]} ${nameToneClasses}`}>Soundprint</span>
        {aiBadge}
      </span>
    )
  ) : null;

  return (
    <span className={`inline-flex min-w-0 items-center ${GAP[size]} ${className}`}>
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand-glow ring-1 ring-white/20 ${ICON_SHELL[size]} ${iconShellInteractive}`}
      >
        <SoundprintLogo
          src="/brand/favicon.png"
          showText={false}
          imageClassName={ICON_IMAGE[size]}
          priority={priority}
        />
      </span>
      {wordmark}
    </span>
  );
}
