"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { withPublicDemoUserId } from "@/lib/constants/public-profile";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";

type FooterVariant = "dashboard" | "home";

/**
 * Footer compact et harmonieux - intégré à la surface du contenu.
 * Hidden below lg on dashboard: bottom nav is the mobile chrome.
 */
export function Footer({ variant = "dashboard" }: { variant?: FooterVariant }) {
  const t = useTranslations("footer");
  const hideOnMobileDashboard = variant === "dashboard";

  const currentYear = new Date().getFullYear();
  const { publicProfileUserId, publicDemoOverviewPath } = usePublicDemo();

  const hrefWithDemo = (href: string) =>
    publicProfileUserId ? withPublicDemoUserId(href, publicProfileUserId) : href;

  const links = [
    { href: hrefWithDemo("/dashboard/overview"), label: t("overview") },
    { href: hrefWithDemo("/dashboard/about"), label: t("about") },
    {
      href: publicDemoOverviewPath ?? hrefWithDemo("/dashboard/demo"),
      label: t("demo"),
    },
    { href: hrefWithDemo("/dashboard/insights"), label: t("methodology") },
    { href: "/api-docs", label: t("apiDocs") },
    { href: "/legal/privacy", label: t("privacy") },
    { href: "/legal/terms", label: t("terms") },
    { href: "/legal/cookies", label: t("cookies") },
  ];

  const isHome = variant === "home";

  return (
    <footer
      className={`
        shrink-0 px-4 sm:px-6 lg:px-8 py-5
        ${hideOnMobileDashboard ? "max-lg:hidden" : ""}
        ${isHome
          ? "border-t border-card-border bg-surface-glass backdrop-blur-sm"
          : "border-t border-card-border lg:pb-5"
        }
      `}
      role="contentinfo"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div
          className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
            isHome ? "items-center text-center sm:items-center sm:text-left" : ""
          }`}
        >
        <nav
          className={`flex flex-wrap items-center gap-x-5 gap-y-1 ${
            isHome ? "justify-center sm:justify-start" : ""
          }`}
          aria-label={t("navAriaLabel")}
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted hover:text-primary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div
          className={`flex flex-col gap-1 ${
            isHome ? "items-center sm:items-end" : "sm:items-end"
          }`}
        >
          <p className="text-xs text-muted/75">
            © {currentYear} {t("copyright")} · {t("madeWith")}
          </p>
          <p className="text-xs text-muted">
            {t("creatorCredit")}
          </p>
        </div>
        </div>
      </div>
    </footer>
  );
}
