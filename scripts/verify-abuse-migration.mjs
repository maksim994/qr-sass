import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
// This command owns only a newly created, uniquely named database in the local fixture container.
const database = `abuse_migration_${Date.now()}`;
const container = 'qr-abuse-test-db';
execFileSync('docker', ['exec', container, 'createdb', '-U', 'postgres', database]);
const psql = ['exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database];
const sql = text => execFileSync('docker', psql, { input: text, stdio: ['pipe', 'pipe', 'pipe'] }).toString();
try {
  const root = new URL('../prisma/migrations/', import.meta.url);
  for (const migration of readdirSync(root).sort()) {
    if (!/^\d/.test(migration) || migration >= '20261025190000_abuse_protection') continue;
    sql(readFileSync(new URL(`${migration}/migration.sql`, root)));
  }
  sql(`INSERT INTO "User" (id,email,"passwordHash","updatedAt") VALUES ('fixture-user','migration@example.test','unusable',now());
    INSERT INTO "Workspace" (id,name,slug,"updatedAt") VALUES ('fixture-ws','Migration fixture','abuse-migration',now());
    INSERT INTO "QrCode" (id,"workspaceId","createdById",kind,"contentType",name,"shortCode","encodedContent","currentTargetUrl",payload,"updatedAt")
    VALUES ('fixture-qr','fixture-ws','fixture-user','DYNAMIC','URL','Printed fixture','oldprint','https://qr-s.ru/r/oldprint','https://example.com/original','{"url":"https://example.com/original","smartRedirect":{"ios":"https://example.com/ios"}}',now());`);
  const query = `SELECT json_build_object('id',id,'shortCode',"shortCode",'encodedContent',"encodedContent",'currentTargetUrl',"currentTargetUrl",'payload',payload,'kind',kind,'workspaceId',"workspaceId") FROM "QrCode";`;
  const before = sql(query);
  const migration = readFileSync(new URL('20261025190000_abuse_protection/migration.sql', root));
  sql(migration); sql(migration);
  assert.equal(sql(query), before);
  assert.match(sql('SELECT "moderationStatus"::text, "abuseLegacy" FROM "QrCode";'), /OK\s*\|\s*t/);
  const holdMigration = readFileSync(new URL('20261026090000_abuse_pending_hold/migration.sql', root));
  sql(`UPDATE "QrCode" SET "moderationStatus" = 'ON_MODERATION', "lastCheckVerdict" = 'unknown';`);
  sql(holdMigration); sql(holdMigration);
  assert.match(sql('SELECT "moderationStatus"::text, "holdUntilCheck" FROM "QrCode";'), /PENDING_CHECK\s*\|\s*t/);
  sql(`UPDATE "QrCode" SET "moderationStatus" = 'ON_MODERATION', "holdUntilCheck" = false, "moderationReason" = 'reports_threshold';`);
  sql(holdMigration);
  assert.match(sql('SELECT "moderationStatus"::text, "holdUntilCheck" FROM "QrCode";'), /ON_MODERATION\s*\|\s*f/);
  sql(`UPDATE "QrCode" SET "moderationReason" = NULL;
    INSERT INTO "QrAuditEvent" (id,"qrCodeId","workspaceId","actorType",action) VALUES ('manual-fixture','fixture-qr','fixture-ws','admin','moderation_block');`);
  sql(holdMigration);
  assert.match(sql('SELECT "moderationStatus"::text, "holdUntilCheck" FROM "QrCode";'), /ON_MODERATION\s*\|\s*f/);
  console.log('PASS unknown-hold migration recovers automatic holds and preserves report/manual moderation');
  console.log('PASS additive migration preserves printed-code contract, existing OK/legacy defaults, repeated application');
} finally { execFileSync('docker', ['exec', container, 'dropdb', '-U', 'postgres', database]); }
