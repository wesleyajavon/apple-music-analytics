import type { NextRequest } from "next/server";
import {
  DUET_SHARING_CONSENT_TYPE,
  DUET_SHARING_CONSENT_VERSION,
} from "@/lib/constants/legal-consent";
import { recordUserConsent } from "@/lib/services/user/consent-service";

export async function grantDuetSharingConsent(
  userId: string,
  request?: NextRequest
): Promise<void> {
  await recordUserConsent({
    userId,
    consentType: DUET_SHARING_CONSENT_TYPE,
    consentVersion: DUET_SHARING_CONSENT_VERSION,
    granted: true,
    request,
  });
}
