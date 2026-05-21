import type { SupabaseClient } from "@supabase/supabase-js";

function stripRecoveryParamsFromUrl() {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.hash = "";
  cleanUrl.searchParams.delete("code");
  cleanUrl.searchParams.delete("token_hash");
  cleanUrl.searchParams.delete("type");
  window.history.replaceState(null, "", cleanUrl.pathname + cleanUrl.search);
}

/**
 * Establishes a Supabase session after a password-reset email link.
 * Handles implicit-flow hash tokens, custom `token_hash` query params, PKCE `code`, and existing cookies.
 */
export async function establishPasswordRecoverySession(
  supabase: SupabaseClient
): Promise<boolean> {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const type = hashParams.get("type");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (type === "recovery" && accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      stripRecoveryParamsFromUrl();
      return Boolean(!error && data.session);
    }
  }

  const searchParams = new URLSearchParams(window.location.search);
  const tokenHash = searchParams.get("token_hash");
  const recoveryType = searchParams.get("type");

  if (tokenHash && recoveryType === "recovery") {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    stripRecoveryParamsFromUrl();
    return Boolean(!error && data.session);
  }

  const code = searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    stripRecoveryParamsFromUrl();
    return Boolean(!error && data.session);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
