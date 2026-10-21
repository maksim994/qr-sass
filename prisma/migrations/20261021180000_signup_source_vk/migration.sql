ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "signupSourceUserId" TEXT;
ALTER TABLE "OAuthLegalIntent" ADD COLUMN IF NOT EXISTS "signupSource" JSONB;
CREATE TABLE IF NOT EXISTS "user_signup_source" (
  "user_id" TEXT NOT NULL PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "signup_utm_source" VARCHAR(255), "signup_utm_medium" VARCHAR(255), "signup_utm_campaign" VARCHAR(255),
  "signup_utm_content" VARCHAR(255), "signup_utm_term" VARCHAR(255),
  "signup_click_id" VARCHAR(255), "signup_click_id_type" VARCHAR(8),
  "signup_referrer" VARCHAR(255), "signup_landing_path" VARCHAR(255), "signup_first_touch_at" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "AdvertisingConversionReceipt" ("key" TEXT NOT NULL PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
