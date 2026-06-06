import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  GROQ_GENRE_CONSENT_VERSION,
  PUBLIC_PROFILE_CONSENT_VERSION,
} from "@/lib/constants/legal-consent";
import { getConfiguredPublicProfileUserId } from "@/lib/constants/public-profile";
import { recordUserConsent } from "@/lib/services/user/consent-service";

export const PRIVACY_CONSENT_TYPES = {
  groqGenre: "groq_genre",
  publicProfile: "public_profile",
} as const;

function isMissingConsentTable(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

export async function getLatestUserConsent(
  userId: string,
  consentType: string
): Promise<{ granted: boolean; createdAt: Date } | null> {
  try {
    return await prisma.userConsent.findFirst({
      where: { userId, consentType },
      orderBy: { createdAt: "desc" },
      select: { granted: true, createdAt: true },
    });
  } catch (error) {
    if (isMissingConsentTable(error)) return null;
    throw error;
  }
}

/** Grandfather users who started Groq backfill before consent tracking existed. */
export async function hasGroqGenreConsent(userId: string): Promise<boolean> {
  const latest = await getLatestUserConsent(userId, PRIVACY_CONSENT_TYPES.groqGenre);
  if (latest) return latest.granted;

  try {
    const priorJob = await prisma.importGenreBackfillJob.findFirst({
      where: { userId, provider: "groq" },
      select: { id: true },
    });
    return priorJob != null;
  } catch (error) {
    if (isMissingConsentTable(error)) return false;
    throw error;
  }
}

export async function hasPublicProfileOptIn(userId: string): Promise<boolean> {
  const latest = await getLatestUserConsent(
    userId,
    PRIVACY_CONSENT_TYPES.publicProfile
  );
  return latest?.granted === true;
}

export function isPublicProfileEligible(userId: string): boolean {
  const configured = getConfiguredPublicProfileUserId();
  return configured !== null && configured === userId;
}

export async function cancelActiveGroqImportJobs(userId: string): Promise<number> {
  const result = await prisma.importGenreBackfillJob.updateMany({
    where: {
      userId,
      provider: "groq",
      status: { in: ["pending", "running", "paused"] },
    },
    data: { status: "cancelled", finishedAt: new Date() },
  });
  return result.count;
}

export async function hasActiveGroqImportJob(userId: string): Promise<boolean> {
  const job = await prisma.importGenreBackfillJob.findFirst({
    where: {
      userId,
      provider: "groq",
      status: { in: ["pending", "running", "paused"] },
    },
    select: { id: true },
  });
  return job != null;
}

export async function grantGroqGenreConsent(
  userId: string,
  request?: NextRequest
): Promise<void> {
  await recordUserConsent({
    userId,
    consentType: PRIVACY_CONSENT_TYPES.groqGenre,
    consentVersion: GROQ_GENRE_CONSENT_VERSION,
    granted: true,
    request,
  });
}

export async function revokeGroqGenreConsent(
  userId: string,
  request?: NextRequest
): Promise<{ jobsCancelled: number }> {
  await recordUserConsent({
    userId,
    consentType: PRIVACY_CONSENT_TYPES.groqGenre,
    consentVersion: GROQ_GENRE_CONSENT_VERSION,
    granted: false,
    request,
  });
  const jobsCancelled = await cancelActiveGroqImportJobs(userId);
  return { jobsCancelled };
}

export async function setPublicProfileOptIn(
  userId: string,
  granted: boolean,
  request?: NextRequest
): Promise<void> {
  if (!isPublicProfileEligible(userId)) {
    throw new Error("PUBLIC_PROFILE_NOT_ELIGIBLE");
  }
  await recordUserConsent({
    userId,
    consentType: PRIVACY_CONSENT_TYPES.publicProfile,
    consentVersion: PUBLIC_PROFILE_CONSENT_VERSION,
    granted,
    request,
  });
}

export async function getPrivacyPreferences(userId: string) {
  const [groqGranted, publicGranted, groqJobActive] = await Promise.all([
    hasGroqGenreConsent(userId),
    hasPublicProfileOptIn(userId),
    hasActiveGroqImportJob(userId),
  ]);

  return {
    groqGenreConsent: { granted: groqGranted },
    publicProfile: {
      eligible: isPublicProfileEligible(userId),
      granted: publicGranted,
    },
    groqJobActive,
  };
}

export async function isGroqGenreConsentRevoked(userId: string): Promise<boolean> {
  const latest = await getLatestUserConsent(userId, PRIVACY_CONSENT_TYPES.groqGenre);
  return latest?.granted === false;
}

export async function assertGroqGenreConsent(userId: string): Promise<void> {
  const granted = await hasGroqGenreConsent(userId);
  if (!granted) {
    throw new Error("GROQ_GENRE_CONSENT_REQUIRED");
  }
}
