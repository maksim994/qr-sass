-- Additive only: old credentials and printed QR contents are untouched.
ALTER TABLE "QrCode" ADD COLUMN IF NOT EXISTS "creationSource" TEXT;
CREATE TABLE IF NOT EXISTS "QrApiKey" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "rateLimit" INTEGER NOT NULL DEFAULT 60,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "windowStartedAt" TIMESTAMP(3),
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QrApiKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QrApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QrApiKey_rateLimit_check" CHECK ("rateLimit" BETWEEN 1 AND 120)
);
CREATE UNIQUE INDEX IF NOT EXISTS "QrApiKey_keyHash_key" ON "QrApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "QrApiKey_workspaceId_createdAt_idx" ON "QrApiKey"("workspaceId", "createdAt");
