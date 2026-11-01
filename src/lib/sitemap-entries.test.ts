import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSitemapEntries, type SitemapPage, type SitemapPost } from "./sitemap-entries.ts";
import { getSeoPageCatalog } from "./seo-page-registry.ts";
import { blogPostIndexing } from "./seo-hygiene.ts";
import { applyPublicRobotsPolicy } from "./robots-policy.ts";

const post = (slug: string, fields: Partial<SitemapPost> = {}): SitemapPost => ({
  slug, publishedAt: new Date("2026-10-01"), updatedAt: new Date("2026-10-28"),
  contentUpdatedAt: new Date("2026-10-25"), images: ["https://qr-s.ru/media/blog/cover.webp"], ...fields,
});
const catalog = (): SitemapPage[] => getSeoPageCatalog().map(page => ({ ...page, updatedAt: null }));

test("sitemap covers the entire current SEO catalog including MAX and dynamically added published articles", (context) => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://qr-s.ru///";
  context.after(() => { if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous; });
  const pages = catalog();
  const entries = buildSitemapEntries(pages, [post("qr-kod-dlya-wifi-gostyam"), post("newly-published")]);
  for (const page of pages.filter(page => !page.noindex)) {
    assert.ok(entries.some(entry => new URL(entry.url).pathname === page.path), page.path);
  }
  assert.ok(entries.some(entry => new URL(entry.url).pathname === "/qr-dlya-max"));
  assert.ok(entries.some(entry => entry.url.endsWith("/blog/newly-published")));
  for (const entry of entries) {
    assert.doesNotMatch(new URL(entry.url).pathname, /\/\//);
    assert.equal(new URL(entry.url).origin, "https://qr-s.ru");
    assert.ok(entry.lastModified instanceof Date && Number.isFinite(entry.lastModified.getTime()), entry.url);
  }
  const again = buildSitemapEntries(pages, [post("qr-kod-dlya-wifi-gostyam"), post("newly-published")]);
  assert.deepEqual(entries, again, "lastmod must not change on each request");
});

test("sitemap excludes noindex, drafts, redirects and private URLs without dropping other entries or images", () => {
  const pages = catalog().map(page => page.path === "/qr-dlya-max" ? { ...page, noindex: true } : page);
  pages.push({ path: "/admin", noindex: false, updatedAt: null });
  const entries = buildSitemapEntries(pages, [
    post("qr-kod-na-instagram"), post("draft", { publishedAt: null }),
    post("staticheskiy-qr-kod-kak-sozdat-i-primenyat"), post("visible"), post("visible"),
  ]);
  const paths = entries.map(entry => new URL(entry.url).pathname);
  for (const denied of ["/qr-dlya-max", "/admin", "/blog/draft", "/blog/qr-kod-na-instagram", "/blog/staticheskiy-qr-kod-kak-sozdat-i-primenyat"]) {
    assert.ok(!paths.includes(denied), denied);
  }
  assert.equal(paths.filter(path => path === "/blog/visible").length, 1);
  assert.deepEqual(entries.find(entry => entry.url.endsWith("/blog/visible"))?.images, post("visible").images);
  assert.deepEqual(blogPostIndexing("qr-kod-na-instagram"), { index: false, follow: true });
  assert.deepEqual(blogPostIndexing("qr-kod-dlya-wifi-gostyam"), { index: true, follow: true });
});

test("lastmod uses source/editor dates and editorial blog dates rather than view counters", () => {
  const editedAt = new Date("2027-01-05T12:00:00Z");
  const pages = catalog().map(page => page.path === "/qr-dlya-max" ? { ...page, updatedAt: editedAt } : page);
  const entries = buildSitemapEntries(pages, [post("visible"), post("republished", { publishedAt: editedAt })]);
  assert.deepEqual(entries.find(entry => entry.url.endsWith("/qr-dlya-max"))?.lastModified, editedAt);
  assert.deepEqual(entries.find(entry => entry.url.endsWith("/blog/visible"))?.lastModified, new Date("2026-10-25"));
  assert.deepEqual(entries.find(entry => entry.url.endsWith("/blog"))?.lastModified, editedAt);
  const legacy = buildSitemapEntries([], [post("legacy", { contentUpdatedAt: null })]);
  assert.deepEqual(legacy[0].lastModified, new Date("2026-10-28"));
});

test("custom robots retain their rules and always advertise exactly one local sitemap", (context) => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://qr-s.ru/";
  context.after(() => { if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous; });
  const source = "User-agent: *\nDisallow: /admin\nSitemap: https://other.test/sitemap.xml";
  const result = applyPublicRobotsPolicy(source);
  assert.match(result, /Sitemap: https:\/\/qr-s.ru\/sitemap.xml/);
  assert.match(result, /Sitemap: https:\/\/other.test\/sitemap.xml/);
  assert.match(result, /Disallow: \/admin/);
  assert.equal(applyPublicRobotsPolicy(result).split("Sitemap: https://qr-s.ru/sitemap.xml").length - 1, 1);
  assert.equal(result.split("Sitemap: https://qr-s.ru/sitemap.xml").length - 1, 1);
});
