"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function PublicDemoAiSignupCta({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const t = useTranslations("publicDemoAi");
  const isDark = variant === "dark";

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        isDark
          ? "border-white/10 bg-black/30"
          : "border-slate-200/90 bg-white dark:border-white/[0.06] dark:bg-[#0f111a]"
      } ${className}`}
    >
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${
          isDark
            ? "border-white/15 bg-white/10 text-white/90"
            : "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-cyan-100"
        }`}
      >
        {t("demoPill")}
      </span>
      <p
        className={`mt-3 text-sm leading-relaxed ${
          isDark ? "text-slate-300" : "text-slate-700 dark:text-slate-200"
        }`}
      >
        {t("signUpHint")}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/sign-up"
          className={
            isDark
              ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
              : "inline-flex min-h-10 items-center justify-center rounded-xl bg-accent-violet px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-violet/90"
          }
        >
          {t("signUp")}
        </Link>
        <Link
          href="/sign-in"
          className={
            isDark
              ? "inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              : "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/5"
          }
        >
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}
