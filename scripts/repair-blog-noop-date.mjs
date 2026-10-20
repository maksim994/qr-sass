// Targeted, audited correction. Defaults to read-only; refuses any real editorial change.
// node --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/repair-blog-noop-date.mjs POST_ID [--apply]
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db.ts";
import { articleFields, articleSnapshot, recordSave } from "../src/lib/blog-versions.ts";
const id = process.argv[2], apply = process.argv.includes("--apply");
assert.ok(id && !id.startsWith("--"), "Article ID required");
const db = getDb();
try {
 const result = await db.$transaction(async tx => {
  const before = await tx.blogPost.findUniqueOrThrow({ where: { id } });
  const revisions = await tx.blogRevision.findMany({ where: { postId: id }, orderBy: { number: "asc" } });
  assert.deepEqual(revisions.map(r => r.number), [0, 1], "Only the first unchanged save may be repaired; later edits require investigation");
  const source = revisions[0].snapshot, erroneous = revisions[1].snapshot, current = articleSnapshot(before);
  const changed = articleFields.filter(key => JSON.stringify(source[key]) !== JSON.stringify(erroneous[key]));
  assert.deepEqual(changed, ["contentUpdatedAt"], "There was an editorial change; date correction refused");
  for (const key of articleFields) assert.deepEqual(current[key], erroneous[key], `Current ${key} differs from the last revision`);
  assert.ok(typeof source.contentUpdatedAt === "string" && typeof erroneous.contentUpdatedAt === "string", "Explicit original editorial date required");
  assert.ok(new Date(source.contentUpdatedAt) < new Date(erroneous.contentUpdatedAt), "Original date must be earlier");
  const plan = { id, applied: apply, from: erroneous.contentUpdatedAt, to: source.contentUpdatedAt, changedFields: changed };
  if (!apply) return plan;
  const post = await tx.blogPost.update({ where: { id, updatedAt: before.updatedAt }, data: { contentUpdatedAt: new Date(source.contentUpdatedAt), updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)) } });
  await recordSave(tx, before, post, { actorId: null, actorName: "Исправление даты без правок", source: "system" }, "Исправлена ошибка сравнения порядка ключей FAQ: восстановлена исходная редакционная дата; содержимое статьи не менялось.");
  return plan;
 });
 console.log(JSON.stringify(result));
} finally { await db.$disconnect(); }
