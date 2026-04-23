/**
 * Production build entry: on Vercel, apply pending Prisma migrations before
 * generating the client and running `next build`. Locally / CI, `migrate deploy`
 * is skipped so DATABASE_URL in .env does not accidentally migrate prod.
 *
 * @see https://vercel.com/docs/projects/environment-variables/system-environment-variables
 */
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

const onVercel = process.env.VERCEL === "1";

if (onVercel) {
  console.info("[build] Vercel: running prisma migrate deploy…");
  run("npx prisma migrate deploy");
} else {
  console.info(
    "[build] Skipping prisma migrate deploy (not on Vercel). For a local prod-like build, run: npm run db:migrate && npm run build:app"
  );
}

run("npx prisma generate");
run("npm run docs:api:copy");
run("npx next build");
