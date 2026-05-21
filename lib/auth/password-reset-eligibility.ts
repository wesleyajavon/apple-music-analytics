import type { User } from "@supabase/supabase-js";

export type OAuthSignInProvider = "google" | "spotify";

const OAUTH_PROVIDERS: ReadonlySet<string> = new Set(["google", "spotify"]);

export function getOAuthSignInProviders(user: User): OAuthSignInProvider[] {
  const providers = new Set<OAuthSignInProvider>();

  for (const identity of user.identities ?? []) {
    if (identity.provider === "google") {
      providers.add("google");
    }
    if (identity.provider === "spotify") {
      providers.add("spotify");
    }
  }

  return [...providers];
}

export function hasEmailPasswordIdentity(user: User): boolean {
  return (user.identities ?? []).some((identity) => identity.provider === "email");
}

/** Account created via OAuth only (no email/password identity). */
export function isOAuthOnlyAccount(user: User): boolean {
  const oauthProviders = getOAuthSignInProviders(user);
  return oauthProviders.length > 0 && !hasEmailPasswordIdentity(user);
}
