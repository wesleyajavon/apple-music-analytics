"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { UserAvatar } from "@/lib/components/user-avatar";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import { DuetMobileSubNav } from "@/lib/components/duet/duet-mobile-sub-nav";
import type { DuetFriendsSection } from "@/lib/constants/duet-friends";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import type { FriendshipDto } from "@/lib/dto/duet";
import type { DuetShareScopeOption } from "@/lib/hooks/use-duet";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";

const MOBILE_BLEED =
  "-mx-4 -mt-4 space-y-4 lg:hidden max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+5.75rem))]";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

type PaginatedFriends = {
  items: FriendshipDto[];
  total: number;
  totalPages: number;
  page: number;
  hasMore: boolean;
};

type MutationHandlers = {
  onAccept: (id: string, scope: DuetShareScopeOption) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
  onUpdateShareScope: (id: string, scope: DuetShareScopeOption) => void;
  onBlock: (id: string) => void;
};

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getPeer(friendship: FriendshipDto, viewerId: string) {
  return friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
}

function SignalTile({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-w-[9.75rem] snap-start rounded-3xl border p-4 text-left text-white shadow-lg shadow-black/10 ${
        selected ? "border-white/40 bg-gray-900" : "border-card-border bg-gray-950"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </button>
  );
}

function HeroFrame({
  locale,
  heading,
  children,
}: {
  locale: string;
  heading: string;
  children?: ReactNode;
}) {
  const t = useTranslations("duet.friends.mobile");
  const { startDate, endDate } = useListenDateRange();

  return (
    <section className={HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-4">
        <div className="flex justify-end">
          <MusicalProfilePeriodBadge
            startDate={startDate}
            endDate={endDate}
            locale={locale}
            variant="mobile"
            className="min-w-0"
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 max-w-[16rem] text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {heading}
          </h1>
        </div>
        {children}
      </div>
    </section>
  );
}

function ShareScopePicker({
  groupName,
  value,
  onChange,
  disabled,
}: {
  groupName: string;
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
  ];

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 text-sm font-semibold text-foreground">{tAccept("sharePrompt")}</legend>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 ${
              selected
                ? "border-violet-400/80 bg-violet-50 dark:bg-violet-950/55"
                : "border-card-border bg-card-surface"
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
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">{option.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function DuetFriendsMobileSkeleton({ locale }: { locale: string }) {
  const t = useTranslations("duet.friends.mobile");

  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <HeroFrame locale={locale} heading={t("title")}>
        <div className="h-11 animate-pulse rounded-xl bg-white/15" />
      </HeroFrame>
      <section className="px-4">
        <div className={SNAP_RAIL}>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 min-w-[9.75rem] snap-start animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
      <section className="space-y-2 px-4">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </section>
    </div>
  );
}

export function DuetFriendsMobileError({
  locale,
  onRetry,
}: {
  locale: string;
  onRetry: () => void;
}) {
  const t = useTranslations("duet.friends.mobile");
  const tCommon = useTranslations("common");

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={t("title")}>
        <p className="text-sm leading-6 text-white/70">{t("errorLead")}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
        >
          {tCommon("retry")}
        </button>
      </HeroFrame>
    </div>
  );
}

export function DuetFriendsMobileGated({
  locale,
  withFilters,
}: {
  locale: string;
  withFilters: (href: string) => string;
}) {
  const t = useTranslations("duet.friends.mobile");

  return (
    <div className="-mx-4 -mt-4 space-y-4 pb-8 lg:hidden">
      <HeroFrame locale={locale} heading={t("gatedTitle")}>
        <DuetMobileSubNav current="friends" withFilters={withFilters} />
        <p className="max-w-sm text-sm leading-6 text-white/70">{t("gatedLead")}</p>
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 no-underline"
        >
          {t("gatedCta")}
        </Link>
      </HeroFrame>
    </div>
  );
}

