"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  buildSoundprintScreenPreviewLabels,
  SoundprintScreenPreview,
} from "@/lib/components/home-3d/soundprint-screen-preview";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";

type HomeHeroDashboardPreviewProps = {
  className?: string;
  compact?: boolean;
};

export function HomeHeroDashboardPreview({
  className,
  compact = false,
}: HomeHeroDashboardPreviewProps) {
  const t = useTranslations("home.heroDashboardPreview");
  const tScreen = useTranslations("home.heroDashboardPreview.screen");
  const screenLabels = useMemo(
    () => buildSoundprintScreenPreviewLabels(tScreen),
    [tScreen],
  );

  return (
    <div className={["relative z-10", className].filter(Boolean).join(" ")}>
      <div
        className="absolute -inset-6 rounded-[2rem] bg-brand-gradient-soft blur-2xl"
        aria-hidden
      />
      <div className="relative space-y-3 rounded-[2rem] border border-card-border bg-surface-glass p-3 shadow-card backdrop-blur-xl">
        <div
          className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/30"
          aria-label={t("label")}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl"
            aria-hidden
          />

          <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-300 sm:text-[0.65rem]">
                  {t("eyebrow")}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-400 sm:text-sm">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-violet-100 sm:px-3 sm:text-[0.62rem]">
              <SoundprintLogo
                src="/brand/favicon.png"
                showText={false}
                imageClassName="h-3.5 w-3.5 object-contain sm:h-4 sm:w-4"
              />
              {t("liveBadge")}
            </span>
          </div>

          <div
            className={[
              "relative w-full",
              compact
                ? "h-[min(16rem,58vw)]"
                : "h-[min(22rem,72vw)] sm:h-[min(24rem,52vw)] lg:h-[min(26rem,36vw)]",
            ].join(" ")}
          >
            <SoundprintScreenPreview labels={screenLabels} />
          </div>
        </div>
      </div>
    </div>
  );
}
