-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "consentType" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "categories" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserConsent_userId_consentType_createdAt_idx" ON "UserConsent"("userId", "consentType", "createdAt");

-- CreateIndex
CREATE INDEX "UserConsent_anonymousId_consentType_createdAt_idx" ON "UserConsent"("anonymousId", "consentType", "createdAt");

-- AddForeignKey
ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
