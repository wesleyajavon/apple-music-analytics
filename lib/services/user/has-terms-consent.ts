import { TERMS_CONSENT_VERSION } from "@/lib/constants/legal-consent";
import { isGrantedConsentCurrent } from "@/lib/services/user/consent-version";
import { getLatestUserConsent } from "@/lib/services/user/privacy-preferences";

const TERMS_CONSENT_TYPE = "terms";

export async function hasTermsConsent(userId: string): Promise<boolean> {
  const latest = await getLatestUserConsent(userId, TERMS_CONSENT_TYPE);
  return isGrantedConsentCurrent(latest, TERMS_CONSENT_VERSION);
}
