import assert from "node:assert/strict";
import { test } from "node:test";
import { alreadyRecordedAsApplied, isPrismaP3005, listMigrationNames } from "./migrate-adopt.ts";

test("P3005 adopt is recognized only for the empty-history case", () => {
  assert.equal(isPrismaP3005("Error: P3005\nThe database schema is not empty"), true);
  assert.equal(isPrismaP3005("P1001: Can't reach database"), false);
  assert.equal(alreadyRecordedAsApplied("The migration ... has already been applied"), true);
  assert.deepEqual(
    listMigrationNames([
      { name: "migration_lock.toml", isDirectory: () => false },
      { name: "20260722100000_baseline_schema", isDirectory: () => true },
      { name: "20260723100000_add_blog_categories", isDirectory: () => true },
    ]),
    ["20260722100000_baseline_schema", "20260723100000_add_blog_categories"],
  );
});
