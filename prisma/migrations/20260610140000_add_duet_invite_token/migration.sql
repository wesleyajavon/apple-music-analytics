-- CreateTable
CREATE TABLE "DuetInviteToken" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuetInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuetInviteToken_requesterId_createdAt_idx" ON "DuetInviteToken"("requesterId", "createdAt");

-- CreateIndex
CREATE INDEX "DuetInviteToken_expiresAt_idx" ON "DuetInviteToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "DuetInviteToken" ADD CONSTRAINT "DuetInviteToken_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
