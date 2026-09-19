-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminAuditLog_entityId_createdAt_idx" ON "AdminAuditLog"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BusinessEvent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "paymentId" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TelegramSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tokenCipher" TEXT,
    "chatId" TEXT NOT NULL DEFAULT '',
    "events" TEXT[] DEFAULT ARRAY['registration_completed', 'trial_started', 'payment_succeeded']::TEXT[],
    "dailyDigest" BOOLEAN NOT NULL DEFAULT true,
    "digestHour" INTEGER NOT NULL DEFAULT 9,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "lastError" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NotificationWorkerState" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationWorkerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessEvent_key_key" ON "BusinessEvent"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessEvent_name_isTest_createdAt_idx" ON "BusinessEvent"("name", "isTest", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessEvent_workspaceId_createdAt_idx" ON "BusinessEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationOutbox_key_key" ON "NotificationOutbox"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NotificationOutbox_status_nextAttemptAt_idx" ON "NotificationOutbox"("status", "nextAttemptAt");

