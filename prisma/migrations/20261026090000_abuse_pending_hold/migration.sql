ALTER TABLE "QrCode" ADD COLUMN IF NOT EXISTS "holdUntilCheck" BOOLEAN NOT NULL DEFAULT false;

-- Recover only automatic unknown holds from the previous draft. Keep manual/report
-- decisions intact, and keep navigation paused until a successful recheck.
UPDATE "QrCode" AS qr
SET "moderationStatus" = 'PENDING_CHECK', "holdUntilCheck" = true
WHERE qr."moderationStatus" = 'ON_MODERATION'
  AND qr."lastCheckVerdict" = 'unknown' AND qr."moderationReason" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "QrAuditEvent" e WHERE e."qrCodeId" = qr.id AND e.action LIKE 'moderation_%')
  AND NOT EXISTS (SELECT 1 FROM "AbuseReport" r WHERE r."qrCodeId" = qr.id AND r.status IN ('NEW', 'IN_REVIEW'));
