ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "coverImageAlt" TEXT;
CREATE TABLE IF NOT EXISTS "BlogApiToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "salt" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "windowStartedAt" TIMESTAMP(3),
  "requestCount" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogApiToken_keyPrefix_key" ON "BlogApiToken"("keyPrefix");
