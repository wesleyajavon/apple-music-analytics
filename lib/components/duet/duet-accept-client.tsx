"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, Shield, UserPlus } from "lucide-react";
import { UserAvatar } from "@/lib/components/user-avatar";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import {
  AUTH_CARD_CLASS,
  AUTH_MAIN_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "@/lib/constants/auth-form-styles";
import { useDuetMutations, type DuetShareScopeOption } from "@/lib/hooks/use-duet";
import { apiClient, ApiError } from "@/lib/api-client";

type InvitePreview = {
  requester: { id: string; email: string | null; name: string | null; avatarUrl: string | null };
  expiresAt: string;
};

function AcceptContent({ token }: { token: string }) {
  const t = useTranslations("duet.accept");
  const tAccept = useTranslations("duet.inviteAccept");
  const locale = useLocale();
  const router = useRouter();
  const { redeemInviteLink } = useDuetMutations();
  const [shareScope, setShareScope] = useState<DuetShareScopeOption>("aggregates");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    void apiClient
      .get<{ ok: boolean; expiresAt: string; requester: InvitePreview["requester"] }>(
        `/duet/friends/invite-link/validate?token=${encodeURIComponent(token)}`
      )
      .then((data) => {
        if (!cancelled) {
          setPreview({ expiresAt: data.expiresAt, requester: data.requester });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error : new Error("Failed"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await redeemInviteLink.mutateAsync({ token, shareScope });
      router.push("/dashboard/duet/friends");
    } catch {
      setFeedback(t("acceptError"));
    }
  }

  const requesterName = preview ? getDuetDisplayName(preview.requester) : "";

  if (isLoading) {
    return (
      <main className={AUTH_MAIN_CLASS}>
        <div className={AUTH_CARD_CLASS}>
          <p className="text-sm text-muted">{t("loading")}</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    const unavailable =
      loadError instanceof ApiError &&
      (loadError.statusCode === 404 || loadError.statusCode === 410);
    if (unavailable) {
      return (
        <main className={AUTH_MAIN_CLASS}>
          <div className={AUTH_CARD_CLASS}>
            <EmptyState
              variant="startup"
              message={t("invalidTitle")}
              description={t("invalidDescription")}
              actions={[{ label: t("goToFriends"), href: "/dashboard/duet/friends" }]}
            />
          </div>
        </main>
      );
    }
    return (
      <main className={AUTH_MAIN_CLASS}>
        <div className={AUTH_CARD_CLASS}>
          <ErrorState variant="startup" error={loadError} message={t("error")} />
        </div>
      </main>
    );
  }

  if (!preview) return null;

  const expiresLabel = new Date(preview.expiresAt).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className={AUTH_MAIN_CLASS}>
      <div className={`${AUTH_CARD_CLASS} max-w-lg space-y-6`}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <UserPlus className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-card-border bg-surface/60 p-4">
          <UserAvatar name={requesterName} src={preview.requester.avatarUrl} size="lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("fromLabel")}</p>
            <p className="text-lg font-semibold text-foreground">{requesterName}</p>
            <p className="mt-1 text-xs text-muted">{t("expiresLabel", { date: expiresLabel })}</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <fieldset>
            <legend className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Shield className="h-4 w-4 text-violet-500" aria-hidden />
              {tAccept("sharePrompt")}
            </legend>
            <div className="space-y-2">
              {(
                [
                  {
                    value: "aggregates" as const,
                    label: tAccept("scopeAggregates.label"),
                    description: tAccept("scopeAggregates.description"),
                  },
                  {
                    value: "full" as const,
                    label: tAccept("scopeFull.label"),
                    description: tAccept("scopeFull.description"),
                  },
                ] as const
              ).map((option) => {
                const selected = shareScope === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${
                      selected
                        ? "border-violet-400/80 bg-violet-50 dark:border-violet-400/45 dark:bg-violet-950/55"
                        : "border-card-border bg-surface/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shareScope"
                      value={option.value}
                      checked={selected}
                      onChange={() => setShareScope(option.value)}
                      className="sr-only"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={redeemInviteLink.isPending}
            className={`${AUTH_PRIMARY_BUTTON_CLASS} inline-flex w-full items-center justify-center gap-2`}
          >
            <Check className="h-4 w-4" aria-hidden />
            {redeemInviteLink.isPending ? t("accepting") : t("acceptCta")}
          </button>

          {feedback ? <p className="text-sm text-red-600 dark:text-red-400">{feedback}</p> : null}

          <p className="text-center text-xs leading-relaxed text-muted">
            {t("privacyNote")}{" "}
            <Link href="/legal/privacy" className="underline underline-offset-2">
              {t("privacyLink")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

export function DuetAcceptClient({ token }: { token: string }) {
  const t = useTranslations("duet.accept");
  return (
    <Suspense fallback={<p className="text-sm text-muted">{t("loading")}</p>}>
      <AcceptContent token={token} />
    </Suspense>
  );
}
