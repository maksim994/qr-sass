// Integration acceptance against a dedicated local database and a running Next server.
// DATABASE_URL=... JWT_SECRET=... BLOG_TEST_ORIGIN=http://localhost:3006 node --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/verify-blog-editor.mjs
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { JSDOM } from "jsdom";
import { getDb } from "../src/lib/db.ts";
import { renderArticleBody } from "../src/lib/blog-render.ts";
import { sanitizeBlogFields } from "../src/lib/blog-sanitize.ts";

const database = new URL(process.env.DATABASE_URL);
const origin = process.env.BLOG_TEST_ORIGIN || "http://localhost:3006";
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname === "/qr_tz06_stage1", "Dedicated local database required");
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Local server required");
assert.ok(process.env.JWT_SECRET?.startsWith("local-tz06-"), "Synthetic local secret required");
const db = getDb();
const user = await db.user.upsert({ where: { email: "tz06-admin@example.invalid" }, create: { email: "tz06-admin@example.invalid", passwordHash: await bcrypt.hash("Local-TZ06-Only-2026!", 10), isAdmin: true }, update: {} });
const regular = await db.user.upsert({ where: { email: "tz06-reader@example.invalid" }, create: { email: "tz06-reader@example.invalid", passwordHash: "unusable", isAdmin: false }, update: {} });
async function session(account) {
  return new SignJWT({ email: account.email, sv: account.sessionVersion }).setProtectedHeader({ alg: "HS256" }).setSubject(account.id).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
}
const adminToken = await session(user), readerToken = await session(regular);
async function request(path, method = "GET", body, token = adminToken) {
  const response = await fetch(origin + path, { method, headers: { Cookie: `${token ? `qr_saas_session=${token}; ` : ""}csrf_token=local-test`, "x-csrf-token": "local-test", Origin: origin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const raw = await response.text();
  let json; try { json = JSON.parse(raw); } catch { json = null; }
  return { response, raw, json };
}
async function save(path, method, body) {
  const result = await request(path, method, body);
  assert.equal(result.response.status, 200, result.json?.error || result.raw.slice(0, 120));
  assert.equal(result.json.ok, true);
  return result.json.data;
}

const emptyPreview = await save("/api/admin/blog/preview", "POST", { content: "", format: "markdown", faq: [] });
assert.equal(emptyPreview.html, "");

const then = new Date("2026-07-14T08:00:00Z");
const sources = [
  '<h2 id="old">Раздел</h2>\n<p>Пробелы  и &amp; сущности.</p>',
  '<figure class="inline-quad" data-slot="inline_1"><img src="/x.webp" alt="Картинка"></figure><h2>Изображение</h2>',
  '<h2>Таблица</h2><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
  '<h2>Повтор</h2><p>Первый</p><h2>Повтор</h2><p>Второй</p>',
  '<h2>Ссылки</h2><p><a href="/blog/a/">Своя</a> <a href="https://example.com/x?utm_source=a&amp;utm_medium=b" target="_blank" rel="noopener">Внешняя</a></p>',
];
const runId = Date.now();
const legacySlugs = [];
for (let index = 0; index < sources.length; index++) {
  const slug = `tz06-legacy-${runId}-${index}`;
  legacySlugs.push(slug);
  const article = await db.blogPost.upsert({ where: { slug }, create: { slug, title: `Legacy ${index}`, content: sources[index], publishedAt: then, updatedAt: then }, update: {} });
  const bodyBefore = renderArticleBody(sanitizeBlogFields({ slug, content: article.content }).content, "html");
  const saved = await save(`/api/admin/blog/${article.id}`, "PATCH", { title: article.title, content: article.content, format: "html", published: true, expectedUpdatedAt: article.updatedAt.toISOString() });
  assert.equal(saved.content, article.content);
  assert.equal(saved.contentUpdatedAt, (article.contentUpdatedAt ?? article.updatedAt).toISOString());
  assert.equal(saved.publishedAt, then.toISOString());
  const page = await request(`/blog/${slug}`);
  const document = new JSDOM(page.raw).window.document;
  assert.equal(document.querySelector(".qrs-body")?.innerHTML, new JSDOM(`<div>${bodyBefore.html}</div>`).window.document.querySelector("div").innerHTML);
}

const faq = Array.from({ length: 6 }, (_, index) => ({ question: `Вопрос ${index + 1}?`, answer: `Ответ ${index + 1} & <текст>.` }));
const ids = ["size-table", "formula", "quiet-zone", "why-different", "file-format", "layout", "typography-checklist", "test-print", "channel"];
let markdown = ids.map((id, index) => `${index === 8 ? "[[faq]]\n\n" : ""}## Раздел ${index + 1} {#${id}}\n\nТекст синтетической проверки.`).join("\n\n");
markdown += '\n\n| Носитель | Размер |\n|---|---|\n|Визитка|25 мм|\n\n| A | B |\n|---|---|\n|1|2|\n\n';
markdown += Array.from({ length: 7 }, (_, i) => `[Внешняя ${i}](https://example.com/${i}?utm_source=qr-s&utm_medium=article&utm_campaign=razmer-qr-koda-dlya-pechati)`).join(" ");
markdown += '\n\n[Своя](/blog/tz06-legacy-0)\n\n<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[x](javascript:alert(1))\n\n<figure class="inline-quad" data-slot="inline_1"></figure>';
const draft = await save("/api/admin/blog", "POST", { title: "Тест Markdown — синтетический материал", slug: `tz06-markdown-${Date.now()}`, content: markdown, format: "markdown", faq, metaDescription: "Синтетическая проверка редактора.", authorName: "Мольков Максим" });
assert.equal((await request(`/blog/${draft.slug}`)).response.status, 404);
assert.ok(!(await request("/sitemap.xml")).raw.includes(`/blog/${draft.slug}`));
const preview = await save("/api/admin/blog/preview", "POST", { content: markdown, format: "markdown", faq, slug: draft.slug });
let published = await save(`/api/admin/blog/${draft.id}`, "PATCH", { published: true, expectedUpdatedAt: draft.updatedAt });
const document = new JSDOM((await request(`/blog/${draft.slug}`)).raw).window.document;
const body = document.querySelector(".qrs-body");
assert.equal(body.innerHTML, new JSDOM(`<div>${preview.html}</div>`).window.document.querySelector("div").innerHTML);
assert.deepEqual([...body.querySelectorAll("h2")].map(heading => heading.id), [...ids.slice(0, 8), "faq", "channel"]);
assert.equal(body.querySelectorAll(".qrs-article-table-scroll table thead").length, 2);
assert.equal(body.querySelectorAll('a[target="_blank"][rel="noopener"]').length, 7);
assert.equal(body.querySelectorAll('a[href^="/blog/"][target]').length, 0);
assert.equal(body.querySelectorAll("h3").length, 6);
assert.equal(body.querySelectorAll("figure[data-slot]").length, 0);
assert.equal(body.querySelectorAll("script, [onerror], a[href^='javascript:']").length, 0);
const graph = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => { const data = JSON.parse(node.textContent); return data["@graph"] || [data]; });
assert.equal(graph.filter(node => node["@type"] === "BlogPosting").length, 1);
assert.equal(graph.filter(node => node["@type"] === "FAQPage").length, 1);
assert.deepEqual(graph.find(node => node["@type"] === "FAQPage").mainEntity.map(item => item.name), faq.map(item => item.question));
const initialDate = published.contentUpdatedAt;
await request(`/api/blog/${draft.slug}/view`, "POST", {});
await request(`/api/blog/${draft.slug}/like`, "POST", {});
let row = await db.blogPost.findUniqueOrThrow({ where: { id: draft.id } });
assert.equal(row.contentUpdatedAt.toISOString(), initialDate);
published = await save(`/api/admin/blog/${draft.id}`, "PATCH", { content: `${markdown}\n\n`, minorEdit: false });
assert.equal(published.contentUpdatedAt, initialDate);
published = await save(`/api/admin/blog/${draft.id}`, "PATCH", { content: `${markdown}\n\nМелкая правка.`, minorEdit: true });
assert.equal(published.contentUpdatedAt, initialDate);
published = await save(`/api/admin/blog/${draft.id}`, "PATCH", { metaTitle: "Содержательная правка" });
assert.notEqual(published.contentUpdatedAt, initialDate);
const sitemap = (await request("/sitemap.xml")).raw;
assert.ok(sitemap.includes(`<lastmod>${published.contentUpdatedAt}</lastmod>`));
const modifiedDocument = new JSDOM((await request(`/blog/${draft.slug}`)).raw).window.document;
const modifiedGraph = [...modifiedDocument.querySelectorAll('script[type="application/ld+json"]')].flatMap(node => JSON.parse(node.textContent)["@graph"] || []);
assert.equal(modifiedGraph.find(node => node["@type"] === "BlogPosting").dateModified, published.contentUpdatedAt);
assert.equal(published.publishedAt, published.firstPublishedAt);
assert.equal((await request(`/api/admin/blog/${draft.id}`, "PATCH", { expectedUpdatedAt: draft.updatedAt, title: "Старая форма" })).response.status, 409);
assert.equal((await request(`/api/admin/blog/${draft.id}`, "PATCH", { slug: "changed" })).response.status, 403);
assert.equal((await request(`/api/admin/blog/${draft.id}`, "PATCH", { structuredData: "{wrong" })).response.status, 400);
for (const path of ["/api/admin/blog", "/api/admin/blog/preview", `/api/admin/blog/${draft.id}/convert`]) {
  const method = path === "/api/admin/blog" ? "GET" : "POST";
  for (const token of [null, readerToken]) assert.equal((await request(path, method, method === "GET" ? undefined : {}, token)).response.status, 401);
}
const legacy = await db.blogPost.findUniqueOrThrow({ where: { slug: legacySlugs[2] } });
const converted = await save(`/api/admin/blog/${legacy.id}/convert`, "POST");
assert.equal((await db.blogPost.findUniqueOrThrow({ where: { id: legacy.id } })).format, "html");
const next = await save(`/api/admin/blog/${legacy.id}`, "PATCH", { format: "markdown", content: converted.markdown, confirmConversion: true });
assert.equal(next.legacyHtml, legacy.content);
assert.equal((await request(`/api/admin/blog/${legacy.id}`, "PATCH", { legacyHtml: "forged" })).response.status, 400);
const report = { ok: true, legacyBodiesCompared: 5, h2: 10, tables: 2, externalLinks: 7, faq: 6, dates: true, auth: true, conversion: true, synthetic: true, articleId: draft.id, slug: draft.slug };
writeFileSync("outputs/tz06-stage1/integration.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
await db.$disconnect();
