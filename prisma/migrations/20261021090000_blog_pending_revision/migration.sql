CREATE TABLE IF NOT EXISTS "BlogPendingRevision" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "snapshot" JSONB NOT NULL,
  "baseUpdatedAt" TIMESTAMP(3) NOT NULL,
  "actorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPendingRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogPendingRevision_postId_key" ON "BlogPendingRevision"("postId");
DO $$ BEGIN
  ALTER TABLE "BlogPendingRevision" ADD CONSTRAINT "BlogPendingRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "BlogPreviewToken" ADD COLUMN IF NOT EXISTS "pendingRevisionId" TEXT;
CREATE INDEX IF NOT EXISTS "BlogPreviewToken_pendingRevisionId_idx" ON "BlogPreviewToken"("pendingRevisionId");
DO $$ BEGIN
  ALTER TABLE "BlogPreviewToken" ADD CONSTRAINT "BlogPreviewToken_pendingRevisionId_fkey" FOREIGN KEY ("pendingRevisionId") REFERENCES "BlogPendingRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
