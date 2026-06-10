"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/lib/components/user-avatar";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
} from "@/lib/constants/dashboard-spotlight";
import { useDuetFriends, useDuetMutations, type DuetShareScopeOption } from "@/lib/hooks/use-duet";
import type { FriendshipDto } from "@/lib/dto/duet";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function FriendRow({
  friendship,
  viewerId,
  onAccept,
  onDecline,
  onRevoke,
  onBlock,
  busy,
}: {
  friendship: FriendshipDto;
  viewerId: string;
  onAccept: (id: string, scope: DuetShareScopeOption) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
  onBlock: (id: string) => void;
  busy: boolean;
}) {
  const t = useTranslations("duet.friends");
  const tAccept = useTranslations("duet.inviteAccept");
  const peer =
    friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
  const [shareScope, setShareScope] = useState<DuetShareScopeOption>("aggregates");

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={getDuetDisplayName(peer)} src={peer.avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">
            {getDuetDisplayName(peer)}
          </p>
          {peer.email ? (
            <p className={`truncate text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{peer.email}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {friendship.direction === "outgoing" && friendship.status === "pending" ? (
          <span className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("pendingOutgoingStatus")}</span>
        ) : null}
        {friendship.direction === "incoming" && friendship.status === "pending" ? (
          <>
            <select
              value={shareScope}
              onChange={(e) => setShareScope(e.target.value as DuetShareScopeOption)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/30"
              aria-label={tAccept("sharePrompt")}
            >
              <option value="aggregates">{tAccept("scopeAggregates.label")}</option>
              <option value="full">{tAccept("scopeFull.label")}</option>
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept(friendship.id, shareScope)}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              {t("accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(friendship.id)}
              className={DASHBOARD_SPOTLIGHT_BTN_SECONDARY}
            >
              {t("decline")}
            </button>
          </>
        ) : null}
        {friendship.status === "accepted" ? (
          <>
            <Link
              href={`/dashboard/duet/compare?friendUserId=${encodeURIComponent(peer.id)}`}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white no-underline"
            >
              {t("compare")}
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRevoke(friendship.id)}
              className={DASHBOARD_SPOTLIGHT_BTN_SECONDARY}
            >
              {t("revoke")}
            </button>
          </>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => onBlock(friendship.id)}
          className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:text-red-300"
        >
          {t("block")}
        </button>
      </div>
    </li>
  );
}

export function DuetFriendsClient() {
  const t = useTranslations("duet.friends");
  const { data, isLoading, error, refetch } = useDuetFriends();
  const { invite, patchFriendship, blockFriendship } = useDuetMutations();
  const [email, setEmail] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data: auth }) => setViewerId(auth.user?.id ?? null));
  }, []);

  const busy =
    invite.isPending || patchFriendship.isPending || blockFriendship.isPending;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await invite.mutateAsync(email.trim());
      setEmail("");
      setFeedback(t("inviteSent"));
    } catch {
      setFeedback(t("inviteError"));
    }
  }

  if (isLoading) {
    return <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("loading")}</p>;
  }

  if (error) {
    return (
      <ErrorState variant="startup" error={error} message={t("error")} onRetry={() => refetch()} />
    );
  }

  const hasAny =
    (data?.friends.length ?? 0) +
      (data?.pendingIncoming.length ?? 0) +
      (data?.pendingOutgoing.length ?? 0) >
    0;

  return (
    <div className="space-y-8">
      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t("inviteTitle")}</h2>
        <p className={`mt-2 text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("inviteDescription")}</p>
        <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("invitePlaceholder")}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black/30 dark:text-white"
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t("inviteSubmit")}
          </button>
        </form>
        {feedback ? <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p> : null}
      </section>

      {!hasAny ? (
        <EmptyState variant="startup" message={t("emptyTitle")} description={t("emptyDescription")} />
      ) : null}

      {viewerId && data?.pendingIncoming.length ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("pendingIncoming")}
          </h2>
          <ul className="space-y-3">
            {data.pendingIncoming.map((f) => (
              <FriendRow
                key={f.id}
                friendship={f}
                viewerId={viewerId}
                busy={busy}
                onAccept={(id, scope) => patchFriendship.mutate({ id, action: "accept", shareScope: scope })}
                onDecline={(id) => patchFriendship.mutate({ id, action: "decline" })}
                onRevoke={(id) => patchFriendship.mutate({ id, action: "revoke" })}
                onBlock={(id) => blockFriendship.mutate(id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {viewerId && data?.pendingOutgoing.length ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("pendingOutgoing")}
          </h2>
          <ul className="space-y-3">
            {data.pendingOutgoing.map((f) => (
              <FriendRow
                key={f.id}
                friendship={f}
                viewerId={viewerId}
                busy={busy}
                onAccept={() => {}}
                onDecline={() => {}}
                onRevoke={(id) => patchFriendship.mutate({ id, action: "revoke" })}
                onBlock={(id) => blockFriendship.mutate(id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {viewerId && data?.friends.length ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("friendsList")}
          </h2>
          <ul className="space-y-3">
            {data.friends.map((f) => (
              <FriendRow
                key={f.id}
                friendship={f}
                viewerId={viewerId}
                busy={busy}
                onAccept={() => {}}
                onDecline={() => {}}
                onRevoke={(id) => patchFriendship.mutate({ id, action: "revoke" })}
                onBlock={(id) => blockFriendship.mutate(id)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
