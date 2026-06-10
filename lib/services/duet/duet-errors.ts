export const DUET_ERROR_CODES = {
  INVALID_EMAIL: "INVALID_EMAIL",
  SELF_INVITE: "SELF_INVITE",
  ADDRESSEE_NOT_FOUND: "ADDRESSEE_NOT_FOUND",
  FRIEND_REQUESTS_DISABLED: "FRIEND_REQUESTS_DISABLED",
  FRIEND_LIMIT_REACHED: "FRIEND_LIMIT_REACHED",
  INVITE_QUOTA_EXCEEDED: "INVITE_QUOTA_EXCEEDED",
  DUPLICATE_INVITE: "DUPLICATE_INVITE",
  INVERSE_PENDING: "INVERSE_PENDING",
  ALREADY_FRIENDS: "ALREADY_FRIENDS",
  BLOCKED: "BLOCKED",
  FRIENDSHIP_NOT_FOUND: "FRIENDSHIP_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INVALID_SHARE_SCOPE: "INVALID_SHARE_SCOPE",
  SELF_ACTION: "SELF_ACTION",
} as const;

export type DuetErrorCode = (typeof DUET_ERROR_CODES)[keyof typeof DUET_ERROR_CODES];

export class DuetServiceError extends Error {
  readonly code: DuetErrorCode;

  constructor(code: DuetErrorCode, message?: string) {
    super(message ?? code);
    this.name = "DuetServiceError";
    this.code = code;
  }
}

export function isDuetServiceError(error: unknown): error is DuetServiceError {
  return error instanceof DuetServiceError;
}
