-- Additive only. No article bodies, dates or URLs are rewritten.
ALTER TABLE "BlogPost"
  ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'html',
  ADD COLUMN IF NOT EXISTS "renderedHtml" TEXT,
  ADD COLUMN IF NOT EXISTS "legacyHtml" TEXT,
  ADD COLUMN IF NOT EXISTS "faq" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "showPrintSizeIntro" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "contentUpdatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "firstPublishedAt" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlogPost_format_check' AND conrelid = '"BlogPost"'::regclass) THEN
    ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_format_check" CHECK ("format" IN ('html', 'markdown'));
  END IF;
END $$;
