"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "motion/react";
import {
  Ban,
  Check,
  Clock,
  Copy,
  Link2,
  Mail,
  Send,
  Shield,
  Swords,
  UserMinus,
  X,
} from "lucide-react";
import { UserAvatar } from "@/lib/components/user-avatar";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { DuetFriendsHero } from "@/lib/components/duet/duet-friends-hero";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_LIME,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME,
  DASHBOARD_SPOTLIGHT_BADGE_CYAN_COMPACT,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_CYAN,
} from "@/lib/constants/dashboard-spotlight";
import { useDuetFriends, useDuetMutations, type DuetShareScopeOption } from "@/lib/hooks/use-duet";
import type { FriendshipDto } from "@/lib/dto/duet";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function SpotlightSectionHeader({
  eyebrow,
  title,
  description,
  badge,
  badgeVariant = "violet",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge: string;
  badgeVariant?: "violet" | "lime" | "cyan";
}) {
  const badgeClass =
    badgeVariant === "lime"
      ? DASHBOARD_SPOTLIGHT_BADGE_LIME
      : badgeVariant === "cyan"
        ? DASHBOARD_SPOTLIGHT_BADGE_CYAN_COMPACT
        : DASHBOARD_SPOTLIGHT_BADGE_VIOLET;
  const dotClass =
    badgeVariant === "lime"
      ? DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME
      : badgeVariant === "cyan"
        ? DASHBOARD_SPOTLIGHT_BADGE_DOT_CYAN
        : DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET;

  return (
    <div className={`relative px-5 pb-5 pt-6 sm:px-8 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
          {description ? (
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{description}</p>
          ) : null}
        </div>
        <span className={badgeClass}>
          <span className={dotClass} aria-hidden />
          {badge}
        </span>
      </div>
    </div>
  );
}

function StatusPill({
  variant,
  children,
}: {
  variant: "incoming" | "outgoing" | "accepted";
  children: ReactNode;
}) {
  const classes =
    variant === "incoming"
      ? "border-amber-200/90 bg-amber-50/90 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
      : variant === "outgoing"
        ? "border-slate-200/90 bg-slate-50/90 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300"
        : "border-emerald-200/90 bg-emerald-50/90 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${classes}`}>
      {children}
    </span>
  );
}

