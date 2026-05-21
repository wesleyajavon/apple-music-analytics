"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const t = useTranslations("auth");
  const passwordId = useId();
  const confirmPasswordId = useId();
  const errorId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) {
          setHasSession(Boolean(data.user));
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("updatePasswordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("updatePasswordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      window.location.href = "/dashboard";
    } finally {
      setIsLoading(false);
    }
  }

  const inputClassName =
    "w-full rounded-lg border border-card-border bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none transition-shadow ring-ring focus:border-primary focus:ring-2 focus:ring-ring";

  if (isCheckingSession) {
    return (
      <main
        id="auth-main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:py-12"
      >
        <p className="text-center text-sm text-muted">{t("updatePasswordCheckingSession")}</p>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main
        id="auth-main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:py-12"
      >
        <section
          className="w-full rounded-2xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm sm:p-8"
          aria-labelledby="update-password-expired-heading"
        >
          <h1
            id="update-password-expired-heading"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            {t("updatePasswordExpiredTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("updatePasswordExpiredSubtitle")}
          </p>
          <p className="mt-6 text-center">
            <Link
              href="/forgot-password"
              className="font-semibold text-primary hover:underline"
            >
              {t("forgotPasswordSubmit")}
            </Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      id="auth-main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:py-12"
    >
      <section
        className="w-full rounded-2xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm sm:p-8"
        aria-labelledby="update-password-heading"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("updatePasswordEyebrow")}
        </p>
        <h1
          id="update-password-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("updatePasswordTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("updatePasswordSubtitle")}
        </p>

        <form method="post" onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor={passwordId}
              className="mb-1.5 block text-sm font-medium text-foreground/85"
            >
              {t("updatePasswordNew")}
            </label>
            <input
              id={passwordId}
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <div>
            <label
              htmlFor={confirmPasswordId}
              className="mb-1.5 block text-sm font-medium text-foreground/85"
            >
              {t("updatePasswordConfirm")}
            </label>
            <input
              id={confirmPasswordId}
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClassName}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          {error && (
            <p
              id={errorId}
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t("updatePasswordSaving") : t("updatePasswordSubmit")}
          </button>
        </form>
      </section>
    </main>
  );
}
