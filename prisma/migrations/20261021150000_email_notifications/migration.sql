CREATE TABLE "EmailControl" (
 "id" TEXT PRIMARY KEY DEFAULT 'default', "enabledSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastSeenAt" TIMESTAMP(3), "lastScheduledAt" TIMESTAMP(3)
);
INSERT INTO "EmailControl" ("id") VALUES ('default');
CREATE TABLE "EmailOutbox" (
 "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "kind" TEXT NOT NULL,
 "toEmail" TEXT NOT NULL, "userId" TEXT, "workspaceId" TEXT, "context" JSONB NOT NULL DEFAULT '{}',
 "payloadCipher" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3),
 "leaseUntil" TIMESTAMP(3), "leaseToken" TEXT, "errorCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "sentAt" TIMESTAMP(3)
);
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox" ("status", "nextAttemptAt");
CREATE INDEX "EmailOutbox_userId_kind_createdAt_idx" ON "EmailOutbox" ("userId", "kind", "createdAt");
CREATE TABLE "EmailVerificationToken" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "email" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3) NOT NULL,
 "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EmailVerificationToken_userId_createdAt_idx" ON "EmailVerificationToken" ("userId", "createdAt");
