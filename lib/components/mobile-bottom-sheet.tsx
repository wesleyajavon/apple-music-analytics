"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";

type MobileBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  /** Leave room for the dashboard bottom tab bar (< lg). */
  insetAboveBottomNav?: boolean;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * Bottom sheet on viewports below lg; inline block on lg+ (desktop unchanged).
 */
export function MobileBottomSheet({
  open,
  onClose,
  ariaLabelledBy,
  insetAboveBottomNav = false,
  restoreFocusRef,
  children,
}: MobileBottomSheetProps) {
  const isLg = useIsLgChartViewport();
  const t = useTranslations("common");
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Lock body scroll only on mobile — desktop renders the panel inline (lg:static).
  useEffect(() => {
    if (!open || isLg) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, isLg]);

  useEffect(() => {
    if (!open || isLg) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const restoreNode = restoreFocusRef?.current ?? previousFocusRef.current;
    dialogRef.current?.focus();
    return () => {
      restoreNode?.focus();
    };
  }, [open, isLg, restoreFocusRef]);

  if (!open) return null;

  const panel = (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] lg:hidden"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={[
          "fixed inset-x-0 z-[61] max-h-[min(92dvh,720px)] overflow-y-auto overscroll-y-contain rounded-t-[1.5rem] border-t border-card-border bg-background shadow-[0_-16px_48px_rgb(0_0_0_/0.2)] outline-none lg:static lg:z-auto lg:mt-8 lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none",
          insetAboveBottomNav
            ? "max-lg:rounded-b-none"
            : "bottom-0",
        ].join(" ")}
        style={
          insetAboveBottomNav
            ? {
                bottom: `var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR}, 0px)`,
                paddingBottom: "0.75rem",
              }
            : {
                bottom: 0,
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }
        }
      >
        <div
          className="mx-auto mb-2 mt-2 h-1 w-10 shrink-0 rounded-full bg-muted/50 lg:hidden"
          aria-hidden
        />
        {children}
      </div>
    </>
  );

  // Header/nav use backdrop-blur, which makes `position: fixed` descendants
  // attach to that bar instead of the viewport. Portal on mobile only.
  if (!isLg) {
    if (!mounted) return null;
    return createPortal(panel, document.body);
  }

  return panel;
}
