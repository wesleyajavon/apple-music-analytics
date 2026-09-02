"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { HOME_JOURNEY_NAV_ITEMS } from "@/lib/constants/home-journey-nav";

export function HomeMobileNav() {
  const t = useTranslations("home");
  const tNav = useTranslations("home.journey.nav");
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508]"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? t("mobileNav.closeMenu") : t("mobileNav.openMenu")}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-label={t("mobileNav.closeMenu")}
            onClick={close}
          />
          <nav
            id={panelId}
            className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 rounded-2xl border border-white/10 bg-[#10111c]/95 p-2 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            aria-label={t("mobileNav.menuLabel")}
          >
            <ul className="flex flex-col gap-0.5">
              {HOME_JOURNEY_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 active:bg-white/10"
                    onClick={close}
                  >
                    {tNav(item.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      ) : null}
    </div>
  );
}
