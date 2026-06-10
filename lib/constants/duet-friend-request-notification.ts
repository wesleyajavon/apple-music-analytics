/** Préfixe `source` pour les notifs Duet injectées depuis le serveur (non persistées en localStorage). */
export const DUET_FRIEND_REQUEST_SOURCE_PREFIX = "duet-friend-request:";

export function duetFriendRequestSource(friendshipId: string): string {
  return `${DUET_FRIEND_REQUEST_SOURCE_PREFIX}${friendshipId}`;
}

export function isDuetFriendRequestSource(source: string | undefined): boolean {
  return source?.startsWith(DUET_FRIEND_REQUEST_SOURCE_PREFIX) ?? false;
}

/** Intervalle de rafraîchissement des demandes entrantes (ms). */
export const DUET_PENDING_INCOMING_POLL_MS = 60_000;
