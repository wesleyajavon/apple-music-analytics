"use client";

import { FormEvent, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";

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

  const inputClassName =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-shadow ring-accent-violet focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

  const statusId = error ? errorId : success ? successId : undefined;

  return (
    <main
      id="auth-main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:py-12"
    >
      <section
        className="w-full rounded-2xl border border-gray-200/80 bg-white/90 p-6 shadow-lg shadow-gray-200/40 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 dark:shadow-none sm:p-8"
        aria-labelledby="sign-up-heading"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          {t("signUpEyebrow")}
        </p>
        <h1
          id="sign-up-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl"
        >
          {t("signUpTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {t("signUpSubtitle")}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor={emailId}
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200"
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
              className={inputClassName}
              aria-invalid={error ? true : undefined}
              aria-describedby={statusId}
            />
          </div>

          <div>
            <label
              htmlFor={passwordId}
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200"
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
              className={inputClassName}
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
            className="w-full rounded-xl bg-accent-violet px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-violet/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t("creatingAccount") : t("signUp")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          {t("alreadyAccount")}{" "}
          <Link href="/sign-in" className="font-semibold text-accent-violet hover:underline">
            {t("signIn")}
          </Link>
        </p>

        <p className="mt-4 text-center sm:hidden">
          <Link
            href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
            className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
          >
            {t("dashboardLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
