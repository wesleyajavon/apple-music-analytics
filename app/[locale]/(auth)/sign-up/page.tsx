"use client";

import { FormEvent, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";
import {
  AUTH_CARD_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_MAIN_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "@/lib/constants/auth-form-styles";

export default function SignUpPage() {
  const t = useTranslations("auth");
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const successId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(t("signUpSuccess"));
    } finally {
      setIsLoading(false);
    }
  }

  const statusId = error ? errorId : success ? successId : undefined;

  return (
    <main id="auth-main" tabIndex={-1} className={AUTH_MAIN_CLASS}>
      <section className={AUTH_CARD_CLASS} aria-labelledby="sign-up-heading">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("signUpEyebrow")}
        </p>
        <h1
          id="sign-up-heading"
          className="mt-2 text-xl font-bold tracking-tight text-foreground lg:text-3xl"
        >
          {t("signUpTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("signUpSubtitle")}
        </p>

        <form method="post" onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor={emailId}
              className="mb-1.5 block text-sm font-medium text-foreground/85"
            >
              {t("email")}
            </label>
            <input
              id={emailId}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT_CLASS}
              aria-invalid={error ? true : undefined}
              aria-describedby={statusId}
            />
          </div>

          <div>
            <label
              htmlFor={passwordId}
              className="mb-1.5 block text-sm font-medium text-foreground/85"
            >
              {t("password")}
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
              aria-describedby={statusId}
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

          {success && (
            <p
              id={successId}
              role="status"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={AUTH_PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? t("creatingAccount") : t("signUp")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t("alreadyAccount")}{" "}
          <Link href="/sign-in" className="font-semibold text-primary hover:underline">
            {t("signIn")}
          </Link>
        </p>

        <p className="mt-4 text-center sm:hidden">
          <Link
            href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
            className="text-sm font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
          >
            {t("dashboardLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
