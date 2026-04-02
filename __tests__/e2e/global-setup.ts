import { execSync } from "node:child_process";

/**
 * Ensures the database schema exists before Playwright starts `next dev`.
 * CI pipelines sometimes run e2e without a preceding `prisma migrate deploy`, or
 * the app may connect to a different URL than the migrate step — this keeps
 * migrations tied to the same process env as the test run.
 */
export default async function globalSetup(): Promise<void> {
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

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
}
