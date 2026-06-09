import type { NextRequest } from "next/server";
import { TERMS_CONSENT_VERSION } from "@/lib/constants/legal-consent";
import { isGrantedConsentCurrent } from "@/lib/services/user/consent-version";
import { recordUserConsent } from "@/lib/services/user/consent-service";
import { getLatestUserConsent } from "@/lib/services/user/privacy-preferences";
import { logger } from "@/lib/utils/logger";

const TERMS_CONSENT_TYPE = "terms";

/** Idempotent: records terms acceptance once per user after a confirmed session exists. */
export async function recordTermsConsentIfNeeded(
  userId: string,
  request?: NextRequest
): Promise<void> {
  try {
    const existing = await getLatestUserConsent(userId, TERMS_CONSENT_TYPE);
    if (isGrantedConsentCurrent(existing, TERMS_CONSENT_VERSION)) return;

    await recordUserConsent({
      userId,
      consentType: TERMS_CONSENT_TYPE,
      consentVersion: TERMS_CONSENT_VERSION,
      granted: true,
      request,
    });
  } catch (error) {
    logger.warn("Failed to record terms consent", {
      userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
