/** Champs auth — text-base sur mobile évite le zoom iOS ; sm:text-sm inchangé sur desktop intermédiaire. */
export const AUTH_INPUT_CLASS =
  "w-full rounded-xl border border-card-border bg-surface-raised px-3 py-2.5 text-base text-foreground outline-none transition-[border-color,box-shadow] ring-ring focus:border-primary focus:ring-2 focus:ring-ring sm:text-sm lg:border-white/12 lg:bg-white/[0.07] lg:text-white lg:placeholder:text-white/35 lg:focus:border-primary/70 lg:focus:ring-primary/25";

export const AUTH_PRIMARY_BUTTON_CLASS =
  "flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-[opacity,transform] hover:opacity-95 hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";

export const AUTH_OAUTH_BUTTON_CLASS =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-card-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-surface disabled:cursor-not-allowed disabled:opacity-60 lg:border-white/12 lg:bg-white/[0.04] lg:text-white/90 lg:hover:bg-white/[0.08] lg:hover:text-white";

export const AUTH_MAIN_CLASS =
  "mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 pb-10 sm:py-12 lg:pb-12";

export const AUTH_FORM_PANEL_CLASS = "mx-auto w-full max-w-[22rem] sm:max-w-[24rem]";

export const AUTH_HEADING_CLASS =
  "text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-white";

export const AUTH_LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-foreground/85 lg:text-white/80";

export const AUTH_DIVIDER_LINE_CLASS = "w-full border-t border-card-border lg:border-white/10";

export const AUTH_DIVIDER_TEXT_CLASS =
  "bg-card px-3 text-xs uppercase tracking-wider text-muted lg:bg-transparent lg:text-white/40";

export const AUTH_CARD_CLASS =
  "w-full rounded-2xl border border-card-border bg-card-surface p-5 shadow-card backdrop-blur-sm sm:p-8";

/** Formulaire auth style Luma — sans carte, typographie épurée */
export const AUTH_PLAIN_FORM_CLASS = "w-full";

export const AUTH_INLINE_LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline lg:text-white/70 lg:hover:text-white";

export const AUTH_FOOTER_LINK_CLASS =
  "font-semibold text-primary hover:underline lg:text-white lg:hover:text-white/80";
