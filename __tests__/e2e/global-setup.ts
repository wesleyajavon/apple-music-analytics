import { execSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";

/**
 * Ensures the database schema exists before Playwright starts `next dev`.
 * CI pipelines sometimes run e2e without a preceding `prisma migrate deploy`, or
 * the app may connect to a different URL than the migrate step — this keeps
 * migrations tied to the same process env as the test run.
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

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
}
