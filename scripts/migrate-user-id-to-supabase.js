#!/usr/bin/env node

/**
 * Migrate legacy Prisma user id to a Supabase auth user id.
 *
 * Usage:
 *   node scripts/migrate-user-id-to-supabase.js \
 *     --fromUserId "legacy_cuid" \
 *     --toSupabaseUserId "uuid-from-supabase" \
 *     --email "user@example.com" \
 *     [--name "Optional Name"] \
 *     [--dry-run]
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const TX_TIMEOUT_MS = 120000;
const TX_MAX_WAIT_MS = 15000;
const LISTEN_BATCH_SIZE = 5000;

function getArg(key) {
  const equalFormat = args.find((arg) => arg.startsWith(`--${key}=`));
  if (equalFormat) return equalFormat.split("=")[1];
  const idx = args.indexOf(`--${key}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function hasFlag(flag) {
  return args.includes(`--${flag}`);
}

function assertUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function renderProgress(label, current, total) {
  const safeTotal = Math.max(total, 1);
  const pct = Math.min(100, Math.round((current / safeTotal) * 100));
  const width = 24;
  const filled = Math.round((pct / 100) * width);
  const bar = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
  process.stdout.write(`\r${label} [${bar}] ${pct}% (${current}/${total})`);
  if (current >= total) process.stdout.write("\n");
}

async function migrateListensInBatches(fromUserId, toSupabaseUserId, totalCount) {
  if (totalCount === 0) {
    console.log("Step 3/5: no listens to migrate.");
    return;
  }

  console.log(`Step 3/5: migrating listens in batches of ${LISTEN_BATCH_SIZE}...`);
  let migrated = 0;
  let lastId = null;

  while (migrated < totalCount) {
    const batch = await prisma.listen.findMany({
      where: {
        userId: fromUserId,
        ...(lastId ? { id: { gt: lastId } } : {}),
      },
      orderBy: { id: "asc" },
      select: { id: true },
      take: LISTEN_BATCH_SIZE,
    });

    if (batch.length === 0) break;

    const ids = batch.map((row) => row.id);
    lastId = ids[ids.length - 1];

    await prisma.listen.updateMany({
      where: { id: { in: ids }, userId: fromUserId },
      data: { userId: toSupabaseUserId },
    });

    migrated += ids.length;
    renderProgress("Listens", migrated, totalCount);
  }
}

async function main() {
  const fromUserId = getArg("fromUserId");
  const toSupabaseUserId = getArg("toSupabaseUserId");
  const email = getArg("email");
  const name = getArg("name");
  const dryRun = hasFlag("dry-run");

  if (!fromUserId || !toSupabaseUserId || !email) {
    console.error("Missing required arguments.");
    process.exit(1);
  }
  if (!assertUuid(toSupabaseUserId)) {
    console.error("--toSupabaseUserId must be a valid UUID.");
    process.exit(1);
  }

  const [fromUser, toUser, listensCount, replayCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromUserId } }),
    prisma.user.findUnique({ where: { id: toSupabaseUserId } }),
    prisma.listen.count({ where: { userId: fromUserId } }),
    prisma.replayYearly.count({ where: { userId: fromUserId } }),
  ]);

  if (!fromUser) {
    console.error(`User not found for --fromUserId: ${fromUserId}`);
    process.exit(1);
  }
  if (toUser) {
    console.error(
      `Target Supabase user id already exists in User table: ${toSupabaseUserId}`
    );
    process.exit(1);
  }

  console.log("Migration plan:");
  console.log(`- from user id: ${fromUserId}`);
  console.log(`- to user id:   ${toSupabaseUserId}`);
  console.log(`- listens to move: ${listensCount}`);
  console.log(`- replay rows to move: ${replayCount}`);
  console.log(`- dry-run: ${dryRun ? "yes" : "no"}`);

  if (dryRun) return;

  console.log("Step 1/5: validating email uniqueness...");
  const userWithEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  // If another user already has this email, we cannot proceed safely.
  if (
    userWithEmail &&
    userWithEmail.id !== fromUserId &&
    userWithEmail.id !== toSupabaseUserId
  ) {
    throw new Error(
      `Email ${email} already belongs to another user (${userWithEmail.id}).`
    );
  }

  // Common case for legacy single-user migration:
  // free the unique email on the old user before creating the Supabase-id user.
  if (userWithEmail && userWithEmail.id === fromUserId) {
    console.log("Step 2/5: freeing legacy email uniqueness...");
    await prisma.user.update({
      where: { id: fromUserId },
      data: { email: null },
    });
  }

  console.log("Step 2/5: creating target Supabase user...");
  await prisma.user.create({
    data: {
      id: toSupabaseUserId,
      email,
      name: name ?? fromUser.name ?? null,
    },
  });

  await migrateListensInBatches(fromUserId, toSupabaseUserId, listensCount);

  console.log("Step 4/5: migrating replay rows...");
  await prisma.$transaction(
    [
      prisma.replayYearly.updateMany({
        where: { userId: fromUserId },
        data: { userId: toSupabaseUserId },
      }),
    ],
    { timeout: TX_TIMEOUT_MS, maxWait: TX_MAX_WAIT_MS }
  );

  console.log("Step 5/5: deleting legacy user...");
  await prisma.user.delete({ where: { id: fromUserId } });

  console.log("Migration completed.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
