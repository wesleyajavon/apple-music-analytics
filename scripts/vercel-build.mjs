/**
 * Production build entry: on Vercel, apply pending Prisma migrations before
 * generating the client and running `next build`. Locally / CI, `migrate deploy`
 * is skipped so DATABASE_URL in .env does not accidentally migrate prod.
 *
 * Migrations prefer a non-pooled / direct Postgres URL (Neon pooler + PgBouncer
 * break advisory locks → Prisma P1002). Same pattern as `__tests__/e2e/global-setup.ts`.
 *
 * @see https://vercel.com/docs/projects/environment-variables/system-environment-variables
 * @see https://pris.ly/d/migrate-advisory-locking
 */
import { execSync } from "node:child_process";

const MIGRATE_RETRYABLE_PATTERNS = [
  "Error: P1002",
  "Timed out trying to acquire a postgres advisory lock",
];

function run(cmd, env = process.env) {
  execSync(cmd, { stdio: "inherit", env });
}

function isRetryableMigrateError(message) {
  return MIGRATE_RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

function resolveMigrateDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_DIRECT_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DIRECT_URL,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function runPrismaMigrateDeployWithRetry(env) {
  const maxAttempts = Number(process.env.VERCEL_MIGRATE_DEPLOY_MAX_ATTEMPTS ?? 4);
  const baseDelayMs = Number(process.env.VERCEL_MIGRATE_DEPLOY_RETRY_DELAY_MS ?? 2000);

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      run("npx prisma migrate deploy", env);
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
        `[build] prisma migrate deploy retry ${attempt}/${maxAttempts} after ${delayMs}ms (${message.slice(0, 240)})`
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

const onVercel = process.env.VERCEL === "1";

if (onVercel) {
  const migrateEnv = { ...process.env };
  const directUrl = resolveMigrateDatabaseUrl();
  if (directUrl) {
    console.info(
      "[build] Vercel: running prisma migrate deploy with non-pooled DATABASE_URL…"
    );
    migrateEnv.DATABASE_URL = directUrl;
  } else {
    console.warn(
      "[build] Vercel: no DATABASE_DIRECT_URL / POSTGRES_URL_NON_POOLING / DIRECT_URL — migrate uses DATABASE_URL (pooler URLs often cause P1002)."
    );
    console.info("[build] Vercel: running prisma migrate deploy…");
  }
  runPrismaMigrateDeployWithRetry(migrateEnv);
} else {
  console.info(
    "[build] Skipping prisma migrate deploy (not on Vercel). For a local prod-like build, run: npm run db:migrate && npm run build:app"
  );
}

run("npx prisma generate");
run("npm run docs:api:copy");
run("npx next build");
