import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { AppError, ErrorCodes } from "@/lib/utils/error-handler";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;

function getRawKey(): Buffer {
  const raw = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new AppError(
      503,
      "SPOTIFY_TOKEN_ENCRYPTION_KEY is not configured",
      ErrorCodes.INTERNAL_SERVER_ERROR
    );
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) return b64;
  throw new AppError(
    503,
    "SPOTIFY_TOKEN_ENCRYPTION_KEY must be 64 hex chars or 32-byte base64",
    ErrorCodes.INTERNAL_SERVER_ERROR
  );
}

export function encryptSpotifySecret(plaintext: string): string {
  const key = getRawKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSpotifySecret(blob: string): string {
  const key = getRawKey();
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new AppError(500, "Invalid encrypted blob", ErrorCodes.INTERNAL_SERVER_ERROR);
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isSpotifyTokenEncryptionConfigured(): boolean {
  const raw = process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return false;
  try {
    if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex").length === 32;
    const b64 = Buffer.from(raw, "base64");
    return b64.length === 32;
  } catch {
    return false;
  }
}
