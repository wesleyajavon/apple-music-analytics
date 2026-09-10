"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SEARCH_FIELD,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { UserAvatar } from "@/lib/components/user-avatar";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import { DuetMobileSubNav } from "@/lib/components/duet/duet-mobile-sub-nav";
import { DuetShareScopePicker } from "@/lib/components/duet/duet-share-scope-picker";
import type { DuetFriendsSection } from "@/lib/constants/duet-friends";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import type { FriendshipDto } from "@/lib/dto/duet";
import type { DuetShareScopeOption } from "@/lib/hooks/use-duet";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";

const MOBILE_BLEED =
  "space-y-6 pb-8 lg:hidden max-lg:pb-[max(2rem,calc(var(--dashboard-bottom-nav-offset,0px)+5.75rem))]";

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

function SignalCell({
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
      className={`${DASHBOARD_METRIC_CELL} min-w-0 text-left transition-colors ${
        selected ? "text-foreground" : "text-muted"
      }`}
    >
      <p className={`${DASHBOARD_METRIC_VALUE} text-xl`}>{value}</p>
      <p className={DASHBOARD_METRIC_LABEL}>{label}</p>
    </button>
  );
}

function HeroFrame({
  locale,
  heading,
  description,
  children,
}: {
  locale: string;
  heading: string;
  description?: string;
  children?: ReactNode;
}) {
  const { startDate, endDate } = useListenDateRange();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <MusicalProfilePeriodBadge
          startDate={startDate}
          endDate={endDate}
          locale={locale}
          variant="mobile"
          className="min-w-0"
        />
      </div>
      <OverviewHeroFrame compact title={heading} description={description}>
        {children}
      </OverviewHeroFrame>
    </div>
  );
}

