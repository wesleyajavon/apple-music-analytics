"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { establishPasswordRecoverySession } from "@/lib/auth/establish-password-recovery-session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  AUTH_CARD_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_MAIN_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "@/lib/constants/auth-form-styles";

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
    const supabase = createSupabaseBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasSession(true);
        setIsCheckingSession(false);
      }
    });

    void (async () => {
      try {
        const ok = await establishPasswordRecoverySession(supabase);
        if (!cancelled) {
          setHasSession(ok);
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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

  if (isCheckingSession) {
    return (
      <main id="auth-main" tabIndex={-1} className={AUTH_MAIN_CLASS}>
        <p className="text-center text-sm text-muted">{t("updatePasswordCheckingSession")}</p>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main id="auth-main" tabIndex={-1} className={AUTH_MAIN_CLASS}>
        <section className={AUTH_CARD_CLASS} aria-labelledby="update-password-expired-heading">
          <h1
            id="update-password-expired-heading"
            className="text-xl font-bold tracking-tight text-foreground lg:text-2xl"
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
    <main id="auth-main" tabIndex={-1} className={AUTH_MAIN_CLASS}>
      <section className={AUTH_CARD_CLASS} aria-labelledby="update-password-heading">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("updatePasswordEyebrow")}
        </p>
        <h1
          id="update-password-heading"
          className="mt-2 text-xl font-bold tracking-tight text-foreground lg:text-3xl"
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
              className={AUTH_INPUT_CLASS}
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
              className={AUTH_INPUT_CLASS}
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
            className={AUTH_PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? t("updatePasswordSaving") : t("updatePasswordSubmit")}
          </button>
        </form>
      </section>
    </main>
  );
}
