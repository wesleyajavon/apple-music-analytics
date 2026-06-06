import {
  getConfiguredPublicProfileUserId,
  isUuidString,
  withPublicDemoUserId,
} from "@/lib/constants/public-profile";
import { hasPublicProfileOptIn } from "@/lib/services/user/privacy-preferences";

export async function resolveActivePublicProfileUserId(): Promise<string | null> {
  const configured = getConfiguredPublicProfileUserId();
  if (!configured) return null;
  const optedIn = await hasPublicProfileOptIn(configured);
  return optedIn ? configured : null;
}

export async function isActivePublicProfileUserId(userId: string): Promise<boolean> {
  if (!isUuidString(userId)) return false;
  const active = await resolveActivePublicProfileUserId();
  return active !== null && active === userId;
}

/** Dashboard overview path for the optional public demo, resolved on the server. */
export async function resolvePublicDemoOverviewPath(): Promise<string | null> {
  const userId = await resolveActivePublicProfileUserId();
  if (!userId) return null;
  return withPublicDemoUserId("/dashboard/overview", userId);
}
