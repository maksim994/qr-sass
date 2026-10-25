-- CreateEnum
DO $$ BEGIN CREATE TYPE "QrModerationStatus" AS ENUM ('OK', 'PENDING_CHECK', 'ON_MODERATION', 'BLOCKED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "AbuseRuleKind" AS ENUM ('DOMAIN', 'STOPWORD', 'SHORTENER', 'ALLOW_DOMAIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "AbuseRuleAction" AS ENUM ('BLOCK', 'REVIEW'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "AbuseReportStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED_BLOCKED', 'RESOLVED_OK', 'SPAM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "QrCode" ADD COLUMN IF NOT EXISTS "abuseLegacy" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "lastCheckVerdict" TEXT,
ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "moderationAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "moderationAttention" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "moderationReason" TEXT,
ADD COLUMN IF NOT EXISTS "moderationStatus" "QrModerationStatus" NOT NULL DEFAULT 'OK';

-- AlterTable
ALTER TABLE "QrRevision" ADD COLUMN IF NOT EXISTS "payloadSnapshot" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AbuseRule" (
    "id" TEXT NOT NULL,
    "kind" "AbuseRuleKind" NOT NULL,
    "value" TEXT NOT NULL,
    "action" "AbuseRuleAction" NOT NULL DEFAULT 'REVIEW',
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbuseRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AbuseReport" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT,
    "shortCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "email" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AbuseReportStatus" NOT NULL DEFAULT 'NEW',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AbuseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "QrAuditEvent" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT,
    "shortCode" TEXT,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "action" TEXT NOT NULL,
    "oldUrls" JSONB,
    "newUrls" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AbuseUrlApproval" (
    "urlHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbuseUrlApproval_pkey" PRIMARY KEY ("urlHash")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AbuseProviderQuota" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AbuseProviderQuota_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AbuseRule_kind_value_key" ON "AbuseRule"("kind", "value");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AbuseReport_status_createdAt_idx" ON "AbuseReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AbuseReport_qrCodeId_idx" ON "AbuseReport"("qrCodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QrAuditEvent_qrCodeId_createdAt_idx" ON "QrAuditEvent"("qrCodeId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QrAuditEvent_workspaceId_createdAt_idx" ON "QrAuditEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QrAuditEvent_createdAt_idx" ON "QrAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QrCode_moderationStatus_idx" ON "QrCode"("moderationStatus");


-- Existing codes keep their public behavior for local-rule matches. New codes use full moderation.
ALTER TABLE "QrCode" ALTER COLUMN "abuseLegacy" SET DEFAULT false;
