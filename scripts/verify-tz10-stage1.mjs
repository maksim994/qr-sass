// Dedicated local synthetic data only. Run against a built Next server on port 3010.
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { SignJWT } from "jose";
import { JSDOM } from "jsdom";
import { PUBLIC_FRAME_ANCESTORS, PRIVATE_FRAME_ANCESTORS, isPrivateFramePath } from "../src/lib/frame-policy.ts";
import { getDb } from "../src/lib/db.ts";
import { saveArticle } from "../src/lib/blog-workflow.ts";
import { relatedArticles } from "../src/lib/blog-related.ts";
import { createBlogApiToken } from "../src/lib/blog-api-tokens.ts";
const database = new URL(process.env.DATABASE_URL);
const origin = "http://127.0.0.1:3010";
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname) && database.pathname === "/qr_tz10");
assert.ok(process.env.JWT_SECRET?.startsWith("local-tz10-"));
const db = getDb(), run = Date.now(); let checks = 0;
const admin = await db.user.create({ data: { email: `tz10-${run}@example.invalid`, passwordHash: "unusable", isAdmin: true } });
const stranger = await db.user.create({ data: { email: `tz10-other-${run}@example.invalid`, passwordHash: "unusable" } });
const workspace = await db.workspace.create({ data: { name: "ТЗ10 синтетическая проверка", slug: `tz10-${run}`, memberships: { create: { userId: admin.id, role: "OWNER" } } } });
const sign = user => new SignJWT({ email: user.email, sv: user.sessionVersion }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("2h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
const session = await sign(admin), otherSession = await sign(stranger);
const actor = { actorId: admin.id, actorName: admin.email, source: "admin" };
const key = await createBlogApiToken(`ТЗ10 ${run}`, actor);
async function req(path, method = "GET", body, auth = "admin", csrf = "tz10") {
  const headers = { "Content-Type": "application/json" };
  if (auth === "api") headers.Authorization = `Bearer ${key.token}`;
  if (["admin", "other"].includes(auth)) { headers.Cookie = `qr_saas_session=${auth === "admin" ? session : otherSession}; qr_workspace_id=${workspace.id}; csrf_token=tz10`; headers.Origin = origin; headers["x-csrf-token"] = csrf; }
  const response = await fetch(origin + path, { method, headers, redirect: "manual", body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); let json; try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}
async function expect(path, method = "GET", body, auth = "admin", status = 200, csrf) {
  const r = await req(path, method, body, auth, csrf); assert.equal(r.response.status, status, `${method} ${path}: ${r.json?.error || r.text.slice(0, 150)}`); checks++; return r;
}
const qrs = [];
for (let n = 0; n < 4; n++) qrs.push(await db.qrCode.create({ data: { workspaceId: workspace.id, createdById: admin.id, name: `Тест ${n}`, kind: "DYNAMIC", contentType: "URL", shortCode: `tz10-${run}-${n}`, encodedContent: `${origin}/r/tz10-${run}-${n}`, currentTargetUrl: `https://example.com/original-${n}`, payload: { url: `https://example.com/original-${n}` }, createdAt: new Date(1000 + n) } }));
const third = qrs[2], snapshot = { shortCode: third.shortCode, encodedContent: third.encodedContent };
for (const qr of qrs.slice(0, 2)) await expect(`/api/qr/${qr.id}/target`, "PATCH", { targetUrl: `https://example.com/edited-${qr.id}` });
for (const [suffix, body] of [["/target", { targetUrl: "https://example.com/forbidden" }], ["", { payload: { url: "https://example.com/forbidden" } }], ["/smart-redirect", { default: "https://example.com/forbidden" }], ["/ab-test", { urlA: "https://example.com/a", urlB: "https://example.com/b" }]]) {
  const r = await expect(`/api/qr/${third.id}${suffix}`, "PATCH", body, "admin", 403); assert.equal(r.json.details.pricingUrl, "/pricing"); checks++;
}
await expect(`/api/qr/${third.id}/target`, "PATCH", { targetUrl: "https://example.com/other" }, "other", 401);
await expect(`/api/qr/${qrs[0].id}/target`, "PATCH", { targetUrl: "https://example.com/csrf" }, "admin", 403, "wrong");
await expect(`/api/qr/${third.id}`, "PATCH", { name: "Название меняется без смены назначения" });
let redirect = await expect(`/r/${third.shortCode}`, "GET", undefined, "none", 307); assert.equal(redirect.response.headers.get("location"), third.currentTargetUrl); checks++;
await expect(`/dashboard/qr/${third.id}/edit`, "GET", undefined, "admin", 307);
assert.equal((await req(`/dashboard/qr/${third.id}/edit`)).response.headers.get("location"), "/pricing"); checks++;
await expect(`/api/qr/${qrs[0].id}`, "DELETE");
await expect(`/api/qr/${third.id}/target`, "PATCH", { targetUrl: "https://example.com/promoted" });
await expect(`/api/qr/${qrs[3].id}/target`, "PATCH", { targetUrl: "https://example.com/locked" }, "admin", 403);
await db.workspace.update({ where: { id: workspace.id }, data: { plan: "PRO" } });
await db.subscription.create({ data: { workspaceId: workspace.id, plan: "PRO", status: "active", currentPeriodEnd: new Date(Date.now() + 86400000) } });
await expect(`/api/qr/${qrs[3].id}/target`, "PATCH", { targetUrl: "https://example.com/paid" });
await db.subscription.update({ where: { workspaceId: workspace.id }, data: { currentPeriodEnd: new Date(Date.now() - 86400000) } });
await expect(`/api/qr/${qrs[3].id}/target`, "PATCH", { targetUrl: "https://example.com/expired" }, "admin", 403);
await expect(`/api/qr/${third.id}`, "PATCH", { payload: { url: "https://example.com/still-free" } });
const after = await db.qrCode.findUniqueOrThrow({ where: { id: third.id } });
assert.equal(after.shortCode, snapshot.shortCode); assert.equal(after.encodedContent, snapshot.encodedContent); checks++;
const source = await saveArticle({ title: `Исходная статья ${run}`, slug: `tz10-source-${run}`, content: "## Исходная статья\n\nНужный текст перенесён Максимом.", format: "markdown", status: "published", tags: ["динамический qr"] }, actor);
const target = await saveArticle({ title: `Динамический QR ${run}`, slug: `tz10-target-${run}`, content: "## Смена ссылки\n\nЦелевая статья.", format: "markdown", status: "published", tags: ["динамический qr"] }, actor);
const sameTopic = await saveArticle({ title: `Статья по теме ${run}`, slug: `tz10-topic-${run}`, content: "## Динамика", format: "markdown", status: "published", tags: ["динамический qr"] }, actor);
const unrelated = await saveArticle({ title: `Другая статья ${run}`, slug: `tz10-other-${run}`, content: "## Другое", format: "markdown", status: "published" }, actor);
let patch = await expect(`/api/v1/articles/${target.id}`, "PATCH", { version: 1, relatedArticleIds: [source.id, sameTopic.id], tags: ["Динамический QR"], minorEdit: true }, "api");
assert.deepEqual(patch.json.data.relatedArticleIds, [source.id, sameTopic.id]); assert.deepEqual(patch.json.data.tags, ["динамический qr"]); checks++;
await expect(`/api/v1/articles/${target.id}`, "PATCH", { version: 2, relatedArticleIds: [target.id] }, "api", 400);
await expect(`/api/v1/articles/${target.id}`, "PATCH", { version: 2, relatedArticleIds: ["missing"] }, "api", 400);
const pending = await expect(`/api/v1/articles/${target.id}/revision`, "PUT", { version: 2, tags: ["Динамический QR", "Черновой тег"], relatedArticleIds: [sameTopic.id, unrelated.id] }, "api");
assert.deepEqual((await db.blogPost.findUniqueOrThrow({ where: { id: target.id } })).relatedArticleIds, [source.id, sameTopic.id]); checks++;
await expect(`/api/admin/blog/${target.id}/revision`, "POST", { id: pending.json.data.id, updatedAt: pending.json.data.updatedAt });
const reviewed = await db.blogPost.findUniqueOrThrow({ where: { id: target.id } });
assert.deepEqual(reviewed.relatedArticleIds, [sameTopic.id, unrelated.id]); assert.ok(reviewed.tags.includes("черновой тег")); checks++;
let list = await relatedArticles(patch.json.data); assert.deepEqual(list.slice(0, 2).map(p => p.id), [source.id, sameTopic.id]); checks++;
const mergePath = `/api/admin/blog/${source.id}/merge`, mergeBody = { targetId: target.id, expectedUpdatedAt: source.updatedAt.toISOString() };
for (const auth of ["none", "other", "api"]) await expect(mergePath, "POST", mergeBody, auth, 401);
await expect(mergePath, "POST", mergeBody, "admin", 403, "wrong");
await expect(mergePath, "POST", { ...mergeBody, targetId: source.id }, "admin", 400);
await expect(mergePath, "POST", { ...mergeBody, expectedUpdatedAt: new Date(0).toISOString() }, "admin", 409);
const merged = await expect(mergePath, "POST", mergeBody);
redirect = await expect(`/blog/${source.slug}`, "GET", undefined, "none", 301); assert.equal(new URL(redirect.response.headers.get("location"), origin).href, origin + `/blog/${target.slug}`); checks++;
await expect(`/blog/${target.slug}`, "GET", undefined, "none");
const hidden = await db.blogPost.findUniqueOrThrow({ where: { id: source.id } });
for (const field of ["slug", "content", "coverImageUrl", "contentUpdatedAt"]) assert.deepEqual(hidden[field], source[field]);
assert.equal(hidden.publishedAt, null); checks++;
assert.ok(!(await req("/sitemap.xml", "GET", undefined, "none")).text.includes(`/blog/${source.slug}<`));
list = await relatedArticles(patch.json.data); assert.ok(!list.some(p => p.id === source.id)); checks++;
await expect(`/api/admin/blog/${source.id}`, "PATCH", { published: true, expectedUpdatedAt: hidden.updatedAt.toISOString() }, "admin", 409);
await expect(`/api/v1/redirects/${merged.json.data.redirectId}`, "DELETE", undefined, "api", 404);
assert.ok(await db.blogRedirect.findUnique({ where: { id: merged.json.data.redirectId } })); checks++;
await expect(`/api/admin/blog/redirects/${merged.json.data.redirectId}`, "DELETE");
await expect(`/blog/${source.slug}`, "GET", undefined, "none", 404); // Removing a rule does not publish a draft.
// A pre-TZ10 history snapshot has no new arrays: restoring it must default them safely.
const oldRevision = await db.blogRevision.findFirstOrThrow({ where: { postId: unrelated.id }, orderBy: { number: "desc" } });
const oldSnapshot = { ...oldRevision.snapshot }; delete oldSnapshot.tags; delete oldSnapshot.relatedArticleIds;
const oldFormat = await db.blogRevision.create({ data: { postId: unrelated.id, number: oldRevision.number + 1, snapshot: oldSnapshot, actorName: "До ТЗ10", source: "system" } });
await expect(`/api/admin/blog/${unrelated.id}/restore`, "POST", { revisionId: oldFormat.id, expectedUpdatedAt: unrelated.updatedAt.toISOString() });
const restored = await db.blogPost.findUniqueOrThrow({ where: { id: unrelated.id } });
assert.deepEqual(restored.tags, []); assert.deepEqual(restored.relatedArticleIds, []); checks++;
const html = '<h2>Кафе</h2><a href="https://qr-s.ru/dashboard/create/menu">Меню</a><img src="https://qr-s.ru/media/blog/keep.webp">';
const legacy = await db.blogPost.create({ data: { title: "Кафе: legacy HTML", slug: `tz10-legacy-${run}`, content: html, publishedAt: new Date("2026-03-15"), firstPublishedAt: new Date("2026-03-15"), contentUpdatedAt: new Date("2026-03-15") } });
const maintenance = await expect(`/api/v1/articles/${legacy.id}`, "PATCH", { version: 0, minorEdit: true, content: html.replace('https://qr-s.ru/dashboard/create/menu', '/qr-menu') }, "api");
assert.equal(maintenance.json.data.contentUpdatedAt, legacy.contentUpdatedAt.toISOString()); assert.equal(maintenance.json.data.publishedAt, legacy.publishedAt.toISOString()); checks++;
await expect(`/api/v1/articles/${legacy.id}`, "PATCH", { version: 1, minorEdit: true, content: html + '<p>Сторонняя правка</p>' }, "api", 400);
for (const path of ["/", "/login", "/blog", "/qr-wifi", "/contacts", `/r/${third.shortCode}`]) {
  const r = await req(path, "HEAD", undefined, "none");
  assert.equal(r.response.headers.get("content-security-policy"), isPrivateFramePath(path) ? PRIVATE_FRAME_ANCESTORS : PUBLIC_FRAME_ANCESTORS, path);
  assert.equal(r.response.headers.get("x-frame-options"), "SAMEORIGIN", path);
  assert.equal(r.response.headers.get("strict-transport-security"), "max-age=31536000", path);
  assert.equal(r.response.headers.get("x-powered-by"), null, path); checks++;
}
const robots = (await req("/robots.txt", "GET", undefined, "none")).text;
assert.ok(robots.includes("Clean-param: static&next&plan") && !/^Disallow: \/api\/\s*$/m.test(robots)); assert.match(robots.trim(), /Sitemap: .*\/sitemap.xml$/); checks++;
const home = new JSDOM((await req("/", "GET", undefined, "none")).text).window.document;
assert.equal(home.querySelectorAll('a[href*="static="]').length, 0); checks++;
for (const path of ["/login", "/register", "/login?next=%2Fdashboard"]) {
  const doc = new JSDOM((await req(path, "GET", undefined, "none")).text).window.document;
  assert.ok(doc.querySelectorAll('a.qrs-auth-yandex').length > 0, `Expected Yandex link on ${path}`);
  for (const a of doc.querySelectorAll('a.qrs-auth-yandex')) assert.ok(a.rel.split(" ").includes("nofollow")); checks++;
}
for (const path of ["/qr-dlya-otzyvov-2gis", "/dynamic-qr"]) {
  const doc = new JSDOM((await req(path, "GET", undefined, "none")).text).window.document;
  assert.ok(doc.title.length <= 70, `${path}: ${doc.title}`); checks++;
}
const contacts = await expect("/contacts", "GET", undefined, "none");
assert.ok(contacts.text.includes("https://t.me/m_mvmolkov")); assert.ok((await req("/sitemap.xml", "GET", undefined, "none")).text.includes("/contacts</loc>")); checks++;
const schema = (await expect("/api/v1/openapi.json", "GET", undefined, "none")).text; assert.match(schema, /relatedArticleIds/); assert.match(schema, /"tags"/); checks++;
// Fixed slugs exercise the release maintenance tool on local data only.
for (const slug of ["primenenie-qr-kodov-v-cafe", "qr-kod-menu-restoran-kafe", "qr-kod-dlya-kalendarya", "dinamicheskij-i-staticheskij-qr-kod-raznica", "qr-kod-s-analitikoj-i-korotkoj-ssylkoj", "qr-kod-s-utm-metkami"]) await db.blogPost.upsert({ where: { slug }, create: { slug, title: slug, content: html, publishedAt: new Date("2026-03-15"), firstPublishedAt: new Date("2026-03-15"), contentUpdatedAt: new Date("2026-03-15") }, update: {} });
const toolEnv = { ...process.env, ARTICLE_API_ORIGIN: origin, ARTICLE_API_TOKEN: key.token };
for (const args of [[], ["--apply"]]) {
  const tool = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/tz10-article-maintenance.mjs", ...args], { env: toolEnv, encoding: "utf8" });
  assert.equal(tool.status, 0, tool.stderr); checks++;
}
const calendar = new JSDOM((await req("/blog/qr-kod-dlya-kalendarya", "GET", undefined, "none")).text).window.document;
assert.ok(calendar.title.length <= 70, calendar.title); checks++;
const out = "outputs/tz10-stage1"; mkdirSync(out, { recursive: true });
writeFileSync(`${out}/http-acceptance.json`, JSON.stringify({ checks, result: "passed", origin, database: database.pathname.slice(1), productionWrites: 0 }, null, 2));
writeFileSync("/tmp/tz10-fixture.json", JSON.stringify({ origin, session, workspaceId: workspace.id, targetId: target.id, targetSlug: target.slug, sourceId: source.id, sameTopicId: sameTopic.id, thirdId: third.id, lockedId: qrs[3].id }));
console.log(JSON.stringify({ checks, result: "passed" }));
await db.$disconnect();
