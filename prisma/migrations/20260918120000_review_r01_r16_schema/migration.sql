-- Additive, idempotent upgrade for databases previously synced with db push.
-- Does not drop tables or rewrite short codes, destinations, users or payments.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "planId" "WorkspacePlan";
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "analyticsPurgedAt" TIMESTAMP(3);
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "analyticsPurgeUpdated" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ScanEvent'
      AND column_name = 'scannedAt'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE "ScanEvent"
      ALTER COLUMN "scannedAt" TYPE TIMESTAMPTZ(3)
      USING "scannedAt" AT TIME ZONE 'UTC';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BillingEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "paymentId" TEXT,
    "providerPaymentId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingEvent_workspaceId_createdAt_idx" ON "BillingEvent"("workspaceId", "createdAt");
CREATE INDEX IF NOT EXISTS "BillingEvent_providerPaymentId_idx" ON "BillingEvent"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "BillingEvent_type_createdAt_idx" ON "BillingEvent"("type", "createdAt");

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_createdAt_idx" ON "PasswordResetToken"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "FunnelEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "qrCodeId" TEXT,
    "paymentId" TEXT,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FunnelEvent_workspaceId_name_createdAt_idx" ON "FunnelEvent"("workspaceId", "name", "createdAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_qrCodeId_name_createdAt_idx" ON "FunnelEvent"("qrCodeId", "name", "createdAt");
CREATE INDEX IF NOT EXISTS "FunnelEvent_paymentId_name_idx" ON "FunnelEvent"("paymentId", "name");
CREATE INDEX IF NOT EXISTS "FunnelEvent_isTest_name_createdAt_idx" ON "FunnelEvent"("isTest", "name", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingEvent_workspaceId_fkey'
  ) THEN
    ALTER TABLE "BillingEvent"
      ADD CONSTRAINT "BillingEvent_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BillingEvent_paymentId_fkey'
  ) THEN
    ALTER TABLE "BillingEvent"
      ADD CONSTRAINT "BillingEvent_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetToken"
      ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FunnelEvent_workspaceId_fkey'
  ) THEN
    ALTER TABLE "FunnelEvent"
      ADD CONSTRAINT "FunnelEvent_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FunnelEvent_qrCodeId_fkey'
  ) THEN
    ALTER TABLE "FunnelEvent"
      ADD CONSTRAINT "FunnelEvent_qrCodeId_fkey"
      FOREIGN KEY ("qrCodeId") REFERENCES "QrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
