import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type DashboardHeroTitleProps = {
  icon: LucideIcon;
  children: ReactNode;
  /** Gradient hero (violet shell) vs. light marketing/docs pages */
  variant?: "hero" | "page";
  className?: string;
};

/**
 * Titre de page avec icône vectorielle (remplace les emojis dans les chaînes i18n).
 */
export function DashboardHeroTitle({
  icon: Icon,
  children,
  variant = "hero",
  className,
}: DashboardHeroTitleProps) {
  const iconClass =
    variant === "hero"
      ? "h-9 w-9 shrink-0 text-violet-200/90 sm:h-10 sm:w-10"
      : "h-8 w-8 shrink-0 text-accent-violet sm:h-9 sm:w-9";

  const headingClass =
    variant === "hero"
      ? "mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
      : "flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl";

  return (
    <h1 className={[headingClass, className].filter(Boolean).join(" ")}>
      <Icon className={iconClass} strokeWidth={1.75} aria-hidden />
      <span>{children}</span>
    </h1>
  );
}
