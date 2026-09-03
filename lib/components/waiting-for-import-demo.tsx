"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";

export const DASHBOARD_VIDEO_DEMO_PATH = "/dashboard/demo";

const MOBILE_IMPORT_CTA_CLASS =
  "inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25";

const MOBILE_DEMO_CTA_CLASS =
  "inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm";

/**
 * Live public-demo path when configured, otherwise the product video demo page.
 * Skip-import users should always have somewhere to explore while they wait for an export.
 */
export function useWaitingForImportDemoHref(demoPath = "/dashboard/overview"): string {
  const { hrefWithPublicDemo } = usePublicDemo();
  return hrefWithPublicDemo(demoPath) ?? DASHBOARD_VIDEO_DEMO_PATH;
}

export function useIsSignedInExploringPublicDemo(): boolean {
  const searchParams = useSearchParams();
  const { publicProfileUserId } = usePublicDemo();
  const authUserId = useSupabaseAuthUserId();
  const userIdFromUrl = searchParams.get("userId");

  return (
    Boolean(authUserId) &&
    Boolean(publicProfileUserId) &&
    userIdFromUrl === publicProfileUserId &&
    authUserId !== publicProfileUserId
  );
}

export function pathWithoutDashboardUserId(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const next = new URLSearchParams(searchParams.toString());
  next.delete("userId");
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function WaitingForImportMobileCtas({
  demoPath,
  importLabel,
  demoLabel,
}: {
  demoPath: string;
  importLabel: string;
  demoLabel: string;
}) {
  const demoHref = useWaitingForImportDemoHref(demoPath);

  return (
    <div className="flex flex-col gap-3">
      <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={MOBILE_IMPORT_CTA_CLASS}>
        {importLabel}
      </Link>
      <Link href={demoHref} className={MOBILE_DEMO_CTA_CLASS}>
        {demoLabel}
      </Link>
    </div>
  );
}

export function SignedInPublicDemoExploreBanner() {
  const t = useTranslations("components.emptyState");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const exploring = useIsSignedInExploringPublicDemo();

  if (!exploring) return null;

  return (
    <div className="border-b border-accent-cyan/20 bg-accent-cyan/[0.08] px-4 py-2.5 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm leading-5 text-foreground">{t("waitingDemoBanner")}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={pathWithoutDashboardUserId(pathname, searchParams)}
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-card-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/[0.05]"
          >
            {t("waitingDemoBack")}
          </Link>
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
          >
            {t("importData.actionLabel")}
          </Link>
        </div>
      </div>
    </div>
  );
}
