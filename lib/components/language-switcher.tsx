"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useRouter as useNextRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

interface LanguageSwitcherProps {
  /** Placement du dropdown : "top" = au-dessus du bouton (sidebar), "bottom" = en dessous (header) */
  placement?: "top" | "bottom";
  /** Sidebar collapsed: icon only, dropdown opens to the right */
  collapsed?: boolean;
  /** Header toolbar: icon-only below sm, full label from sm up */
  compactOnMobile?: boolean;
}

export function LanguageSwitcher({
  placement = "top",
  collapsed = false,
  compactOnMobile = false,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const nextRouter = useNextRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("languageSwitcher");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locales = routing.locales as readonly string[];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(fullPath, { locale: newLocale });
    // Force refresh to re-fetch Server Components with the new locale and messages
    nextRouter.refresh();
  };

  const showIconOnly = collapsed;
  const showCompactLabel = compactOnMobile && !collapsed;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-primary/10 transition-all duration-200 ${
          showIconOnly
            ? "justify-center p-2.5"
            : showCompactLabel
              ? "justify-center p-2.5 sm:gap-2 sm:justify-start sm:px-3 sm:py-2.5"
              : "gap-2 w-full px-3 py-2.5"
        }`}
        aria-label={t("ariaLabel")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={
          showIconOnly || showCompactLabel ? LOCALE_LABELS[locale] ?? locale : undefined
        }
      >
        <svg
          className="w-5 h-5 shrink-0 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        {!showIconOnly && (
          <>
            <span
              className={`flex-1 text-left truncate ${
                showCompactLabel ? "hidden sm:block" : ""
              }`}
            >
              {LOCALE_LABELS[locale] ?? locale}
            </span>
            <svg
              className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${
                showCompactLabel ? "hidden sm:block" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className={`absolute py-1 bg-surface-raised border border-card-border rounded-xl shadow-card overflow-hidden z-50 min-w-[120px] ${
            collapsed
              ? "left-full ml-1 top-0"
              : showCompactLabel
                ? `right-0 w-max ${placement === "top" ? "bottom-full mb-1" : "top-full mt-1"} sm:left-0 sm:right-0 sm:w-auto`
                : `left-0 right-0 ${placement === "top" ? "bottom-full mb-1" : "top-full mt-1"}`
          }`}
        >
          {locales.map((loc) => {
            const isActive = loc === locale;
            return (
              <li key={loc} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => switchLocale(loc)}
                  className={`
                    w-full px-3 py-2.5 text-left text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:bg-primary/10 hover:text-foreground"
                    }
                  `}
                >
                  {LOCALE_LABELS[loc] ?? loc}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
