import { createValidationError } from "@/lib/utils/error-handler";
import { ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS } from "./onboarding-import-constants";
import type { NormalizedListenInput } from "./onboarding-import-types";

export { ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS } from "./onboarding-import-constants";

export type OnboardingImportBatchMeta = {
  index: number;
  count: number;
};

export type OnboardingImportJsonBody = {
  provider: "spotify" | "apple";
  rows: Array<{
    artistName?: unknown;
    trackName?: unknown;
    playedAt?: unknown;
  }>;
  batch?: OnboardingImportBatchMeta;
  /** Sur le dernier lot d’une série : somme des `imported` des lots précédents (sans ce lot). */
  sessionTotalImported?: unknown;
};

function isProvider(s: string): s is "spotify" | "apple" {
  return s === "spotify" || s === "apple";
}

export function parseOnboardingImportJsonBody(
  body: unknown
): {
  provider: "spotify" | "apple";
  rows: NormalizedListenInput[];
  batch: OnboardingImportBatchMeta | null;
  sessionTotalImported: number | null;
} {
  if (!body || typeof body !== "object") {
    throw createValidationError("Invalid JSON body");
  }
  const b = body as OnboardingImportJsonBody;
  if (typeof b.provider !== "string" || !isProvider(b.provider)) {
    throw createValidationError('Invalid or missing "provider" (spotify | apple)');
  }
  if (!Array.isArray(b.rows)) {
    throw createValidationError('Missing or invalid "rows" array');
  }
  if (b.rows.length === 0) {
    throw createValidationError('"rows" must not be empty');
  }
  if (b.rows.length > ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS) {
    throw createValidationError(
      `Too many rows in one batch (max ${ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS})`
    );
  }

  let batch: OnboardingImportBatchMeta | null = null;
  if (b.batch !== undefined) {
    if (!b.batch || typeof b.batch !== "object") {
      throw createValidationError('Invalid "batch"');
    }
    const idx = Number((b.batch as OnboardingImportBatchMeta).index);
    const count = Number((b.batch as OnboardingImportBatchMeta).count);
    if (
      !Number.isInteger(idx) ||
      !Number.isInteger(count) ||
      count < 1 ||
      idx < 0 ||
      idx >= count
    ) {
      throw createValidationError('Invalid "batch.index" / "batch.count"');
    }
    batch = { index: idx, count };
  }

  let sessionTotalImported: number | null = null;
  if (b.sessionTotalImported !== undefined) {
    const n = Number(b.sessionTotalImported);
    if (!Number.isFinite(n) || n < 0) {
      throw createValidationError('Invalid "sessionTotalImported"');
    }
    sessionTotalImported = Math.floor(n);
  }

  const rows: NormalizedListenInput[] = [];
  for (let i = 0; i < b.rows.length; i++) {
    const r = b.rows[i]!;
    const artistName =
      typeof r.artistName === "string" ? r.artistName.trim() : "";
    const trackName = typeof r.trackName === "string" ? r.trackName.trim() : "";
    const playedRaw = r.playedAt;
    if (!artistName || !trackName) {
      throw createValidationError(`Row ${i + 1}: missing artist or track name`);
    }
    if (typeof playedRaw !== "string") {
      throw createValidationError(`Row ${i + 1}: invalid playedAt`);
    }
    const playedAt = new Date(playedRaw);
    if (Number.isNaN(playedAt.getTime())) {
      throw createValidationError(`Row ${i + 1}: invalid playedAt`);
    }
    rows.push({ artistName, trackName, playedAt });
  }

  return { provider: b.provider, rows, batch, sessionTotalImported };
}
