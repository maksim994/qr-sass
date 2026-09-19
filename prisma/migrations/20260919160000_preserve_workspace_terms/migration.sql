-- Only rows existing when this column is introduced receive archived terms.
-- New workspaces default to the public plans, including after a retry.
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "accessMode" TEXT NOT NULL DEFAULT 'archive';
ALTER TABLE "Workspace" ALTER COLUMN "accessMode" SET DEFAULT 'standard';
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "archivedPlan" JSONB;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "termsMode" TEXT;

-- Match the legacy getPlan null/fallback semantics exactly. Do not rewrite
-- Workspace.plan, Subscription dates/status, payments, QR or uploaded files.
WITH defaults AS (
  SELECT * FROM (VALUES
    ('FREE', 0, 10, 1, false, false, '["PNG","SVG"]'::jsonb),
    ('PRO', 990, NULL::int, 5, true, true, '["PNG","SVG","JPG","EPS","PDF"]'::jsonb),
    ('BUSINESS', 2990, NULL::int, NULL::int, true, true, '["PNG","SVG","JPG","EPS","PDF"]'::jsonb)
  ) AS d(id, price, qr, users, dynamic, analytics, formats)
), plans AS (
  SELECT d.id, jsonb_build_object(
    'id', d.id, 'priceRub', COALESCE(o."priceRub", d.price),
    'limits', jsonb_build_object(
      'maxQrCodes', COALESCE(o."maxQrCodes", d.qr),
      'maxUsers', COALESCE(o."maxUsers", d.users),
      'allowsDynamic', COALESCE(o."allowsDynamic", d.dynamic),
      'allowsAnalytics', COALESCE(o."allowsAnalytics", d.analytics),
      'exportFormats', CASE WHEN o."exportFormats" IS NOT NULL AND jsonb_typeof(o."exportFormats"::jsonb) = 'array'
        THEN (SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) FROM jsonb_array_elements(o."exportFormats"::jsonb) WHERE value IN ('"PNG"','"SVG"','"JPG"','"EPS"','"PDF"'))
        ELSE d.formats END
    )
  ) AS value FROM defaults d LEFT JOIN "PlanOverride" o ON o."planId"::text = d.id
)
UPDATE "Workspace" w SET "archivedPlan" = jsonb_build_object(
  'version', 1, 'plan', p.value, 'freePlan', f.value
)
FROM plans p, plans f
WHERE w."accessMode" = 'archive' AND w."archivedPlan" IS NULL
  AND p.id = w.plan::text AND f.id = 'FREE';
