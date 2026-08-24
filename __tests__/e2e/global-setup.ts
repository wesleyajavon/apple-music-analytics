import { execSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";

const MIGRATE_RETRYABLE_PATTERNS = [
  "Error: P1002",
  "Timed out trying to acquire a postgres advisory lock",
];

function isRetryableMigrateError(message: string): boolean {
  return MIGRATE_RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

function runPrismaMigrateDeployWithRetry(env: NodeJS.ProcessEnv): void {
  const maxAttempts = Number(process.env.E2E_MIGRATE_DEPLOY_MAX_ATTEMPTS ?? 4);
  const baseDelayMs = Number(process.env.E2E_MIGRATE_DEPLOY_RETRY_DELAY_MS ?? 2000);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env,
      });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const canRetry = isRetryableMigrateError(message) && attempt < maxAttempts;
      if (!canRetry) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[e2e] prisma migrate deploy retry ${attempt}/${maxAttempts} after ${delayMs}ms (${message.slice(0, 240)})`
      );
      execSync(`node -e "setTimeout(() => process.exit(0), ${delayMs})"`, {
        stdio: "ignore",
        env,
      });
    }
  }

  if (lastError) {
    throw lastError;
  }
}

/**
 * Ensures the database schema exists before Playwright starts `next dev`.
 * CI pipelines sometimes run e2e without a preceding `prisma migrate deploy`, or
 * the app may connect to a different URL than the migrate step — this keeps
 * migrations tied to the same process env as the test run.
 * Local skip/webServer env: see `__tests__/README.md` (PLAYWRIGHT_SKIP_WEBSERVER, PLAYWRIGHT_TEST_BASE_URL).
 */
export default async function globalSetup(): Promise<void> {
  // Playwright doesn't automatically load Next.js env files for globalSetup.
  loadEnvConfig(process.cwd());

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    if (process.env.CI) {
      throw new Error(
        "E2E requires DATABASE_URL so Prisma can apply migrations before tests."
      );
    }
    console.warn(
      "[e2e] DATABASE_URL is not set; skipping prisma migrate deploy."
    );
    return;
  }

  const migrateEnv: NodeJS.ProcessEnv = { ...process.env };
  const directUrl = process.env.DATABASE_DIRECT_URL?.trim();
  if (directUrl) {
    // For migration locks, direct Postgres connections are safer than pooler URLs.
    migrateEnv.DATABASE_URL = directUrl;
  }

  runPrismaMigrateDeployWithRetry(migrateEnv);
}
