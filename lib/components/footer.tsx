"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type FooterVariant = "dashboard" | "home";

/**
 * Footer compact et harmonieux - intégré à la surface du contenu
 */
export function Footer({ variant = "dashboard" }: { variant?: FooterVariant }) {
  const t = useTranslations("footer");

  const currentYear = new Date().getFullYear();

  const links = [
    { href: "/dashboard/overview", label: t("overview") },
    { href: "/dashboard/about", label: t("about") },
    { href: "/dashboard/insights", label: t("methodology") },
    { href: "/api-docs", label: t("apiDocs") },
  ];

  const isHome = variant === "home";

  return (
    <footer
      className={`
        shrink-0 px-4 sm:px-6 lg:px-8 py-5
        ${isHome
          ? "border-t border-white/20 dark:border-white/10 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
          : "border-t border-gray-100 dark:border-gray-800"
        }
      `}
      role="contentinfo"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-1"
          aria-label={t("navAriaLabel")}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          © {currentYear} {t("copyright")} · {t("madeWith")}
        </p>
      </div>
    </footer>
  );
}
