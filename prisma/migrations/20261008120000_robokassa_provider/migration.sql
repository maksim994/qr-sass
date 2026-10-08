-- Additive: existing orders keep their original provider and identifiers.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'yookassa';
