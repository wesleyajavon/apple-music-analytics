"use client";

import { useTheme } from "@/lib/providers/theme-provider";
import type { Theme } from "@/lib/providers/theme-provider";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";

interface ThemeSwitcherProps {
  /** Placement du dropdown : "top" = au-dessus du bouton (sidebar), "bottom" = en dessous (header) */
  placement?: "top" | "bottom";
  /** Sidebar collapsed: icon only, dropdown opens to the right */
  collapsed?: boolean;
  /** Header toolbar: icon-only below sm, full label from sm up */
  compactOnMobile?: boolean;
}

const THEMES: Theme[] = ["light", "dark", "system"];

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const iconClass = "w-5 h-5 shrink-0 text-muted";
  switch (theme) {
    case "light":
      return <SunIcon className={iconClass} />;
    case "dark":
      return <MoonIcon className={iconClass} />;
    case "system":
      return <MonitorIcon className={iconClass} />;
  }
}

export function ThemeSwitcher({
  placement = "top",
  collapsed = false,
  compactOnMobile = false,
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("themeSwitcher");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const renderThemeOption = (themeKey: Theme) => {
    const isActive = themeKey === theme;
    return (
      <li key={themeKey} role="option" aria-selected={isActive}>
        <button
          type="button"
          onClick={() => selectTheme(themeKey)}
          className={`
            w-full px-3 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2
            ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-primary/10 hover:text-foreground"
            }
          `}
        >
          <ThemeIcon theme={themeKey} />
          {t(themeKey)}
        </button>
      </li>
    );
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
        title={showIconOnly || showCompactLabel ? t(theme) : undefined}
      >
        <ThemeIcon theme={theme} />
        {!showIconOnly && (
          <>
            <span
              className={`flex-1 text-left truncate ${
                showCompactLabel ? "hidden sm:block" : ""
              }`}
            >
              {t(theme)}
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
          className={`absolute py-1 bg-surface-raised border border-card-border rounded-xl shadow-card overflow-hidden z-50 min-w-[140px] ${
            collapsed
              ? "left-full ml-1 top-0"
              : showCompactLabel
                ? `right-0 w-max ${placement === "top" ? "bottom-full mb-1" : "top-full mt-1"} sm:left-0 sm:right-0 sm:w-auto`
                : `left-0 right-0 ${placement === "top" ? "bottom-full mb-1" : "top-full mt-1"}`
          }`}
        >
          {THEMES.map(renderThemeOption)}
        </ul>
      )}
    </div>
  );
}
