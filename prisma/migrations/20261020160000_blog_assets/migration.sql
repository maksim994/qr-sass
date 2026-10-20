CREATE TABLE IF NOT EXISTS "BlogRedirect" (
 "id" TEXT NOT NULL PRIMARY KEY, "source" TEXT NOT NULL, "target" TEXT NOT NULL,
 "comment" TEXT, "actorName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogRedirect_source_key" ON "BlogRedirect"("source");
CREATE TABLE IF NOT EXISTS "BlogImage" (
 "id" TEXT NOT NULL PRIMARY KEY, "url" TEXT NOT NULL, "kind" TEXT NOT NULL, "alt" TEXT NOT NULL,
 "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "variants" JSONB NOT NULL,
 "actorName" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "BlogImage_url_key" ON "BlogImage"("url");

-- Import the four existing editorial 301s without changing article rows.
INSERT INTO "BlogRedirect" ("id","source","target","comment","actorName") VALUES
('tz06-legacy-1', '/blog/staticheskiy-i-dinamicheskiy-qr-kod-dlya-oplaty-raznitsa', '/blog/qr-kod-oplata-sbp', 'Перенесено из next.config; прежний адрес и код 301 сохранены', 'Система (перенос)'),
('tz06-legacy-2', '/blog/staticheskiy-qr-kod-kak-sozdat-i-primenyat', '/blog/dinamicheskij-i-staticheskij-qr-kod-raznica', 'Перенесено из next.config; прежний адрес и код 301 сохранены', 'Система (перенос)'),
('tz06-legacy-3', '/blog/dinamicheskiy-qr-kod-v-chem-otlichie-ot-staticheskogo-i-chto-vybrat', '/blog/dinamicheskij-i-staticheskij-qr-kod-raznica', 'Перенесено из next.config; прежний адрес и код 301 сохранены', 'Система (перенос)'),
('tz06-legacy-4', '/blog/vidy-qr-kodov-staticheskie-dinamicheskie-i-ih-primenenie-v-biznese', '/blog/dinamicheskij-i-staticheskij-qr-kod-raznica', 'Перенесено из next.config; прежний адрес и код 301 сохранены', 'Система (перенос)')
ON CONFLICT ("source") DO NOTHING;
