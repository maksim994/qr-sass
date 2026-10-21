BEGIN;
ALTER TABLE "Payment" DROP COLUMN "signupSourceUserId";
DROP TABLE "AdvertisingConversionReceipt";
DROP TABLE "user_signup_source";
ALTER TABLE "OAuthLegalIntent" DROP COLUMN "signupSource";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261021180000_signup_source_vk';
COMMIT;
