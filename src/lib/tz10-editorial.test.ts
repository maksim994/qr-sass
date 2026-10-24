import assert from "node:assert/strict";
import { test } from "node:test";
import { rankRelatedArticles } from "./blog-related.ts";
import { replacePrivateArticleLinks, isPublicLinkMaintenance } from "./blog-public-links.ts";
import { applyPublicRobotsPolicy } from "./robots-policy.ts";
import { getDefaultRobotsTxt } from "./seo-hygiene.ts";
import { allowBlogMediaRobots } from "./blog-media-robots.ts";
import { PUBLIC_FRAME_ANCESTORS, PRIVATE_FRAME_ANCESTORS, METRIKA_FRAME_ORIGINS, isPrivateFramePath } from "./frame-policy.ts";
import { blogEditorSchema } from "./blog-editor.ts";

test("related articles: manual order, category, common tag count, date, exclude self/drafts", () => {
  const post = { id: "self", categoryId: "qr", tags: ["dynamic", "link"], relatedArticleIds: ["manual", "draft", "self", "missing"] };
  const c = (id: string, categoryId: string, tags: string[], date = "2026-01-01") => ({ id, categoryId, tags, publishedAt: new Date(date) });
  const candidates = [c("new", "other", [], "2026-10-21"), c("topic", "qr", ["dynamic", "link"]), c("less", "qr", ["link"]), c("manual", "other", []), c("self", "qr", ["dynamic"]), { ...c("draft", "qr", []), publishedAt: null }];
  assert.deepEqual(rankRelatedArticles(post, candidates), ["manual", "topic", "less"]);
  assert.deepEqual(rankRelatedArticles({ ...post, categoryId: null, relatedArticleIds: [] }, candidates), ["topic", "less", "new"]);
  assert.deepEqual(rankRelatedArticles({ ...post, tags: [], relatedArticleIds: [] }, []), []);
});
test("legacy HTML link maintenance preserves images/bytes and rejects unrelated changes", () => {
  const html = `<h2>Текст</h2><a class='cta' href='https://qr-s.ru/dashboard/create/menu'>Меню</a><a href="/dashboard/create/url">Ссылка</a><a href="/dashboard/billing">Оплата</a><img src="https://qr-s.ru/media/blog/old.webp">`;
  const after = replacePrivateArticleLinks(html);
  assert.ok(isPublicLinkMaintenance(html, after));
  assert.match(after, /href='\/qr-menu'/); assert.match(after, /href="\/#create-qr"/); assert.match(after, /href="\/pricing"/);
  assert.match(after, /<img src="https:\/\/qr-s.ru\/media\/blog\/old.webp">/);
  assert.ok(!isPublicLinkMaintenance(html, after + "new text"));
  assert.ok(!isPublicLinkMaintenance(html, html));
  assert.equal(replacePrivateArticleLinks('<a href="https://evil.test/dashboard/billing">x</a>'), '<a href="https://evil.test/dashboard/billing">x</a>');
});
test("configured robots keep public API files crawlable and put Sitemap last", (context) => {
  // This fixture exercises production canonicals independently of a developer's local APP_URL.
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://qr-s.ru/";
  context.after(() => { if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous; });
  for (const source of [getDefaultRobotsTxt(), "User-agent: *\nDisallow: /dashboard/\nDisallow: /admin/\nDisallow: /api/\nSitemap: https://qr-s.ru/sitemap.xml"]) {
    const txt = applyPublicRobotsPolicy(allowBlogMediaRobots(source));
    assert.match(txt, /^User-agent: \*/);
    assert.match(txt, /Allow: \/media\//);
    assert.match(txt, /Disallow: \/api\/auth\//);
    assert.doesNotMatch(txt, /Disallow: \/api\/\s*$/m);
    assert.doesNotMatch(txt, /Disallow: \/(?:dashboard|admin)\/\s*$/m);
    assert.match(txt, /Clean-param: static&next&plan/);
    assert.match(txt.trim(), /Sitemap: https:\/\/qr-s.ru\/sitemap.xml$/);
    assert.equal(applyPublicRobotsPolicy(allowBlogMediaRobots(txt)), txt);
  }
});
test("editorial fields normalize tags and reject duplicate related IDs", () => {
  assert.deepEqual(blogEditorSchema.parse({ tags: [" Смена Ссылки "] }).tags, ["смена ссылки"]);
  assert.ok(!blogEditorSchema.safeParse({ relatedArticleIds: ["x", "x"] }).success);
});

test("Metrika frame policy trusts explicit HTTPS domains while private routes stay same-origin", () => {
  assert.match(PUBLIC_FRAME_ANCESTORS, /^frame-ancestors 'self' https:/);
  assert.ok(METRIKA_FRAME_ORIGINS.includes("https://metrika.yandex.ru"));
  assert.ok(METRIKA_FRAME_ORIGINS.includes("https://*.webvisor.com"));
  assert.ok(!PUBLIC_FRAME_ANCESTORS.includes("https://*.yandex.ru"));
  assert.ok(!PUBLIC_FRAME_ANCESTORS.includes("http://"));
  assert.equal(PRIVATE_FRAME_ANCESTORS, "frame-ancestors 'self'");
  for (const path of ["/dashboard", "/dashboard/qr/1", "/admin/blog", "/api/auth/yandex", "/login", "/r/printed"]) assert.ok(isPrivateFramePath(path));
  for (const path of ["/", "/contacts", "/qr-wifi", "/pricing", "/blog/qr"]) assert.ok(!isPrivateFramePath(path));
});