export function DuetFriendsMobileExperience({
  locale,
  viewerId,
  activeSection,
  counts,
  incoming,
  outgoing,
  friends,
  busy,
  email,
  onEmailChange,
  onInvite,
  inviteFeedback,
  inviteFeedbackError,
  onCreateInviteLink,
  onCopyInviteLink,
  inviteLinkUrl,
  inviteLinkExpiresAt,
  linkFeedback,
  withFilters,
  onSectionChange,
  onPageChange,
  ...mutations
}: {
  locale: string;
  viewerId: string;
  activeSection: DuetFriendsSection;
  counts: { friends: number; pendingIncoming: number; pendingOutgoing: number };
  incoming: PaginatedFriends;
  outgoing: PaginatedFriends;
  friends: PaginatedFriends;
  busy: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  onInvite: (event: FormEvent) => void;
  inviteFeedback: string | null;
  inviteFeedbackError: boolean;
  onCreateInviteLink: () => void;
  onCopyInviteLink: () => void;
  inviteLinkUrl: string | null;
  inviteLinkExpiresAt: string | null;
  linkFeedback: string | null;
  withFilters: (href: string) => string;
  onSectionChange: (section: DuetFriendsSection) => void;
  onPageChange: (page: number) => void;
} & MutationHandlers) {
  const t = useTranslations("duet.friends");
  const tm = useTranslations("duet.friends.mobile");
  const tCommon = useTranslations("common");
  const inviteTitleId = useId();
  const acceptTitleId = useId();
  const actionsTitleId = useId();
  const [inviteOpen, setInviteOpen] = useState(activeSection === "invite");
  const [acceptTarget, setAcceptTarget] = useState<FriendshipDto | null>(null);
  const [pendingScope, setPendingScope] = useState<DuetShareScopeOption>("aggregates");
  const [actionTarget, setActionTarget] = useState<FriendshipDto | null>(null);

  useEffect(() => {
    if (activeSection === "invite") setInviteOpen(true);
  }, [activeSection]);

  const listSection: Exclude<DuetFriendsSection, "invite"> =
    activeSection === "invite" ? "friends" : activeSection;
  const list =
    listSection === "incoming" ? incoming : listSection === "outgoing" ? outgoing : friends;

  const openInvite = () => {
    onSectionChange("invite");
    setInviteOpen(true);
  };

  return (
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={tm("title")}>
        <DuetMobileSubNav current="friends" withFilters={withFilters} />
      </HeroFrame>

      <section className="px-4" aria-label={tm("railLabel")}>
        <div className={SNAP_RAIL}>
          <SignalTile
            label={tm("railFriends")}
            value={String(counts.friends)}
            selected={listSection === "friends"}
            onSelect={() => onSectionChange("friends")}
          />
          <SignalTile
            label={tm("railIncoming")}
            value={String(counts.pendingIncoming)}
            selected={listSection === "incoming"}
            onSelect={() => onSectionChange("incoming")}
          />
          <SignalTile
            label={tm("railOutgoing")}
            value={String(counts.pendingOutgoing)}
            selected={listSection === "outgoing"}
            onSelect={() => onSectionChange("outgoing")}
          />
        </div>
      </section>

      <section className="px-4">
        <div
          role="tablist"
          aria-label={tm("listNavLabel")}
          className="flex gap-1 overflow-x-auto rounded-2xl border border-card-border bg-card-surface p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(
            [
              ["incoming", t("navIncoming"), counts.pendingIncoming],
              ["outgoing", t("navOutgoing"), counts.pendingOutgoing],
              ["friends", t("navFriends"), counts.friends],
            ] as const
          ).map(([value, label, count]) => {
            const selected = listSection === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSectionChange(value)}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ${
                  selected ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950" : "text-muted"
                }`}
              >
                {label}
                {count > 0 ? <span className="tabular-nums">{count > 99 ? "99+" : count}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2 px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {listSection === "incoming"
            ? tm("listTitleIncoming")
            : listSection === "outgoing"
              ? tm("listTitleOutgoing")
              : tm("listTitleFriends")}
        </h2>
        {list.total === 0 ? (
          <p className="rounded-2xl border border-card-border bg-card-surface px-3.5 py-4 text-sm leading-6 text-muted">
            {listSection === "incoming"
              ? t("emptyIncoming")
              : listSection === "outgoing"
                ? t("emptyOutgoing")
                : tm("emptyLead")}
          </p>
        ) : (
          <ul className="space-y-2">
            {list.items.map((friendship) => {
              const peer = getPeer(friendship, viewerId);
              const displayName = getDuetDisplayName(peer);
              const isIncoming = friendship.direction === "incoming" && friendship.status === "pending";
              const isOutgoing = friendship.direction === "outgoing" && friendship.status === "pending";
              return (
                <li key={friendship.id}>
                  <div className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3 py-2">
                    <UserAvatar name={displayName} src={peer.avatarUrl} size="md" />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        if (isIncoming) {
                          setPendingScope("aggregates");
                          setAcceptTarget(friendship);
                          return;
                        }
                        setActionTarget(friendship);
                      }}
                    >
                      <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {isIncoming
                          ? t("statusIncoming")
                          : isOutgoing
                            ? t("statusPending")
                            : t("statusAccepted")}
                      </span>
                    </button>
                    {isIncoming ? (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setPendingScope("aggregates");
                            setAcceptTarget(friendship);
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 px-3 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-gray-950"
                        >
                          {t("accept")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => mutations.onDecline(friendship.id)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-card-border px-3 text-xs font-semibold text-foreground disabled:opacity-50"
                        >
                          {t("decline")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted"
                        aria-label={tm("openActions")}
                        onClick={() => setActionTarget(friendship)}
                      >
                        <ChevronIcon />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {list.totalPages > 1 ? (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={list.page === 1}
              onClick={() => onPageChange(list.page - 1)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-card-border text-sm font-semibold disabled:opacity-40"
            >
              {t("paginationPrevious")}
            </button>
            <button
              type="button"
              disabled={!list.hasMore}
              onClick={() => onPageChange(list.page + 1)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-card-border text-sm font-semibold disabled:opacity-40"
            >
              {t("paginationNext")}
            </button>
          </div>
        ) : null}
      </section>

      <div
        className="fixed inset-x-0 z-[19] border-t border-card-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{ bottom: `var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR}, 0px)` }}
      >
        <button
          type="button"
          onClick={openInvite}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white shadow-xl shadow-slate-900/15 dark:bg-white dark:text-slate-950"
        >
          {tm("inviteCta")}
        </button>
      </div>

      <MobileBottomSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        ariaLabelledBy={inviteTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <h2 id={inviteTitleId} className="text-lg font-semibold tracking-tight text-foreground">
            {tm("inviteSheetTitle")}
          </h2>
          <form onSubmit={onInvite} className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={t("invitePlaceholder")}
              className="min-h-11 w-full rounded-xl border border-card-border bg-card-surface px-3 text-sm text-foreground"
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-gray-950"
            >
              {t("inviteSubmit")}
            </button>
          </form>
          {inviteFeedback ? (
            <p className={`mt-3 text-sm ${inviteFeedbackError ? "text-red-600" : "text-emerald-600"}`}>
              {inviteFeedback}
            </p>
          ) : null}
          <div className="mt-5 border-t border-card-border pt-4">
            <p className="text-sm leading-6 text-muted">{t("inviteLinkDescription")}</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onCreateInviteLink}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-card-border text-sm font-semibold disabled:opacity-50"
              >
                {t("inviteLinkGenerate")}
              </button>
              {inviteLinkUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onCopyInviteLink}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-gray-950"
                >
                  {t("inviteLinkCopy")}
                </button>
              ) : null}
            </div>
            {inviteLinkUrl ? (
              <p className="mt-3 break-all font-mono text-xs text-muted">{inviteLinkUrl}</p>
            ) : null}
            {inviteLinkExpiresAt ? (
              <p className="mt-2 text-xs text-muted">
                {t("inviteLinkExpires", {
                  date: new Date(inviteLinkExpiresAt).toLocaleString(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
              </p>
            ) : null}
            {linkFeedback ? <p className="mt-2 text-sm text-cyan-700 dark:text-cyan-200">{linkFeedback}</p> : null}
          </div>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={!!acceptTarget}
        onClose={() => setAcceptTarget(null)}
        ariaLabelledBy={acceptTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <h2 id={acceptTitleId} className="text-lg font-semibold tracking-tight text-foreground">
            {tm("acceptSheetTitle")}
          </h2>
          {acceptTarget ? (
            <div className="mt-4 space-y-4">
              <ShareScopePicker
                groupName={`mobile-accept-${acceptTarget.id}`}
                value={pendingScope}
                onChange={setPendingScope}
                disabled={busy}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  mutations.onAccept(acceptTarget.id, pendingScope);
                  setAcceptTarget(null);
                }}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-gray-950"
              >
                {t("accept")}
              </button>
            </div>
          ) : null}
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        ariaLabelledBy={actionsTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <h2 id={actionsTitleId} className="text-lg font-semibold tracking-tight text-foreground">
            {tm("actionsTitle")}
          </h2>
          {actionTarget ? (
            <div className="mt-4 space-y-3">
              {actionTarget.status === "accepted" ? (
                <>
                  <ShareScopePicker
                    groupName={`mobile-friend-${actionTarget.id}`}
                    value={
                      actionTarget.shareScope === "full" || actionTarget.shareScope === "aggregates"
                        ? actionTarget.shareScope
                        : "aggregates"
                    }
                    onChange={(scope) => {
                      if (scope !== actionTarget.shareScope) {
                        mutations.onUpdateShareScope(actionTarget.id, scope);
                      }
                    }}
                    disabled={busy}
                  />
                  <Link
                    href={withFilters(
                      `/dashboard/duet/compare?friendUserId=${encodeURIComponent(getPeer(actionTarget, viewerId).id)}`
                    )}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white no-underline dark:bg-white dark:text-gray-950"
                  >
                    {t("compare")}
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      mutations.onRevoke(actionTarget.id);
                      setActionTarget(null);
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-card-border text-sm font-semibold disabled:opacity-50"
                  >
                    {t("revoke")}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted">{t("pendingOutgoingStatus")}</p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  mutations.onBlock(actionTarget.id);
                  setActionTarget(null);
                }}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-200 text-sm font-semibold text-red-700 disabled:opacity-50 dark:border-red-400/30 dark:text-red-300"
              >
                {t("block")}
              </button>
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                className="inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-muted"
              >
                {tCommon("close")}
              </button>
            </div>
          ) : null}
        </div>
      </MobileBottomSheet>
    </div>
  );
}
