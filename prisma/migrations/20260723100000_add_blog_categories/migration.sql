-- CreateTable
CREATE TABLE IF NOT EXISTS "BlogCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BlogCategory_sortOrder_idx" ON "BlogCategory"("sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
