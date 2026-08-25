/** Anchor + path for Duet sharing in Settings → Preferences. */
export const DUET_SHARE_SETTINGS_HASH = "settings-duet-sharing";

export const DUET_SHARE_SETTINGS_PATH =
  `/dashboard/settings?view=preferences#${DUET_SHARE_SETTINGS_HASH}` as const;