function DuetShareScopeFieldset({
  groupName,
  legend,
  value,
  onChange,
  disabled = false,
}: {
  groupName: string;
  legend: string;
  value: DuetShareScopeOption;
  onChange: (scope: DuetShareScopeOption) => void;
  disabled?: boolean;
}) {
  const tAccept = useTranslations("duet.inviteAccept");

  const options = [
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
  ] satisfies { value: DuetShareScopeOption; label: string; description: string }[];

  return (
    <fieldset className="w-full sm:min-w-[18rem] sm:max-w-sm" disabled={disabled}>
      <legend className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <Shield className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" aria-hidden />
        {legend}
      </legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              } ${
                selected
                  ? "border-violet-400/80 bg-violet-50 shadow-sm dark:border-violet-400/45 dark:bg-violet-950/55"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:bg-slate-900/80"
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected
                    ? "border-violet-600 bg-violet-600 dark:border-violet-400 dark:bg-violet-500"
                    : "border-slate-300 bg-white dark:border-slate-500 dark:bg-slate-800"
                }`}
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-semibold ${
                    selected
                      ? "text-violet-950 dark:text-violet-50"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {option.label}
                </span>
                <span
                  className={`mt-0.5 block text-xs leading-relaxed ${
                    selected
                      ? "text-violet-800/80 dark:text-violet-200/90"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function FriendRow({
  friendship,
  viewerId,
  onAccept,
  onDecline,
  onRevoke,
  onUpdateShareScope,
  onBlock,
  busy,
  index,
}: {
  friendship: FriendshipDto;
  viewerId: string;
  onAccept: (id: string, scope: DuetShareScopeOption) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
  onUpdateShareScope: (id: string, scope: DuetShareScopeOption) => void;
  onBlock: (id: string) => void;
  busy: boolean;
  index: number;
}) {
  const t = useTranslations("duet.friends");
  const tAccept = useTranslations("duet.inviteAccept");
  const peer =
    friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
  const displayName = getDuetDisplayName(peer);
  const [pendingShareScope, setPendingShareScope] = useState<DuetShareScopeOption>("aggregates");
  const activeShareScope =
    friendship.status === "accepted" && friendship.shareScope !== "none"
      ? (friendship.shareScope as DuetShareScopeOption)
      : pendingShareScope;

  const isIncoming = friendship.direction === "incoming" && friendship.status === "pending";
  const isOutgoing = friendship.direction === "outgoing" && friendship.status === "pending";
  const isAccepted = friendship.status === "accepted";

  const cardAccent = isIncoming
    ? "border-amber-200/80 dark:border-amber-400/25"
    : isAccepted
      ? "border-emerald-200/60 hover:border-violet-300/60 dark:border-emerald-400/20 dark:hover:border-violet-400/30"
      : "border-slate-200/80 dark:border-white/10";

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`flex flex-col gap-4 rounded-[1.35rem] border bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-slate-950/60 sm:flex-row sm:items-start sm:justify-between ${cardAccent}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={displayName} src={peer.avatarUrl} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{displayName}</p>
            {isIncoming ? (
              <StatusPill variant="incoming">
                <Clock className="h-3 w-3" aria-hidden />
                {t("statusIncoming")}
              </StatusPill>
            ) : null}
            {isOutgoing ? (
              <StatusPill variant="outgoing">
                <Clock className="h-3 w-3" aria-hidden />
                {t("statusPending")}
              </StatusPill>
            ) : null}
            {isAccepted ? (
              <StatusPill variant="accepted">
                <Check className="h-3 w-3" aria-hidden />
                {t("statusAccepted")}
              </StatusPill>
            ) : null}
          </div>
          {peer.email ? (
            <p className={`mt-0.5 truncate text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{peer.email}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isOutgoing ? (
          <span className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("pendingOutgoingStatus")}</span>
        ) : null}

        {isIncoming ? (
          <>
            <DuetShareScopeFieldset
              groupName={`duet-share-scope-accept-${friendship.id}`}
              legend={tAccept("sharePrompt")}
              value={pendingShareScope}
              onChange={setPendingShareScope}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept(friendship.id, pendingShareScope)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            >
              <Check className="h-4 w-4" aria-hidden />
              {t("accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(friendship.id)}
              className={`inline-flex min-h-10 items-center gap-1.5 ${DASHBOARD_SPOTLIGHT_BTN_SECONDARY}`}
            >
              <X className="h-4 w-4" aria-hidden />
              {t("decline")}
            </button>
          </>
        ) : null}

        {isAccepted ? (
          <div className="flex w-full flex-col gap-3 sm:w-auto">
            <DuetShareScopeFieldset
              groupName={`duet-share-scope-friend-${friendship.id}`}
              legend={t("shareScopeLabel")}
              value={activeShareScope}
              onChange={(scope) => {
                if (scope !== friendship.shareScope) {
                  onUpdateShareScope(friendship.id, scope);
                }
              }}
              disabled={busy}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/duet/compare?friendUserId=${encodeURIComponent(peer.id)}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-violet-500/25 no-underline transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/30"
              >
                <Swords className="h-4 w-4" aria-hidden />
                {t("compare")}
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => onRevoke(friendship.id)}
                className={`inline-flex min-h-10 items-center gap-1.5 ${DASHBOARD_SPOTLIGHT_BTN_SECONDARY}`}
              >
                <UserMinus className="h-4 w-4" aria-hidden />
                {t("revoke")}
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => onBlock(friendship.id)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200/90 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <Ban className="h-4 w-4" aria-hidden />
          {t("block")}
        </button>
      </div>
    </motion.li>
  );
}

function FriendsListSection({
  eyebrow,
  title,
  badge,
  badgeVariant,
  gradient,
  hairline,
  friendships,
  viewerId,
  busy,
  onAccept,
  onDecline,
  onRevoke,
  onUpdateShareScope,
  onBlock,
}: {
  eyebrow: string;
  title: string;
  badge: string;
  badgeVariant: "violet" | "lime" | "cyan";
  gradient: string;
  hairline: string;
  friendships: FriendshipDto[];
  viewerId: string;
  busy: boolean;
  onAccept: (id: string, scope: DuetShareScopeOption) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
  onUpdateShareScope: (id: string, scope: DuetShareScopeOption) => void;
  onBlock: (id: string) => void;
}) {
  if (!friendships.length) return null;

  return (
    <section className={DASHBOARD_SPOTLIGHT_SHELL}>
      <div className={gradient} />
      <div className={hairline} />
      <SpotlightSectionHeader eyebrow={eyebrow} title={title} badge={badge} badgeVariant={badgeVariant} />
      <ul className="space-y-3 px-5 pb-6 sm:px-8">
        {friendships.map((f, index) => (
          <FriendRow
            key={f.id}
            friendship={f}
            viewerId={viewerId}
            busy={busy}
            index={index}
            onAccept={onAccept}
            onDecline={onDecline}
            onRevoke={onRevoke}
            onUpdateShareScope={onUpdateShareScope}
            onBlock={onBlock}
          />
        ))}
      </ul>
    </section>
  );
}

export function DuetFriendsClient() {
  const t = useTranslations("duet.friends");
  const locale = useLocale();
  const { data, isLoading, error, refetch } = useDuetFriends();
  const { invite, patchFriendship, blockFriendship, createInviteLink } = useDuetMutations();
  const [email, setEmail] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [inviteLinkUrl, setInviteLinkUrl] = useState<string | null>(null);
  const [inviteLinkExpiresAt, setInviteLinkExpiresAt] = useState<string | null>(null);
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);

  useEffect(() => {
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data: auth }) => setViewerId(auth.user?.id ?? null));
  }, []);

  const busy =
    invite.isPending ||
    patchFriendship.isPending ||
    blockFriendship.isPending ||
    createInviteLink.isPending;

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setFeedbackError(false);
    try {
      await invite.mutateAsync(email.trim());
      setEmail("");
      setFeedback(t("inviteSent"));
    } catch {
      setFeedback(t("inviteError"));
      setFeedbackError(true);
    }
  }

  async function handleCreateInviteLink() {
    setLinkFeedback(null);
    try {
      const result = await createInviteLink.mutateAsync();
      setInviteLinkUrl(result.url);
      setInviteLinkExpiresAt(result.expiresAt);
      setLinkFeedback(t("inviteLinkGenerated"));
    } catch {
      setLinkFeedback(t("inviteLinkError"));
    }
  }

  async function handleCopyInviteLink() {
    if (!inviteLinkUrl) return;
    try {
      await navigator.clipboard.writeText(inviteLinkUrl);
      setLinkFeedback(t("inviteLinkCopied"));
    } catch {
      setLinkFeedback(t("inviteLinkCopyError"));
    }
  }

  const friendsCount = data?.friends.length ?? 0;
  const pendingIncomingCount = data?.pendingIncoming.length ?? 0;
  const pendingOutgoingCount = data?.pendingOutgoing.length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <DuetFriendsHero
          friendsCount={0}
          pendingIncomingCount={0}
          pendingOutgoingCount={0}
          locale={locale}
        />
        <p className={`text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <DuetFriendsHero
          friendsCount={0}
          pendingIncomingCount={0}
          pendingOutgoingCount={0}
          locale={locale}
        />
        <ErrorState variant="startup" error={error} message={t("error")} onRetry={() => refetch()} />
      </div>
    );
  }

  const hasAny = friendsCount + pendingIncomingCount + pendingOutgoingCount > 0;

  const mutationHandlers = {
    onAccept: (id: string, scope: DuetShareScopeOption) =>
      patchFriendship.mutate({ id, action: "accept", shareScope: scope }),
    onDecline: (id: string) => patchFriendship.mutate({ id, action: "decline" }),
    onRevoke: (id: string) => patchFriendship.mutate({ id, action: "revoke" }),
    onUpdateShareScope: (id: string, scope: DuetShareScopeOption) =>
      patchFriendship.mutate({ id, action: "updateShareScope", shareScope: scope }),
    onBlock: (id: string) => blockFriendship.mutate(id),
  };

  return (
    <div className="space-y-8">
      <DuetFriendsHero
        friendsCount={friendsCount}
        pendingIncomingCount={pendingIncomingCount}
        pendingOutgoingCount={pendingOutgoingCount}
        locale={locale}
      />

      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} />
        <SpotlightSectionHeader
          eyebrow={t("inviteEyebrow")}
          title={t("inviteTitle")}
          description={t("inviteDescription")}
          badge={t("inviteBadge")}
          badgeVariant="cyan"
        />
        <div className="px-5 pb-6 sm:px-8">
          <form onSubmit={handleInvite} className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} flex flex-col gap-3 sm:flex-row sm:items-center`}>
            <div className="relative min-w-0 flex-1">
              <Mail
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("invitePlaceholder")}
                className="min-h-11 w-full rounded-xl border border-slate-200/80 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 shadow-sm focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200/60 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:border-cyan-400/40 dark:focus:ring-cyan-400/20"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Send className="h-4 w-4" aria-hidden />
              {t("inviteSubmit")}
            </button>
          </form>
          {feedback ? (
            <p
              className={`mt-3 text-sm ${feedbackError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
            >
              {feedback}
            </p>
          ) : null}

          <div className="mt-6 border-t border-slate-200/80 pt-6 dark:border-white/10">
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-cyan-600 dark:text-cyan-300" aria-hidden />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("inviteLinkTitle")}</h3>
            </div>
            <p className={`mb-4 text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("inviteLinkDescription")}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCreateInviteLink()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200/90 bg-white px-5 py-2.5 text-sm font-bold text-cyan-800 shadow-sm transition-colors hover:bg-cyan-50 disabled:opacity-50 dark:border-cyan-400/25 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:bg-cyan-500/20"
              >
                <Link2 className="h-4 w-4" aria-hidden />
                {t("inviteLinkGenerate")}
              </button>
              {inviteLinkUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCopyInviteLink()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  {t("inviteLinkCopy")}
                </button>
              ) : null}
            </div>
            {inviteLinkUrl ? (
              <p className="mt-3 break-all rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 font-mono text-xs text-slate-700 dark:border-white/10 dark:bg-black/30 dark:text-slate-200">
                {inviteLinkUrl}
              </p>
            ) : null}
            {inviteLinkExpiresAt ? (
              <p className={`mt-2 flex items-center gap-1.5 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {t("inviteLinkExpires", {
                  date: new Date(inviteLinkExpiresAt).toLocaleString(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </p>
            ) : null}
            {linkFeedback ? (
              <p className="mt-3 text-sm text-cyan-700 dark:text-cyan-200">{linkFeedback}</p>
            ) : null}
          </div>
        </div>
      </section>

      {!hasAny ? (
        <EmptyState variant="startup" message={t("emptyTitle")} description={t("emptyDescription")} />
      ) : null}

      {viewerId && data?.pendingIncoming.length ? (
        <FriendsListSection
          eyebrow={t("incomingEyebrow")}
          title={t("pendingIncoming")}
          badge={t("incomingBadge")}
          badgeVariant="violet"
          gradient={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY}
          hairline={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET}
          friendships={data.pendingIncoming}
          viewerId={viewerId}
          busy={busy}
          {...mutationHandlers}
        />
      ) : null}

      {viewerId && data?.pendingOutgoing.length ? (
        <FriendsListSection
          eyebrow={t("outgoingEyebrow")}
          title={t("pendingOutgoing")}
          badge={t("outgoingBadge")}
          badgeVariant="cyan"
          gradient={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN}
          hairline={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN}
          friendships={data.pendingOutgoing}
          viewerId={viewerId}
          busy={busy}
          {...mutationHandlers}
        />
      ) : null}

      {viewerId && data?.friends.length ? (
        <FriendsListSection
          eyebrow={t("rosterEyebrow")}
          title={t("friendsList")}
          badge={t("rosterBadge")}
          badgeVariant="lime"
          gradient={DASHBOARD_SPOTLIGHT_GRADIENT_LIME}
          hairline={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME}
          friendships={data.friends}
          viewerId={viewerId}
          busy={busy}
          {...mutationHandlers}
        />
      ) : null}
    </div>
  );
}
