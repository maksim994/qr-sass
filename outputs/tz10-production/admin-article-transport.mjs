// Release-only transport for the approved TZ-10 plan. No persistent API key.
// Reads use Prisma; all writes go through the existing authenticated admin API.
// Run inside the server's release container, never with a downloaded production DB.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

registerHooks({ resolve(specifier, context, next) {
  return next(["next/headers", "next/navigation"].includes(specifier) ? `${specifier}.js` : specifier, context);
} });
const fromRoot = path => pathToFileURL(`${process.cwd()}/${path}`).href;
const { createSessionToken } = await import(fromRoot("src/lib/auth.ts"));
const { replacePrivateArticleLinks } = await import(fromRoot("src/lib/blog-public-links.ts"));
const db = new PrismaClient();
const json = value => JSON.parse(JSON.stringify(value));
const ignoreCounters = ({ views, likes, ...row }) => row;
const baseline = JSON.parse(readFileSync(process.env.ARTICLE_APPROVED_BASELINE, "utf8"));
assert.equal(baseline.length, 6);
const origin = process.env.ARTICLE_API_ORIGIN || "https://qr-s.ru";
assert.ok(["https://qr-s.ru", "http://127.0.0.1:3010"].includes(origin));
const endpoint = process.env.ARTICLE_ADMIN_ENDPOINT || origin;
assert.ok(endpoint === origin || /^http:\/\/qr-tz10-candidate:3000$/.test(endpoint));
const initial = new Map();
async function read(id) {
  return db.$transaction(async tx => {
    const post = await tx.blogPost.findUniqueOrThrow({ where: { id } });
    const latest = await tx.blogRevision.findFirst({ where: { postId: id }, orderBy: { number: "desc" } });
    return json({ ...post, version: latest?.number ?? 0 });
  }, { isolationLevel: "RepeatableRead" });
}
try {
  // Compare every reviewed source before the first write, including menu (no patch).
  for (const approved of baseline) {
    const current = await read(approved.id);
    const { version, ...raw } = current;
    assert.deepEqual(ignoreCounters(raw), ignoreCounters({ tags: [], relatedArticleIds: [], ...approved }), `Reviewed source changed: ${approved.slug}`);
    initial.set(current.id, current);
  }
  console.log(JSON.stringify({ recheckedSources: initial.size, versions: [...initial.values()].map(p => ({ slug: p.slug, version: p.version, updatedAt: p.updatedAt })) }));
  const bySlug = slug => [...initial.values()].find(p => p.slug === slug);
  const cafe = bySlug("primenenie-qr-kodov-v-cafe");
  const calendar = bySlug("qr-kod-dlya-kalendarya");
  const main = bySlug("dinamicheskij-i-staticheskij-qr-kod-raznica");
  const related = ["qr-kod-s-analitikoj-i-korotkoj-ssylkoj", "qr-kod-s-utm-metkami"].map(bySlug);
  assert.ok([cafe, calendar, main, ...related].every(Boolean));
  const tags = ["динамический qr", "смена ссылки"];
  const allowed = new Map([
    [cafe.id, { content: replacePrivateArticleLinks(cafe.content) }],
    [calendar.id, { metaTitle: "QR-код для календаря: ссылка на событие" }],
    [main.id, { tags, relatedArticleIds: related.map(p => p.id) }],
    ...related.map(p => [p.id, { tags: [...new Set([...p.tags, ...tags])] }]),
  ]);
  const admins = await db.user.findMany({ where: { isAdmin: true }, select: { id: true, email: true, sessionVersion: true } });
  assert.equal(admins.length, 1, "Choose the authorized admin explicitly if more than one exists");
  const admin = admins[0];
  // Use the application's session implementation; credentials stay in this process.
  const session = await createSessionToken({ sub: admin.id, email: admin.email, sv: admin.sessionVersion });
  const csrf = randomUUID();
  const originalFetch = globalThis.fetch;
  const applied = new Set();
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    assert.equal(url.origin, origin);
    assert.ok(url.pathname.startsWith("/api/v1/articles"));
    const id = url.pathname.slice("/api/v1/articles/".length);
    if (!options.method || options.method === "GET") {
      const data = url.searchParams.has("slug")
        ? { items: [...initial.values()].filter(p => p.slug === url.searchParams.get("slug")) }
        : initial.get(id);
      assert.ok(data);
      return Response.json({ ok: true, data });
    }
    assert.equal(options.method, "PATCH");
    assert.ok(allowed.has(id) && !applied.has(id));
    const { version, minorEdit, comment, ...patch } = JSON.parse(options.body);
    assert.equal(minorEdit, true);
    assert.deepEqual(patch, allowed.get(id), "Only the approved patch may be sent");
    const before = initial.get(id);
    const fresh = await read(id);
    assert.equal(version, fresh.version);
    assert.equal(version, before.version);
    assert.equal(fresh.updatedAt, before.updatedAt);
    const response = await originalFetch(`${endpoint}/api/admin/blog/${id}`, {
      method: "PATCH", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json", Origin: origin,
        Cookie: `qr_saas_session=${session}; csrf_token=${csrf}`, "x-csrf-token": csrf },
      body: JSON.stringify({ ...patch, minorEdit, comment, expectedUpdatedAt: before.updatedAt }),
    });
    assert.equal(response.status, 200, `Admin PATCH failed: ${response.status}`);
    const result = await response.json();
    assert.equal(result.ok, true);
    const after = await read(id);
    for (const [key, value] of Object.entries(before)) {
      if (["version", "updatedAt", "views", "likes"].includes(key)) continue;
      assert.deepEqual(after[key], patch[key] ?? value, `Unexpected change: ${before.slug}.${key}`);
    }
    assert.equal(after.version, version + 1);
    applied.add(id);
    console.log(JSON.stringify({ savedThrough: "admin-api", slug: before.slug, previousVersion: version, version: after.version, fields: Object.keys(patch), datesPreserved: true }));
    return Response.json({ ok: true, data: after });
  };
  process.env.ARTICLE_API_TOKEN = "local-admin-transport-placeholder";
  delete process.env.ARTICLE_DRY_RUN_SNAPSHOT;
  await import(fromRoot("scripts/tz10-article-maintenance.mjs"));
  assert.equal(applied.size, process.argv.includes("--apply") ? 5 : 0);
} finally {
  await db.$disconnect();
}
