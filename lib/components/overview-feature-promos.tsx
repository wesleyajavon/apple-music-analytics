"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Sparkles, Swords } from "lucide-react";

type OverviewFeaturePromosProps = {
  soundprintChatHref: string;
  duetHref: string;
  variant?: "panel" | "stack";
};

function FeaturePromoCard({
  href,
  ariaLabel,
  badge,
  title,
  description,
  cta,
  icon: Icon,
  accent,
}: {
  href: string;
  ariaLabel: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  icon: typeof Sparkles;
  accent: "violet" | "cyan";
}) {
  const accentStyles =
    accent === "violet"
      ? {
          glow: "bg-violet-400/20",
          badge: "border-violet-300/25 bg-violet-300/10 text-violet-100",
          icon: "text-violet-200",
          ring: "hover:border-violet-300/30 hover:bg-violet-400/[0.08]",
        }
      : {
          glow: "bg-cyan-400/20",
          badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
          icon: "text-cyan-200",
          ring: "hover:border-cyan-300/30 hover:bg-cyan-400/[0.08]",
        };

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`group relative block overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4 transition-all hover:-translate-y-0.5 ${accentStyles.ring}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full ${accentStyles.glow} blur-2xl`}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 ${accentStyles.icon}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${accentStyles.badge}`}
          >
            {badge}
          </span>
          <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white/90 transition group-hover:gap-2">
            {cta}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function OverviewFeaturePromos({
  soundprintChatHref,
  duetHref,
  variant = "panel",
}: OverviewFeaturePromosProps) {
  const t = useTranslations("overview.featurePromos");

  const cards = (
    <>
      <FeaturePromoCard
        href={soundprintChatHref}
        ariaLabel={t("soundprint.aria")}
        badge={t("soundprint.badge")}
        title={t("soundprint.title")}
        description={t("soundprint.description")}
        cta={t("soundprint.cta")}
        icon={Sparkles}
        accent="violet"
      />
      <FeaturePromoCard
        href={duetHref}
        ariaLabel={t("duet.aria")}
        badge={t("duet.badge")}
        title={t("duet.title")}
        description={t("duet.description")}
        cta={t("duet.cta")}
        icon={Swords}
        accent="cyan"
      />
    </>
  );

  if (variant === "stack") {
    return <div className="space-y-3">{cards}</div>;
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t("panelBadge")}
            </p>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-emerald-100">
              {t("panelTag")}
            </span>
          </div>
          <div className="mt-4 space-y-3">{cards}</div>
        </div>
      </div>
    </div>
  );
}

export function OverviewFeaturePromosSkeleton({ variant = "panel" }: { variant?: "panel" | "stack" }) {
  const cardSkeleton = (
    <div className="animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-2xl bg-white/15" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-16 rounded-full bg-white/15" />
          <div className="h-5 w-3/4 rounded bg-white/20" />
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-4 w-24 rounded bg-white/15" />
        </div>
      </div>
    </div>
  );

  if (variant === "stack") {
    return (
      <div className="space-y-3">
        {cardSkeleton}
        {cardSkeleton}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3">
        <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-white/15" />
          </div>
          <div className="space-y-3">
            {cardSkeleton}
            {cardSkeleton}
          </div>
        </div>
      </div>
    </div>
  );
}
