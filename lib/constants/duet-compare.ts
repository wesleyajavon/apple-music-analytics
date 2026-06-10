/** Max compare window when listen volume exceeds {@link DUET_CLAMP_LISTEN_THRESHOLD}. */
export const DUET_MAX_COMPARE_RANGE_MS = 2 * 365.25 * 24 * 60 * 60 * 1000;

/** Above this count in the requested range, clamp to {@link DUET_MAX_COMPARE_RANGE_MS}. */
export const DUET_CLAMP_LISTEN_THRESHOLD = 50_000;

/** Pool size per user when computing shared top artists (intersection). */
export const DUET_SHARED_TOP_POOL = 50;

/** Max shared artists returned to the client. */
export const DUET_SHARED_TOP_LIMIT = 20;
