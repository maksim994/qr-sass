// Writes synthetic data ONLY in the named local stage-two database. Never point at production.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { JSDOM } from "jsdom";
import { getDb } from "../src/lib/db.ts";
import { saveArticle, hashPreviewToken } from "../src/lib/blog-workflow.ts";
const database = new URL(process.env.DATABASE_URL);
const origin = process.env.BLOG_TEST_ORIGIN || "http://localhost:3006";
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname === "/qr_tz06_stage2", "Dedicated local database required");
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local server required");
assert.ok(process.env.JWT_SECRET?.startsWith("local-tz06-"), "Synthetic secret required");
const db = getDb(), run = Date.now();
const admin = await db.user.upsert({ where: { email: "tz06-admin@example.invalid" }, create: { email: "tz06-admin@example.invalid", passwordHash: await bcrypt.hash("Local-TZ06-Only-2026!", 10), isAdmin: true }, update: {} });
const reader = await db.user.upsert({ where: { email: "tz06-reader@example.invalid" }, create: { email: "tz06-reader@example.invalid", passwordHash: "unusable" }, update: {} });
async function session(user) { return new SignJWT({ email: user.email, sv: user.sessionVersion }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET)); }
const token = await session(admin), readerToken = await session(reader);
async function req(path, method = "GET", body, auth = token, csrf = "test") {
 const response = await fetch(origin + path, { method, redirect: "manual", headers: { Cookie: `${auth ? `qr_saas_session=${auth}; ` : ""}csrf_token=test`, "x-csrf-token": csrf, Origin: origin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
 const raw = await response.text(); let json; try { json = JSON.parse(raw); } catch {}
 return { response, raw, json };
}
async function ok(path, method, body) { const r = await req(path, method, body); assert.equal(r.response.status, 200, r.json?.error || r.raw.slice(0, 120)); assert.ok(r.json.ok); return r.json.data; }
const faq = [{ question: "Синтетический вопрос?", answer: "Синтетический ответ." }];
const draft = await ok("/api/admin/blog", "POST", { title: `Синтетическая проверка версий ${run}`, slug: `workflow-${run}`, content: '## Раздел\n\nПервая строка\n\n<figure><img src="https://example.invalid/test.webp" alt="Первый alt"></figure>', faq, metaTitle: "Meta 1", metaDescription: "Description 1", excerpt: "Анонс 1", authorName: "Автор 1", structuredData: { "@type": "Thing", name: "Синтетический объект" }, showPrintSizeIntro: false, comment: "Первая версия" });
const path = `/api/admin/blog/${draft.id}`;
assert.equal(draft.status, "draft");
let versions = await db.blogRevision.findMany({ where: { postId: draft.id }, orderBy: { number: "asc" } });
assert.equal(versions.length, 1); assert.equal(versions[0].source, "admin"); assert.equal(versions[0].actorName, admin.email); assert.equal(versions[0].comment, "Первая версия");
const v1 = versions[0];
let changed = await ok(path, "PATCH", { title: "Синтетическая правка", content: "## Второй раздел\n\nВторая строка", faq: [], metaTitle: "Meta 2", excerpt: "Анонс 2", showPrintSizeIntro: true, expectedUpdatedAt: draft.updatedAt });
await ok(path, "PATCH", { expectedUpdatedAt: changed.updatedAt });
versions = await db.blogRevision.findMany({ where: { postId: draft.id }, orderBy: { number: "asc" } });
assert.equal(versions.length, 3, "Even no-op saves create a revision");
assert.ok((await req(`/admin/blog/${draft.id}/versions?from=${v1.id}&to=${versions[1].id}`)).raw.includes("Тело статьи"));
let restored = await ok(`${path}/restore`, "POST", { revisionId: v1.id, expectedUpdatedAt: (await db.blogPost.findUniqueOrThrow({ where: { id: draft.id } })).updatedAt.toISOString() });
assert.equal(restored.id, draft.id);
let row = await db.blogPost.findUniqueOrThrow({ where: { id: draft.id } });
for (const key of ["content", "title", "format", "slug", "metaTitle", "metaDescription", "excerpt", "faq", "structuredData", "coverImageUrl", "authorName", "showPrintSizeIntro", "status", "readingTimeMinutes"]) assert.deepEqual(row[key], draft[key], `restored ${key}`);
assert.equal(await db.blogRevision.count({ where: { postId: draft.id } }), 4);
const concurrent = await Promise.all([req(path, "PATCH", { title: "Конкурент A", expectedUpdatedAt: row.updatedAt.toISOString() }), req(path, "PATCH", { title: "Конкурент B", expectedUpdatedAt: row.updatedAt.toISOString() })]);
assert.deepEqual(concurrent.map(r => r.response.status).sort(), [200, 409]);
assert.equal(await db.blogRevision.count({ where: { postId: draft.id } }), 5);
assert.equal((await req(`${path}/restore`, "POST", { revisionId: v1.id, expectedUpdatedAt: draft.updatedAt })).response.status, 409);
for (const auth of ["", readerToken]) {
 for (const [suffix, method, body] of [["", "PATCH", { title: "Forbidden" }], ["/restore", "POST", { revisionId: v1.id, expectedUpdatedAt: row.updatedAt.toISOString() }], ["/preview-token", "POST", {}], ["/preview-token", "DELETE", undefined]]) assert.equal((await req(path + suffix, method, body, auth)).response.status, 401);
}
assert.equal((await req(path, "PATCH", { title: "Forbidden" }, token, "wrong")).response.status, 403);
const link = await ok(`${path}/preview-token`, "POST", {});
const previewToken = link.path.split("/").at(-1);
assert.equal(previewToken.length, 43);
const storedToken = await db.blogPreviewToken.findUniqueOrThrow({ where: { hash: hashPreviewToken(previewToken) } });
assert.equal(storedToken.hash.length, 64); assert.ok(!JSON.stringify(storedToken).includes(previewToken));
const preview = await req(link.path, "GET", undefined, "");
assert.equal(preview.response.status, 200); assert.equal(preview.response.headers.get("x-robots-tag"), "noindex, nofollow");
assert.ok(/no-store/.test(preview.response.headers.get("cache-control")));
const dom = new JSDOM(preview.raw).window.document;
assert.match(dom.querySelector('meta[name="robots"]').content, /noindex.*nofollow/);
assert.ok(dom.querySelector(".qrs-body"));
const rotated = await ok(`${path}/preview-token`, "POST", {});
assert.notEqual(rotated.path, link.path); assert.equal((await req(link.path)).response.status, 404);
await ok(`${path}/preview-token`, "DELETE"); assert.equal((await req(rotated.path)).response.status, 404);
assert.equal((await req(`/blog/${draft.slug}`)).response.status, 404);
for (const publicPath of ["/blog", "/sitemap.xml", "/"]) assert.ok(!(await req(publicPath)).raw.includes(`/blog/${draft.slug}`));
assert.equal((await req(`/api/blog/${draft.slug}/view`, "POST", {})).response.status, 404);
const legacySource = '<h2 id="old">Старый раздел</h2>\n<p>Пробелы  и &amp; сущности.</p>';
const legacy = await db.blogPost.create({ data: { title: "Синтетическая старая статья", slug: `legacy-workflow-${run}`, content: legacySource, publishedAt: new Date("2026-07-14T08:00:00Z"), updatedAt: new Date("2026-07-14T08:00:00Z"), views: 17, likes: 3 } });
const converted = await ok(`/api/admin/blog/${legacy.id}`, "PATCH", { format: "markdown", content: "## Переведённая статья", confirmConversion: true, expectedUpdatedAt: legacy.updatedAt.toISOString() });
const original = await db.blogRevision.findUniqueOrThrow({ where: { postId_number: { postId: legacy.id, number: 0 } } });
assert.equal(original.snapshot.content, legacySource);
await ok(`/api/admin/blog/${legacy.id}/restore`, "POST", { revisionId: original.id, expectedUpdatedAt: converted.updatedAt });
const reverted = await db.blogPost.findUniqueOrThrow({ where: { id: legacy.id } });
assert.equal(reverted.content, legacySource); assert.equal(reverted.format, "html"); assert.equal(reverted.views, 17); assert.equal(reverted.likes, 3); assert.equal(reverted.publishedAt.toISOString(), legacy.publishedAt.toISOString());
await ok(path, "PATCH", { status: "published" });
assert.equal((await req(`/blog/${draft.slug}`)).response.status, 200);
assert.ok(!(await req(`/blog/${legacy.slug}`)).raw.includes("not-found"));
await ok(path, "PATCH", { content: "## Изменение сразу в эфире" });
assert.ok((await req(`/blog/${draft.slug}`)).raw.includes("Изменение сразу в эфире"));
await ok(path, "PATCH", { status: "draft" });
assert.equal((await req(`/blog/${draft.slug}`)).response.status, 404);
const duplicateCount = await db.blogRevision.count({ where: { postId: draft.id } });
assert.equal((await req(path, "PATCH", { slug: legacy.slug })).response.status, 403, "Previously published slug stays locked");
assert.equal(await db.blogRevision.count({ where: { postId: draft.id } }), duplicateCount);
const apiDraft = await saveArticle({ title: "Синтетический источник API", slug: `api-workflow-${run}`, content: "## API" }, { actorId: null, actorName: "Тест общего helper", source: "api" });
assert.equal((await db.blogRevision.findFirstOrThrow({ where: { postId: apiDraft.id } })).source, "api");
assert.equal((await req(`/api/admin/blog/${apiDraft.id}`, "PATCH", { slug: legacy.slug })).response.status, 409);
assert.equal(await db.blogRevision.count({ where: { postId: apiDraft.id } }), 1, "Failed save rolls back revision and article together");
assert.equal((await req(`${path}/restore`, "POST", { revisionId: original.id, expectedUpdatedAt: row.updatedAt.toISOString() })).response.status, 404, "Cannot restore another article's revision");
const events = await db.blogEvent.findMany({ where: { postId: draft.id } });
for (const type of ["create", "update", "restore", "publish", "unpublish", "preview_create", "preview_revoke"]) assert.ok(events.some(e => e.type === type), type);
const filtered = await req(`/admin/blog/history?article=${draft.id}&actor=${encodeURIComponent(admin.email)}&type=restore`);
assert.equal(filtered.response.status, 200); assert.ok(filtered.raw.includes("Восстановлена версия"));
const dueAt = new Date(Date.now() + 130_000);
const scheduled = await ok("/api/admin/blog", "POST", { title: "Синтетическая отложенная публикация", slug: `scheduled-workflow-${run}`, content: "## Проверка расписания", status: "scheduled", scheduledAt: dueAt.toISOString() });
assert.equal(scheduled.publishedAt, null); assert.equal((await req(`/blog/${scheduled.slug}`)).response.status, 404);
assert.ok(!(await req(`/blog/${legacy.slug}`)).raw.includes(`/blog/${scheduled.slug}`), "Scheduled post absent from related");
console.log("Workflow checks passed; observing real worker publication in 130 seconds.");
const worker = spawn(process.execPath, ["--experimental-strip-types", "--import", "./scripts/register-src-alias.mjs", "scripts/notification-worker.ts"], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
let workerErrors = ""; worker.stderr.on("data", d => { workerErrors += d.toString(); });
try {
 const deadline = dueAt.getTime() + 25_000;
 let published;
 while (Date.now() < deadline) {
  const current = await db.blogPost.findUniqueOrThrow({ where: { id: scheduled.id } });
  if (current.status === "published") { published = current; break; }
  assert.ok(Date.now() >= dueAt.getTime() || current.publishedAt === null);
  await new Promise(resolve => setTimeout(resolve, 1500));
 }
 assert.ok(published, `Worker did not publish: ${workerErrors.slice(-1000)}`);
 assert.equal(published.publishedAt.toISOString(), dueAt.toISOString());
 assert.equal(published.firstPublishedAt.toISOString(), dueAt.toISOString());
 assert.equal((await req(`/blog/${scheduled.slug}`)).response.status, 200);
 assert.ok((await req("/sitemap.xml")).raw.includes(`/blog/${scheduled.slug}`));
 assert.equal(await db.blogRevision.count({ where: { postId: scheduled.id } }), 2);
 assert.equal(await db.blogEvent.count({ where: { postId: scheduled.id, type: "publish" } }), 1);
 const history = await req(`/admin/blog/${scheduled.id}/versions`);
 assert.ok(history.raw.includes("Планировщик публикаций"));
 mkdirSync("outputs/tz06-stage2", { recursive: true });
 writeFileSync("outputs/tz06-stage2/integration.json", JSON.stringify({ passed: true, draftId: draft.id, legacyId: legacy.id, scheduledId: scheduled.id, scheduledAt: dueAt.toISOString(), publishedObservedAt: new Date().toISOString(), checks: ["atomic versions", "no-op versions", "field restore", "legacy HTML restore", "conflicts", "auth + CSRF", "secret preview hash + rotation + revocation", "robots + no-store", "draft exclusion", "published edits live", "journal filters", "real worker delayed publication"] }, null, 2));
 console.log("Stage 2 acceptance passed.");
} finally { if (worker.exitCode === null) { worker.kill("SIGTERM"); await new Promise(resolve => worker.on("exit", resolve)); } await db.$disconnect(); }
