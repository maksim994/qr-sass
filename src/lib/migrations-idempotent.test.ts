import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("migrations start with an idempotent baseline and deploy has no generic resolve", () => {
  const dirs = readdirSync(path.join(root, "prisma/migrations"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(dirs[0]?.includes("baseline_schema"), `first migration should be baseline, got ${dirs[0]}`);
  const baseline = readFileSync(path.join(root, "prisma/migrations", dirs[0], "migration.sql"), "utf8");
  assert.match(baseline, /CREATE TABLE IF NOT EXISTS "User"/);
  assert.match(baseline, /CREATE TABLE IF NOT EXISTS "QrCode"/);
  for (const dir of dirs.slice(1)) {
    const sql = readFileSync(path.join(root, "prisma/migrations", dir, "migration.sql"), "utf8");
    if (sql.includes("ALTER TABLE")) {
      assert.match(sql, /ADD COLUMN IF NOT EXISTS|IF NOT EXISTS/);
    }
  }
  const deploy = readFileSync(path.join(root, "scripts/migrate-deploy.mjs"), "utf8");
  assert.match(deploy, /"migrate",\s*"deploy"/);
  assert.match(deploy, /P3005/);
  assert.match(deploy, /--to-schema-datamodel/);
  assert.match(deploy, /--applied/);
  assert.match(deploy, /schema does not match/);
});

test("CI workflow lives inside the qr-saas repository", () => {
  const workflow = readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
  assert.match(workflow, /npm test/);
  assert.doesNotMatch(workflow, /working-directory:\s*qr-saas/);
});
