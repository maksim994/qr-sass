// Synthetic fixtures only. Reuses the existing CI Postgres/Next job; no production access.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { getDb } from "../src/lib/db.ts";
import { generateBlogApiToken } from "../src/lib/blog-api-tokens.ts";
import { changePreviewToken, saveArticle } from "../src/lib/blog-workflow.ts";

const database = new URL(process.env.DATABASE_URL);
const origin = process.env.ARTICLE_PUBLISH_TEST_ORIGIN || "http://localhost:3126";
assert.equal(process.env.ARTICLE_PUBLISH_ISOLATED_TEST, "1", "Explicit isolated-test opt-in required");
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
assert.ok(["/qr_api_publish_test", "/qr_abuse_test"].includes(database.pathname), "Dedicated synthetic DB required");
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
assert.ok(process.env.QRS_ARTICLES_PUBLISH_TOKEN, "Synthetic publication credential required");

const db = getDb(), run = randomUUID(), postIds = [];
const generated = generateBlogApiToken();
const publishKey = process.env.QRS_ARTICLES_PUBLISH_TOKEN;
let tokenId, checks = 0;
async function request(path, method = "GET", body, key) {
  const response = await fetch(origin + path, { method, redirect: "manual", headers: {
    "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}),
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await response.text();
  let json;
  try { json = JSON.parse(raw); } catch { /* Page response. */ }
  return { response, json, raw };
}
async function expect(path, method, body, key, status = 200) {
  const result = await request(path, method, body, key);
  assert.equal(result.response.status, status, `${method} ${path}: ${result.json?.code ?? result.response.status}`);
  checks++;
  return result;
}
async function draft(label, format = "markdown") {
  const data = (await expect("/api/v1/articles", "POST", {
    title: `Synthetic ${label}`, slug: `publish-${run}-${label}`, content: format === "markdown" ? "## Test\n\n[[faq]]" : "<h2>Test</h2>",
    format, status: "published", faq: [{ question: "Вопрос?", answer: "смотри [тарифы](/pricing) и **условия**; [сайт](https://example.org)" }],
  }, generated.token, 201)).json.data;
  postIds.push(data.id);
  assert.equal(data.status, "draft");
  assert.equal(data.publishedAt, null);
  return data;
}
const actor = { actorId: null, actorName: "Synthetic fixture", source: "system" };

try {
  const token = await db.blogApiToken.create({ data: {
    name: `Publication test ${run}`, keyPrefix: generated.keyPrefix, keyHash: generated.keyHash, salt: generated.salt, createdById: `fixture-${run}`,
  } });
  tokenId = token.id;
  assert.equal(await db.blogEvent.count({ where: { type: "publish", source: "api", createdAt: { gt: new Date(Date.now() - 3_600_000) } } }), 0, "Publication quota must start empty in the isolated DB");
  const first = await draft("first");
  const path = `/api/v1/articles/${first.id}`;
  for (const key of [undefined, generated.token, "invalid", "qre_invalid"]) {
    const denied = await expect(`${path}/publish`, "POST", { version: first.version }, key, 403);
    assert.equal(denied.json.code, "FORBIDDEN");
  }
  await expect(path, "PATCH", { version: first.version, status: "published" }, generated.token, 403);
  await expect(path, "GET", undefined, publishKey, 401);
  for (const body of [{}, { version: "1" }, { version: -1 }, { version: first.version, content: "injected" }]) await expect(`${path}/publish`, "POST", body, publishKey, 400);
  await expect("/api/v1/articles/missing/publish", "POST", { version: 0 }, publishKey, 404);
  await expect(`${path}/publish`, "POST", { version: first.version - 1 }, publishKey, 409);
  assert.equal(await db.blogEvent.count({ where: { source: "api", type: "publish" } }), 0);
  await expect(`/blog/${first.slug}`, "GET", undefined, undefined, 404);
  assert.ok(!(await request("/sitemap.xml")).raw.includes(first.slug));
  assert.ok(!(await request("/blog")).raw.includes(first.slug));
  const previewPath = await changePreviewToken(first.id, actor);
  const preview = await expect(previewPath, "GET");
  const rendered = (await expect(`${path}/preview`, "POST", {}, generated.token)).json.data.html;
  for (const html of [preview.raw, rendered]) {
    assert.match(html, /смотри <a href="\/pricing">тарифы<\/a> и <strong>условия<\/strong>/);
    assert.match(html, /rel="noopener nofollow" target="_blank"/);
  }
  const started = Date.now();
  const published = (await expect(`${path}/publish`, "POST", { version: first.version }, publishKey)).json.data;
  assert.equal(published.status, "published");
  assert.equal(published.version, first.version + 1);
  assert.ok(new Date(published.publishedAt).getTime() >= started);
  assert.equal(published.firstPublishedAt, published.publishedAt);
  const page = await expect(`/blog/${first.slug}`, "GET");
  assert.match(page.raw, /смотри <a href="\/pricing">тарифы<\/a> и <strong>условия<\/strong>/);
  const jsonLd = [...page.raw.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const faq = jsonLd.flatMap(data => data["@graph"] ?? [data]).find(node => node["@type"] === "FAQPage");
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "смотри тарифы и условия; сайт");
  assert.ok((await expect("/sitemap.xml", "GET")).raw.includes(`/blog/${first.slug}`));
  assert.ok((await expect("/blog", "GET")).raw.includes(`/blog/${first.slug}`));
  const event = await db.blogEvent.findFirstOrThrow({ where: { postId: first.id, type: "publish" } });
  const revision = await db.blogRevision.findUniqueOrThrow({ where: { id: event.revisionId } });
  assert.equal(event.actorName, "api");
  assert.equal(event.source, "api");
  assert.equal(revision.number, published.version);
  assert.equal(revision.actorName, "api");
  assert.ok(event.createdAt instanceof Date);
  assert.ok(!JSON.stringify({ event, revision }).includes(publishKey));
  await expect(`${path}/publish`, "POST", { version: first.version }, publishKey, 409);
  await expect(`${path}/publish`, "POST", { version: published.version }, publishKey, 409);

  // A simultaneous edit and publish using the same version cannot both commit.
  const race = await draft("race");
  const raced = await Promise.all([
    request(`/api/v1/articles/${race.id}/publish`, "POST", { version: race.version }, publishKey),
    request(`/api/v1/articles/${race.id}`, "PATCH", { version: race.version, title: "Concurrent edit" }, generated.token),
  ]);
  assert.deepEqual(raced.map(result => result.response.status).sort(), [200, 409]);
  checks++;
  const legacy = await draft("legacy", "html");
  const savedHtml = (await expect(`/api/v1/articles/${legacy.id}/publish`, "POST", { version: legacy.version }, publishKey)).json.data;
  assert.equal(savedHtml.content, legacy.content);
  assert.equal(savedHtml.format, "html");
  assert.match((await expect(`/blog/${legacy.slug}`, "GET")).raw, /href="\/pricing">тарифы<\/a>/);
  const unpublished = await saveArticle({ status: "draft" }, actor, legacy.id);
  const restoredVersion = await db.blogRevision.findFirstOrThrow({ where: { postId: legacy.id }, orderBy: { number: "desc" } });
  const republished = (await expect(`/api/v1/articles/${legacy.id}/publish`, "POST", { version: restoredVersion.number }, publishKey)).json.data;
  assert.equal(republished.publishedAt, savedHtml.publishedAt);
  assert.equal(republished.firstPublishedAt, unpublished.firstPublishedAt.toISOString());

  // Seed only the remaining quota fixtures, then race the final slot over HTTP.
  const used = await db.blogEvent.count({ where: { type: "publish", source: "api" } });
  postIds.push(`quota-${run}`);
  await db.blogEvent.createMany({ data: Array.from({ length: 9 - used }, () => ({
    postId: `quota-${run}`, postTitle: "Synthetic quota", actorId: null, actorName: "api", source: "api", type: "publish", fields: [], createdAt: new Date(),
  })) });
  const a = await draft("quota-a"), b = await draft("quota-b");
  const burst = await Promise.all([a, b].map(post => request(`/api/v1/articles/${post.id}/publish`, "POST", { version: post.version }, publishKey)));
  assert.deepEqual(burst.map(result => result.response.status).sort(), [200, 429]);
  const limited = burst.find(result => result.response.status === 429);
  assert.equal(limited.json.code, "RATE_LIMITED");
  assert.ok(Number(limited.response.headers.get("retry-after")) > 0);
  assert.equal(await db.blogEvent.count({ where: { type: "publish", source: "api" } }), 10);
  await expect(`${path}/publish`, "POST", { version: first.version }, publishKey, 409);
  checks++;
  // Age only this run's events; a new request sees persisted rolling-window expiry.
  await db.blogEvent.updateMany({ where: { postId: { in: postIds }, type: "publish", source: "api" }, data: { createdAt: new Date(Date.now() - 3_601_000) } });
  const remaining = burst[0].response.status === 429 ? a : b;
  await expect(`/api/v1/articles/${remaining.id}/publish`, "POST", { version: remaining.version }, publishKey);
  if (process.env.ARTICLE_PUBLISH_TEST_LOG) {
    const log = readFileSync(process.env.ARTICLE_PUBLISH_TEST_LOG, "utf8");
    assert.ok(!log.includes(publishKey));
    assert.ok(!log.includes(generated.token));
    const entries = log.split("\n").filter(line => line.startsWith("{"));
    const entry = entries.map(line => JSON.parse(line)).find(item => item.message === "Article published" && item.details?.id === first.id);
    assert.equal(entry.details.actor, "api");
    assert.equal(entry.details.version, published.version);
    assert.equal(entry.details.reviewedVersion, first.version);
    assert.ok(!Number.isNaN(Date.parse(entry.timestamp)));
    checks++;
  }
  console.log(JSON.stringify({ success: true, checks, faqPreviewAndLive: true, faqPlainJsonLd: true, publishedPageAndSitemap: true, concurrentVersionProtection: true, rollingQuota: [200, 429] }));
} finally {
  await db.blogPost.deleteMany({ where: { id: { in: postIds } } });
  await db.blogEvent.deleteMany({ where: { postId: { in: postIds } } });
  await db.blogRevision.deleteMany({ where: { postId: { in: postIds } } });
  if (tokenId) await db.blogApiToken.delete({ where: { id: tokenId } });
  await db.$disconnect();
}
