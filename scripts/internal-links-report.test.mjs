import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { auditRedirects, planRelated, internalPath } from "./internal-links-report.mjs";
const post = (id, slug, extra = {}) => ({ id, slug, content: "", format: "html", publishedAt: "2026-10-25", relatedArticleIds: [], ...extra });
test("redirect report covers HTML, Markdown references, dynamic redirects and related IDs without false external/code hits", () => {
  const snapshot = { posts: [
    post("a", "a", { content: '<a href="https://qr-s.ru/blog/old/?x=1#part">Old</a><a href="https://evil.example/blog/old">No</a><a href="/custom">Custom</a>', relatedArticleIds: ["b", "missing"] }),
    post("b", "old", { format: "markdown", content: '[reference][r]\n\n[r]: /blog/old#heading\n\n`[code](/blog/old)`' }),
  ], redirects: [{ source: "/custom", target: "/blog/new" }] };
  const result = auditRedirects(snapshot, { old: "new" });
  assert.equal(result.links.length, 3); assert.equal(result.related.length, 1); assert.equal(result.unknownRelatedIds.length, 1);
  assert.equal(result.links[2].anchor, "reference");
  assert.equal(internalPath("//evil.example/blog/old"), null);
});
test("related dry run resolves real IDs, prepends and deduplicates without losing manual choices or mutating source", () => {
  const snapshot = { posts: [post("a", "source", { relatedArticleIds: ["c", "b"] }), post("b", "target"), post("c", "other")], redirects: [] };
  const before = structuredClone(snapshot);
  const plan = { schemaVersion: 1, targets: [{ target: "target", sources: ["source"], deferredSources: ["other"] }] };
  const result = planRelated(snapshot, plan, {});
  assert.deepEqual(result.diff[0].after, ["b", "c"]); assert.equal(result.deferred.length, 1); assert.equal(result.applied, false); assert.deepEqual(snapshot, before);
  snapshot.posts[0].relatedArticleIds = result.diff[0].after;
  assert.equal(planRelated(snapshot, plan, {}).diff.length, 0);
});
test("missing, draft, redirected and self targets are blockers; incomplete snapshots fail closed", () => {
  const snapshot = { posts: [post("a", "source"), post("b", "draft", { publishedAt: null })], redirects: [] };
  const plan = { schemaVersion: 1, targets: ["missing", "draft", "source"].map(target => ({ target, sources: ["source"] })) };
  assert.equal(planRelated(snapshot, plan, {}).blockers.length, 3);
  assert.equal(planRelated(snapshot, { schemaVersion: 1, targets: [{ target: "draft", sources: ["source"] }] }, { source: "new" }).diff.length, 0);
  assert.throws(() => auditRedirects({ posts: [] }, {}), /redirects/);
});
test("CLI rejects apply and database arguments before reading anything", () => {
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/internal-links-dry-run.mjs", "--apply"], { encoding: "utf8" });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /report only/);
});
test("combined code, content and active related proposals stay within six new links per target", async () => {
  const { readFileSync } = await import("node:fs");
  const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  const budget = read("../outputs/internal-links-budget-2026-10.json");
  const content = read("../outputs/internal-links-content-2026-10.json");
  const related = read("./related-2026-10.json");
  const totals = {};
  const add = (target, field, n) => { (totals[target] ??= { code: 0, content: 0, related: 0, total: 0 })[field] += n; totals[target].total += n; };
  for (const link of budget.code) add(link.target, "code", link.newLinks);
  for (const change of content.changes) for (const link of change.targets) if (link.newLinks) add(link.target, "content", link.newLinks);
  for (const entry of related.targets) for (const source of entry.sources) { assert.ok(source); add(`/blog/${entry.target}`, "related", 1); }
  assert.deepEqual(totals, budget.totals);
  for (const [target, counts] of Object.entries(totals)) assert.ok(counts.total <= budget.limit, target);
  assert.equal(new Set(budget.code.map(link => `${link.source}:${link.target}`)).size, budget.code.length);
});
