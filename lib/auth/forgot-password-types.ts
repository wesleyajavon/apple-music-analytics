export type ForgotPasswordOutcome = "email_sent" | "oauth_only";

export type ForgotPasswordResponse = {
  outcome: ForgotPasswordOutcome;
  providers?: Array<"google" | "spotify">;
};
