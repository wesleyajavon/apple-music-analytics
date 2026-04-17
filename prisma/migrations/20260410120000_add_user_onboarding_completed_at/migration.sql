-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

-- Existing accounts: treat onboarding as already done so only new sign-ins see the flow.
UPDATE "User" SET "onboardingCompletedAt" = NOW() WHERE "onboardingCompletedAt" IS NULL;
