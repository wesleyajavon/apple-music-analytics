"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";

type HomeMobileStickyCtaProps = {
  isAuthenticated: boolean;
};

export function HomeMobileStickyCta({ isAuthenticated }: HomeMobileStickyCtaProps) {
  const t = useTranslations("home");
  const tAuth = useTranslations("auth");

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto mx-auto max-w-7xl border-t border-card-border bg-surface-glass/95 px-4 py-3 shadow-[0_-8px_32px_rgb(0_0_0_/0.12)] backdrop-blur-xl">
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand-glow active:scale-[0.98]"
          >
            {t("goToDashboard")}
          </Link>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Link
                href="/sign-up"
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand-glow active:scale-[0.98]"
              >
                {tAuth("signUp")}
              </Link>
              <Link
                href="/sign-in"
                className="flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 px-4 text-sm font-semibold text-primary shadow-card active:scale-[0.98]"
              >
                {tAuth("signIn")}
              </Link>
            </div>
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="flex min-h-10 items-center justify-center rounded-xl border border-card-border bg-card-surface px-4 text-center text-xs font-semibold text-foreground shadow-sm active:scale-[0.98]"
            >
              {t("accessDashboard")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
