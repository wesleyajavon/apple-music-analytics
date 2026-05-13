/**
 * Hide the in-app notification UI for anonymous viewers of the public profile demo
 * (`?userId=<public id>`). While auth is still resolving (`undefined`), we hide if the
 * URL matches the public id so the bell does not flash briefly for demo viewers.
 */
export function shouldHideNotificationCenterForPublicDemo(
  publicProfileUserId: string | null,
  userIdFromUrl: string | null,
  authUserId: string | null | undefined
): boolean {
  if (!publicProfileUserId) return false;
  if (userIdFromUrl !== publicProfileUserId) return false;
  if (authUserId === undefined) return true;
  if (authUserId === null) return true;
  return false;
}
