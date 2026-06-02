/** Champs auth — text-base sur mobile évite le zoom iOS ; sm:text-sm inchangé sur desktop intermédiaire. */
export const AUTH_INPUT_CLASS =
  "w-full rounded-lg border border-card-border bg-surface-raised px-3 py-2.5 text-base text-foreground outline-none transition-shadow ring-ring focus:border-primary focus:ring-2 focus:ring-ring sm:text-sm";

export const AUTH_PRIMARY_BUTTON_CLASS =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";

export const AUTH_OAUTH_BUTTON_CLASS =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-card-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-surface disabled:cursor-not-allowed disabled:opacity-60";

export const AUTH_MAIN_CLASS =
  "mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 pb-10 sm:py-12 lg:pb-12";

export const AUTH_CARD_CLASS =
  "w-full rounded-2xl border border-card-border bg-card-surface p-5 shadow-card backdrop-blur-sm sm:p-8";

export const AUTH_INLINE_LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline";
