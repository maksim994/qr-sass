CREATE TABLE IF NOT EXISTS "SeoPageOverride" (
    "path" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "heading" TEXT,
    "noindex" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeoPageOverride_pkey" PRIMARY KEY ("path")
);

CREATE TABLE IF NOT EXISTS "SeoPageOverrideRevision" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeoPageOverrideRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoPageOverrideRevision_path_number_key" ON "SeoPageOverrideRevision"("path", "number");
CREATE INDEX IF NOT EXISTS "SeoPageOverrideRevision_path_createdAt_idx" ON "SeoPageOverrideRevision"("path", "createdAt");
