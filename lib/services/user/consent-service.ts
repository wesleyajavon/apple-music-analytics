import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function hashIp(request?: NextRequest): string | null {
  if (!request) return null;
  const xff = request.headers.get("x-forwarded-for");
  const ip =
    xff?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip, "utf8").digest("hex").slice(0, 24);
}

export type RecordConsentInput = {
  userId?: string | null;
  anonymousId?: string | null;
  consentType: string;
  consentVersion: string;
  granted: boolean;
  categories?: Record<string, boolean> | null;
  request?: NextRequest;
};

export async function recordUserConsent(input: RecordConsentInput) {
  const userAgent = input.request?.headers.get("user-agent")?.slice(0, 512) ?? null;

  try {
    return await prisma.userConsent.create({
    data: {
      userId: input.userId ?? null,
      anonymousId: input.anonymousId ?? null,
      consentType: input.consentType,
      consentVersion: input.consentVersion,
      granted: input.granted,
      categories: input.categories ?? undefined,
      ipHash: hashIp(input.request),
      userAgent,
    },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      throw new Error("USER_CONSENT_TABLE_MISSING");
    }
    throw error;
  }
}
