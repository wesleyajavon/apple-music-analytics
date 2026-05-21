import { describe, it, expect } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  getOAuthSignInProviders,
  hasEmailPasswordIdentity,
  isOAuthOnlyAccount,
} from "@/lib/auth/password-reset-eligibility";

function userWithProviders(providers: string[]): User {
  return {
    id: "user-1",
    identities: providers.map((provider) => ({
      id: `${provider}-id`,
      user_id: "user-1",
      provider,
      identity_data: {},
      created_at: "",
      updated_at: "",
      last_sign_in_at: "",
    })),
  } as User;
}

describe("password-reset-eligibility", () => {
  it("detects email/password account", () => {
    const user = userWithProviders(["email"]);
    expect(hasEmailPasswordIdentity(user)).toBe(true);
    expect(isOAuthOnlyAccount(user)).toBe(false);
  });

  it("detects OAuth-only Google account", () => {
    const user = userWithProviders(["google"]);
    expect(getOAuthSignInProviders(user)).toEqual(["google"]);
    expect(isOAuthOnlyAccount(user)).toBe(true);
  });

  it("detects OAuth-only Spotify account", () => {
    const user = userWithProviders(["spotify"]);
    expect(getOAuthSignInProviders(user)).toEqual(["spotify"]);
    expect(isOAuthOnlyAccount(user)).toBe(true);
  });

  it("allows reset when email and OAuth are linked", () => {
    const user = userWithProviders(["email", "google"]);
    expect(isOAuthOnlyAccount(user)).toBe(false);
    expect(getOAuthSignInProviders(user)).toEqual(["google"]);
  });
});
