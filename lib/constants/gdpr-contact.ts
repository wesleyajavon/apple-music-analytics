/**
 * Optional contact for data-subject requests (GDPR Art. 13–14).
 * Set GDPR_CONTACT_EMAIL in server env (never NEXT_PUBLIC_).
 */
export function getGdprContactEmail(): string | null {
  const raw = process.env.GDPR_CONTACT_EMAIL?.trim();
  if (!raw || !raw.includes("@")) return null;
  return raw;
}
