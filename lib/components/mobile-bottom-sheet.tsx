"use client";

import { useEffect, type ReactNode } from "react";

type MobileBottomSheetProps = {
  open: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  /** Leave room for the dashboard bottom tab bar (< lg). */
  insetAboveBottomNav?: boolean;
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
  children,
}: MobileBottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] lg:hidden"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={[
          "fixed inset-x-0 z-[61] max-h-[min(92dvh,720px)] overflow-y-auto overscroll-y-contain rounded-t-[1.5rem] border-t border-card-border bg-background shadow-[0_-16px_48px_rgb(0_0_0_/0.2)] lg:static lg:z-auto lg:mt-8 lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none",
          insetAboveBottomNav
            ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] max-lg:rounded-b-none"
            : "bottom-0",
        ].join(" ")}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div
          className="mx-auto mb-2 mt-2 h-1 w-10 shrink-0 rounded-full bg-muted/50 lg:hidden"
          aria-hidden
        />
        {children}
      </div>
    </>
  );
}
