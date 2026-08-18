"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Sparkles, Swords } from "lucide-react";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";

type OverviewFeaturePromosProps = {
  soundprintChatHref: string;
  duetHref: string;
  variant?: "panel" | "stack" | "grid";
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
  disabled = false,
}: {
  href: string;
  ariaLabel: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  icon: typeof Sparkles;
  accent: "violet" | "cyan";
  disabled?: boolean;
}) {
  const accentStyles =
    accent === "violet"
      ? {
          glow: "bg-accent-violet/20",
          badge: "border-accent-violet/25 bg-accent-violet/10 text-violet-100",
          icon: "bg-accent-violet/15 text-accent-violet",
          ring: "hover:border-accent-violet/30 hover:bg-accent-violet/[0.08]",
        }
      : {
          glow: "bg-accent-cyan/20",
          badge: "border-accent-cyan/25 bg-accent-cyan/10 text-cyan-100",
          icon: "bg-accent-cyan/15 text-accent-cyan",
          ring: "hover:border-accent-cyan/30 hover:bg-accent-cyan/[0.08]",
        };

  const className = `group relative block overflow-hidden rounded-[1.35rem] border border-white/12 bg-white/[0.06] p-4 backdrop-blur-sm ${
    disabled ? "cursor-default opacity-80" : `transition-all hover:-translate-y-0.5 ${accentStyles.ring}`
  }`;

  const content = (
    <>
      <div
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full ${accentStyles.glow} blur-2xl`}
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 ${accentStyles.icon}`}
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
          <p className="mt-1 text-sm leading-6 text-white/65">{description}</p>
          <span
            className={`mt-3 inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90 ${
              disabled ? "" : "transition group-hover:gap-2 group-hover:bg-white/15"
            }`}
          >
            {cta}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={className}>
      {content}
    </Link>
  );
}

export function OverviewFeaturePromos({
  soundprintChatHref,
  duetHref,
  variant = "panel",
}: OverviewFeaturePromosProps) {
  const t = useTranslations("overview.featurePromos");
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);

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
        disabled={isPublicDemoViewer}
      />
    </>
  );

  if (variant === "stack") {
    return <div className="space-y-3">{cards}</div>;
  }

  if (variant === "grid") {
    return <div className="grid gap-3 sm:grid-cols-2">{cards}</div>;
  }

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="space-y-3 rounded-[1.35rem] border border-white/10 bg-gray-950/75 p-4">
          {cards}
        </div>
      </div>
    </div>
  );
}

export function OverviewFeaturePromosSkeleton({ variant = "panel" }: { variant?: "panel" | "stack" }) {
  const cardSkeleton = (
    <div className="animate-pulse rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-white/15" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-16 rounded-full bg-white/15" />
          <div className="h-5 w-3/4 rounded bg-white/20" />
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-8 w-28 rounded-xl bg-white/15" />
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
        <div className="space-y-3 rounded-[1.35rem] border border-white/10 bg-gray-950/70 p-4">
          {cardSkeleton}
          {cardSkeleton}
        </div>
      </div>
    </div>
  );
}
