// Synthetic fixtures only. Opt-in and loopback/database guards precede every write.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getDb } from "../src/lib/db.ts";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
const origin = process.env.SEO_PAGES_TEST_ORIGIN || "http://localhost:3119";
assert.equal(process.env.SEO_PAGES_ISOLATED_TEST, "1");
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
assert.ok(["/qr_abuse_test", "/qr_seo_override_test"].includes(database.pathname));
assert.ok(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const db = getDb();
assert.equal(await db.seoPageOverride.count(), 0, "Requires a clean synthetic SEO catalog");
assert.equal(await db.seoPageOverrideRevision.count(), 0);
const run = randomUUID();
const users = [];
let passed = 0;
function check(label) { console.log(`PASS ${label}`); passed++; }
const blank = { metaTitle: null, metaDescription: null, heading: null, noindex: null };
const paths = ["/", "/blog", "/pricing", "/contacts", "/skaner-qr-koda", "/qr-s-logotipom", "/personal-data-consent", "/changelog", "/qr-lifetime", "/privacy-policy", "/terms-of-service", "/qr-menu", "/qr-for-packaging", "/qr-dlya-max", "/dynamic-qr"];
const touchedPaths = new Set();

async function session(isAdmin) {
  const user = await db.user.create({ data: { email: `seo-${isAdmin}-${run}@example.test`, passwordHash: "unusable-fixture-password", isAdmin } });
  users.push(user.id);
  return new SignJWT({ sub: user.id, email: user.email, sv: 0 }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET));
}
function headers(token) {
  return { ...(token ? { Cookie: `qr_saas_session=${token}; csrf_token=seo-fixture`, Origin: origin, "X-CSRF-Token": "seo-fixture" } : {}), "Content-Type": "application/json" };
}
async function api(path, token, method = "GET", body) {
  const response = await fetch(origin + path, { method, headers: headers(token), ...(body ? { body: JSON.stringify(body) } : {}), redirect: "manual" });
  const data = await response.json();
  return { status: response.status, data: data.data, code: data.code, headers: response.headers, raw: data };
}
async function save(path, token, expectedUpdatedAt, fields = blank) {
  touchedPaths.add(path);
  return api("/api/admin/seo-pages", token, "PATCH", { path, ...fields, expectedUpdatedAt });
}
function decode(value) {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, number) => String.fromCodePoint(number[0] === "x" ? parseInt(number.slice(1), 16) : Number(number)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, "\u00a0").replace(/&amp;/g, "&");
}
function documentFields(html) {
  const meta = (name) => decode(html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] || "");
  return { title: decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ""), description: meta("description"), robots: meta("robots"), heading: decode((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || "").replace(/<[^>]*>/g, "")) };
}
async function page(path) {
  const response = await fetch(origin + path, { headers: { "User-Agent": "Googlebot" } });
  const html = await response.text();
  assert.equal(response.status, 200, `${path}: ${html.slice(0, 500)}`);
  return documentFields(html);
}