export function DuetFriendsMobileSkeleton({ locale }: { locale: string }) {
  const t = useTranslations("duet.friends.mobile");

  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <HeroFrame locale={locale} heading={t("title")}>
        <div className="mt-4 h-11 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-white/10" />
      </HeroFrame>
      <section className={`${DASHBOARD_METRIC_STRIP} px-1`} aria-hidden>
        {[0, 1, 2].map((item) => (
          <div key={item} className={DASHBOARD_METRIC_CELL}>
            <div className="h-7 w-10 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
            <div className="mt-2 h-3 w-14 animate-pulse rounded bg-slate-200/60 dark:bg-white/5" />
          </div>
        ))}
      </section>
      <section aria-hidden>
        {[0, 1, 2].map((item) => (
          <div key={item} className={`h-11 animate-pulse bg-slate-200/70 dark:bg-white/10 ${DASHBOARD_LIST_SEPARATOR}`} />
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
      <HeroFrame locale={locale} heading={t("title")} description={t("errorLead")}>
        <button type="button" onClick={onRetry} className={`${DASHBOARD_BTN_GHOST} mt-4 w-full text-foreground`}>
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
    <div className={MOBILE_BLEED}>
      <HeroFrame locale={locale} heading={t("gatedTitle")} description={t("gatedLead")}>
        <div className="mt-4 space-y-4">
          <DuetMobileSubNav current="friends" withFilters={withFilters} />
          <Link href="/sign-in" className={`${DASHBOARD_BTN_GHOST} w-full no-underline text-foreground`}>
            {t("gatedCta")}
          </Link>
        </div>
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
  hrefForMusic,
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
  hrefForMusic: (friendId: string) => string;
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
        <div className="mt-4">
          <DuetMobileSubNav current="friends" withFilters={withFilters} />
        </div>
      </HeroFrame>

      <section className={DASHBOARD_METRIC_STRIP} aria-label={tm("railLabel")}>
        <SignalCell
          label={tm("railFriends")}
          value={String(counts.friends)}
          selected={listSection === "friends"}
          onSelect={() => onSectionChange("friends")}
        />
        <SignalCell
          label={tm("railIncoming")}
          value={String(counts.pendingIncoming)}
          selected={listSection === "incoming"}
          onSelect={() => onSectionChange("incoming")}
        />
        <SignalCell
          label={tm("railOutgoing")}
          value={String(counts.pendingOutgoing)}
          selected={listSection === "outgoing"}
          onSelect={() => onSectionChange("outgoing")}
        />
      </section>

      <section>
        <div
          role="tablist"
          aria-label={tm("listNavLabel")}
          className={`${DASHBOARD_SEGMENTED_TRACK} w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
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
                className={`${selected ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL} gap-2`}
              >
                {label}
                {count > 0 ? <span className="tabular-nums text-[12px]">{count > 99 ? "99+" : count}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className={`${DASHBOARD_SECTION_EYEBROW} mb-2`}>
          {listSection === "incoming"
            ? tm("listTitleIncoming")
            : listSection === "outgoing"
              ? tm("listTitleOutgoing")
              : tm("listTitleFriends")}
        </h2>
        {list.total === 0 ? (
          <p className="py-4 text-sm leading-6 text-muted">
            {listSection === "incoming"
              ? t("emptyIncoming")
              : listSection === "outgoing"
                ? t("emptyOutgoing")
                : tm("emptyLead")}
          </p>
        ) : (
          <ul>
            {list.items.map((friendship) => {
              const peer = getPeer(friendship, viewerId);
              const displayName = getDuetDisplayName(peer);
              const isIncoming = friendship.direction === "incoming" && friendship.status === "pending";
              const isOutgoing = friendship.direction === "outgoing" && friendship.status === "pending";
              return (
                <li key={friendship.id} className={DASHBOARD_LIST_SEPARATOR}>
                  <div className={`${DASHBOARD_LIST_ROW}`}>
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
                      <span className="block truncate text-[15px] font-semibold text-foreground">{displayName}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted">
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
                          className={`${DASHBOARD_BTN_GHOST} px-3 text-foreground disabled:opacity-50`}
                        >
                          {t("accept")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => mutations.onDecline(friendship.id)}
                          className={`${DASHBOARD_BTN_GHOST} px-3 disabled:opacity-50`}
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
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={list.page === 1}
              onClick={() => onPageChange(list.page - 1)}
              className={`${DASHBOARD_BTN_GHOST} flex-1 disabled:opacity-40`}
            >
              {t("paginationPrevious")}
            </button>
            <button
              type="button"
              disabled={!list.hasMore}
              onClick={() => onPageChange(list.page + 1)}
              className={`${DASHBOARD_BTN_GHOST} flex-1 disabled:opacity-40`}
            >
              {t("paginationNext")}
            </button>
          </div>
        ) : null}
      </section>

      <div
        className="fixed inset-x-0 z-[19] border-t border-glass-hairline bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{ bottom: `var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR}, 0px)` }}
      >
        <button
          type="button"
          onClick={openInvite}
          className={`${DASHBOARD_BTN_GHOST} w-full text-foreground`}
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
              className={DASHBOARD_SEARCH_FIELD}
            />
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className={`${DASHBOARD_BTN_GHOST} w-full text-foreground disabled:opacity-50`}
            >
              {t("inviteSubmit")}
            </button>
          </form>
          {inviteFeedback ? (
            <p className={`mt-3 text-sm ${inviteFeedbackError ? "text-red-600" : "text-emerald-600"}`}>
              {inviteFeedback}
            </p>
          ) : null}
          <div className="mt-5 border-t border-glass-hairline pt-4">
            <p className="text-sm leading-6 text-muted">{t("inviteLinkDescription")}</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onCreateInviteLink}
                className={`${DASHBOARD_BTN_GHOST} w-full disabled:opacity-50`}
              >
                {t("inviteLinkGenerate")}
              </button>
              {inviteLinkUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onCopyInviteLink}
                  className={`${DASHBOARD_BTN_GHOST} w-full text-foreground disabled:opacity-50`}
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
              <DuetShareScopePicker
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
                className={`${DASHBOARD_BTN_GHOST} w-full text-foreground disabled:opacity-50`}
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
                  <DuetShareScopePicker
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
                    className={`${DASHBOARD_BTN_GHOST} w-full no-underline text-foreground`}
                  >
                    {t("compare")}
                  </Link>
                  <Link
                    href={hrefForMusic(getPeer(actionTarget, viewerId).id)}
                    className={`${DASHBOARD_BTN_GHOST} w-full no-underline`}
                  >
                    {t("seeMusic")}
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      mutations.onRevoke(actionTarget.id);
                      setActionTarget(null);
                    }}
                    className={`${DASHBOARD_BTN_GHOST} w-full disabled:opacity-50`}
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
