DO $$ BEGIN
  CREATE TYPE "BlogStatus" AS ENUM ('draft', 'scheduled', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "status" "BlogStatus";
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "BlogPost_status_scheduledAt_idx" ON "BlogPost"("status", "scheduledAt");
CREATE TABLE IF NOT EXISTS "BlogRevision" (
 "id" TEXT PRIMARY KEY, "postId" TEXT NOT NULL, "number" INTEGER NOT NULL, "snapshot" JSONB NOT NULL,
 "actorId" TEXT, "actorName" TEXT NOT NULL, "source" TEXT NOT NULL, "comment" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogRevision_postId_number_key" ON "BlogRevision"("postId", "number");
CREATE INDEX IF NOT EXISTS "BlogRevision_postId_createdAt_idx" ON "BlogRevision"("postId", "createdAt");
CREATE TABLE IF NOT EXISTS "BlogEvent" (
 "id" TEXT PRIMARY KEY, "postId" TEXT NOT NULL, "postTitle" TEXT NOT NULL,
 "actorId" TEXT, "actorName" TEXT NOT NULL, "source" TEXT NOT NULL, "type" TEXT NOT NULL,
 "fields" TEXT[] NOT NULL, "comment" TEXT, "revisionId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS "BlogEvent_postId_createdAt_idx" ON "BlogEvent"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "BlogEvent_actorName_createdAt_idx" ON "BlogEvent"("actorName", "createdAt");
CREATE INDEX IF NOT EXISTS "BlogEvent_type_createdAt_idx" ON "BlogEvent"("type", "createdAt");
CREATE TABLE IF NOT EXISTS "BlogPreviewToken" (
 "hash" TEXT PRIMARY KEY, "postId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "revokedAt" TIMESTAMP(3), CONSTRAINT "BlogPreviewToken_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX IF NOT EXISTS "BlogPreviewToken_postId_revokedAt_idx" ON "BlogPreviewToken"("postId", "revokedAt");
DO $$ BEGIN
 ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_status_publication_check" CHECK (
   "status" IS NULL OR
   ("status" = 'published' AND "publishedAt" IS NOT NULL AND "scheduledAt" IS NULL) OR
   ("status" = 'draft' AND "publishedAt" IS NULL AND "scheduledAt" IS NULL) OR
   ("status" = 'scheduled' AND "publishedAt" IS NULL AND "scheduledAt" IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
