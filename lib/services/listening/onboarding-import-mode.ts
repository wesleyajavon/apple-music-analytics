export type OnboardingImportProvider = "spotify" | "apple";

export type OnboardingImportMode = "full" | "incremental";

export function parseOnboardingImportMode(raw: unknown): OnboardingImportMode {
  if (raw === "incremental") return "incremental";
  return "full";
}

export function isOnboardingImportMode(raw: string): raw is OnboardingImportMode {
  return raw === "full" || raw === "incremental";
}
