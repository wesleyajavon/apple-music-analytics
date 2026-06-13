import type { ReactNode } from "react";

type BadgeAccent = "violet" | "rose" | "emerald" | "cyan";

const BADGE_ACCENT_CLASS: Record<BadgeAccent, string> = {
  violet:
    "border-accent-violet/20 bg-white/70 text-accent-violet dark:border-violet-400/18 dark:bg-[#141622] dark:text-violet-100",
  rose: "border-rose-300/25 bg-white/70 text-rose-600 dark:border-rose-400/18 dark:bg-[#141622] dark:text-rose-100",
  emerald:
    "border-emerald-300/25 bg-white/70 text-emerald-700 dark:border-emerald-400/18 dark:bg-[#141622] dark:text-emerald-100",
  cyan: "border-cyan-300/25 bg-white/70 text-cyan-700 dark:border-cyan-400/18 dark:bg-[#141622] dark:text-cyan-100",
};

const BADGE_DOT_CLASS: Record<BadgeAccent, string> = {
  violet: "bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.65)]",
  rose: "bg-amber-400 shadow-[0_0_16px_rgb(251_191_36_/0.7)]",
  emerald: "bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]",
  cyan: "bg-accent-cyan shadow-[0_0_16px_rgb(79_144_224_/0.7)]",
};

export type DashboardPreviewShellProps = {
  badge: string;
  badgeAccent?: BadgeAccent;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  /** Slight 3D tilt like the auth sign-in panel */
  tilt?: boolean;
};

export function DashboardPreviewShell({
  badge,
  badgeAccent = "violet",
  title,
  description,
  children,
  className = "",
  tilt = false,
}: DashboardPreviewShellProps) {
  return (
    <div
      className={`relative w-full max-w-full origin-center ${tilt ? "[transform:perspective(1400px)_rotateY(-3deg)]" : ""} ${className}`}
    >
      <div
        className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgb(152_80_208_/_0.22),transparent_68%)] blur-3xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-[#06070d] via-[#070812] to-[#0c0e18] shadow-[0_32px_80px_-24px_rgb(0_0_0_/_0.75)] ring-1 ring-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.14),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(79,144,224,0.12),transparent_34%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
          aria-hidden
        />

        <div className="relative border-b border-white/[0.06] px-6 py-5 xl:px-7 xl:py-6">
          <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm backdrop-blur ${BADGE_ACCENT_CLASS[badgeAccent]}`}>
            <span className={`h-2 w-2 rounded-full ${BADGE_DOT_CLASS[badgeAccent]}`} aria-hidden />
            {badge}
          </div>
          <h3 className="max-w-xl text-xl font-semibold tracking-[-0.05em] text-white sm:text-2xl xl:text-[1.75rem] xl:leading-tight">
            {title}
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400 xl:text-[0.9375rem]">
            {description}
          </p>
        </div>

        <div className="relative p-4 xl:p-5">{children}</div>
      </div>
    </div>
  );
}
