/** Clone current compare query (dates + deep-link entity keys) and set the friend. */
export function buildCompareFriendHref(
  pathname: string,
  currentParams: URLSearchParams,
  friendId: string
): string {
  const params = new URLSearchParams(currentParams.toString());
  params.set("friendUserId", friendId);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