try {
  const admin = await session(true);
  const member = await session(false);
  for (const token of [undefined, member]) {
    assert.equal((await api("/api/admin/seo-pages", token)).status, 401);
    assert.equal((await api("/api/admin/seo-pages/history?path=/qr-dlya-max", token)).status, 401);
    assert.equal((await save("/qr-dlya-max", token, null)).status, 401);
    assert.equal((await api("/api/admin/seo-pages/restore", token, "POST", { path: "/qr-dlya-max", revisionId: "fixture", expectedUpdatedAt: null })).status, 401);
  }
  check("all SEO API handlers reject anonymous and non-admin sessions");
  const catalog = await api("/api/admin/seo-pages", admin);
  assert.equal(catalog.status, 200);
  assert.match(catalog.headers.get("cache-control"), /no-store/);
  const rows = new Map(catalog.data.rows.map(row => [row.path, row]));
  assert.equal((await api("/api/admin/seo-pages", admin, "PATCH", { path: "/qr-dlya-max", ...blank })).status, 400);
  check("admin reads are private and mutations require an explicit expected version");

  for (const [path, row] of rows) {
    if (paths.includes(path)) continue;
    const defaults = await page(path);
    assert.equal(defaults.title, row.resolved.title, `${path}: catalog title`);
    assert.equal(defaults.description, row.resolved.description, `${path}: catalog description`);
    assert.equal(defaults.heading, row.resolved.heading, `${path}: catalog H1`);
  }
  check("every additional catalog URL exists and its preview matches the rendered defaults");

  for (const path of paths) {
    const defaults = await page(path);
    assert.equal(defaults.title, rows.get(path).resolved.title, `${path}: catalog title equals the rendered default`);
    assert.equal(defaults.description, rows.get(path).resolved.description, `${path}: catalog description`);
    assert.equal(defaults.heading, rows.get(path).resolved.heading, `${path}: catalog H1`);
    const fields = { metaTitle: `SEO title ${path}`, metaDescription: `SEO description ${path}`, heading: `SEO heading ${path}`, noindex: true };
    const saved = await save(path, admin, null, fields);
    assert.equal(saved.status, 200, JSON.stringify(saved.raw));
    const rendered = await page(path);
    assert.equal(rendered.title, fields.metaTitle, path);
    assert.equal(rendered.description, fields.metaDescription, path);
    assert.equal(rendered.heading, fields.heading, path);
    assert.match(rendered.robots, /noindex/, path);
    const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
    const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(decode(match[1])).pathname);
    assert.ok(!locs.includes(path), `${path}: noindex excluded from sitemap`);
    const cleared = await save(path, admin, saved.data.updatedAt);
    assert.equal(cleared.status, 200);
    const restoredDefaults = await page(path);
    assert.deepEqual(restoredDefaults, defaults, `${path}: clearing restores the actual code defaults`);
    check(`metadata, H1, robots, sitemap and clearing work for ${path}`);
  }

  const path = "/qr-dlya-max";
  const current = await db.seoPageOverride.findUniqueOrThrow({ where: { path } });
  const expected = current.updatedAt.toISOString();
  const responses = await Promise.all(["A", "B"].map(value => save(path, admin, expected, { ...blank, metaTitle: `Concurrent ${value}` })));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const history = await api(`/api/admin/seo-pages/history?path=${path}`, admin);
  const beforeClear = await db.seoPageOverride.findUniqueOrThrow({ where: { path } });
  assert.equal(history.data.revisions.length, 3, "Only the successful concurrent write has a revision");
  assert.deepEqual(history.data.revisions.map(revision => revision.number), [3, 2, 1]);
  assert.equal((await save(path, admin, null)).status, 409, "A stale first-time editor cannot overwrite an existing record");
  check("concurrent existing saves and stale null versions cannot overwrite another editor");

  const emptyPath = [...rows.keys()].find(candidate => !touchedPaths.has(candidate));
  assert.ok(emptyPath);
  const emptySaved = await save(emptyPath, admin, null);
  assert.equal(emptySaved.status, 200);
  assert.equal((await save(emptyPath, admin, emptySaved.data.updatedAt, { ...blank, heading: "After first empty save" })).status, 200);
  check("an empty first save does not block the next edit");
  // A second slug was not edited in the public-page loop: exercise concurrent INSERT.
  const freshPath = [...rows.keys()].find(candidate => !touchedPaths.has(candidate));
  assert.ok(freshPath);
  const creates = await Promise.all(["A", "B"].map(value => save(freshPath, admin, null, { ...blank, heading: `Concurrent first ${value}` })));
  assert.deepEqual(creates.map(response => response.status).sort(), [200, 409]);
  assert.equal(await db.seoPageOverrideRevision.count({ where: { path: freshPath } }), 1);
  check("concurrent first saves create one row and one revision");

  const revision = history.data.revisions.find(item => item.number === 1);
  const restored = await api("/api/admin/seo-pages/restore", admin, "POST", { path, revisionId: revision.id, expectedUpdatedAt: beforeClear.updatedAt.toISOString() });
  assert.equal(restored.status, 200, JSON.stringify(restored.raw));
  assert.equal((await save(path, admin, restored.data.updatedAt, { ...blank, heading: "After empty restore" })).status, 200);
  assert.equal((await api("/api/admin/seo-pages/restore", admin, "POST", { path, revisionId: revision.id, expectedUpdatedAt: beforeClear.updatedAt.toISOString() })).status, 409);
  check("restoring empty fields retains a usable version; stale restores conflict");
  console.log(`SEO integration: ${passed} checks passed`);
} finally {
  // Only paths and users created in this explicitly isolated synthetic run.
  await db.seoPageOverrideRevision.deleteMany({ where: { path: { in: [...touchedPaths] } } });
  await db.seoPageOverride.deleteMany({ where: { path: { in: [...touchedPaths] } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
