-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameLower" TEXT NOT NULL,
    "mbid" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleLower" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "mbid" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'lastfm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_name_key" ON "Artist"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_nameLower_key" ON "Artist"("nameLower");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_mbid_key" ON "Artist"("mbid");

-- CreateIndex
CREATE INDEX "Artist_nameLower_idx" ON "Artist"("nameLower");

-- CreateIndex
CREATE INDEX "Artist_mbid_idx" ON "Artist"("mbid");

-- CreateIndex
CREATE UNIQUE INDEX "Track_mbid_key" ON "Track"("mbid");

-- CreateIndex
CREATE INDEX "Track_artistId_idx" ON "Track"("artistId");

-- CreateIndex
CREATE INDEX "Track_titleLower_idx" ON "Track"("titleLower");

-- CreateIndex
CREATE INDEX "Track_mbid_idx" ON "Track"("mbid");

-- CreateIndex
CREATE UNIQUE INDEX "Track_title_artistId_key" ON "Track"("title", "artistId");

-- CreateIndex
CREATE INDEX "Listen_userId_playedAt_idx" ON "Listen"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "Listen_trackId_playedAt_idx" ON "Listen"("trackId", "playedAt");

-- CreateIndex
CREATE INDEX "Listen_playedAt_idx" ON "Listen"("playedAt");

-- CreateIndex
CREATE INDEX "Listen_userId_trackId_playedAt_idx" ON "Listen"("userId", "trackId", "playedAt");

-- CreateIndex
CREATE INDEX "Listen_source_playedAt_idx" ON "Listen"("source", "playedAt");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listen" ADD CONSTRAINT "Listen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listen" ADD CONSTRAINT "Listen_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

