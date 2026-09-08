"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { DASHBOARD_LIST_ROW, DASHBOARD_LIST_SEPARATOR } from "@/lib/components/dashboard-ui";

type OverviewFeaturePromosProps = {
  soundprintChatHref: string;
  duetHref: string;
  variant?: "panel" | "stack" | "grid";
};

function FeaturePromoRow({
  href,
  ariaLabel,
  title,
  description,
  cta,
  disabled = false,
}: {
  href: string;
  ariaLabel: string;
  title: string;
  description: string;
  cta: string;
  disabled?: boolean;
}) {
  const className = `${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} no-underline text-foreground ${
    disabled ? "cursor-default opacity-60" : "hover:text-foreground"
  }`;

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight">{title}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-muted">{description}</p>
      </div>
      <span className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-medium text-muted">
        {cta}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
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
}: OverviewFeaturePromosProps) {
  const t = useTranslations("overview.featurePromos");
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);

  return (
    <div className="w-full min-w-0">
      <FeaturePromoRow
        href={soundprintChatHref}
        ariaLabel={t("soundprint.aria")}
        title={t("soundprint.title")}
        description={t("soundprint.description")}
        cta={t("soundprint.cta")}
      />
      <FeaturePromoRow
        href={duetHref}
        ariaLabel={t("duet.aria")}
        title={t("duet.title")}
        description={t("duet.description")}
        cta={t("duet.cta")}
        disabled={isPublicDemoViewer}
      />
    </div>
  );
}

export function OverviewFeaturePromosSkeleton() {
  return (
    <div className="w-full min-w-0" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-40 rounded bg-black/10 animate-shimmer dark:bg-white/10" />
            <div className="h-3.5 w-3/4 rounded bg-black/10 animate-shimmer dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
