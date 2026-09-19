import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blogListIndexing,
  buildIndexableStaticPaths,
  findSitemapServiceUrls,
  getDefaultRobotsTxt,
  isDeniedSitemapPath,
  pathNeedsNoindexHeader,
  SITEMAP_DENY_PATHS,
} from "./seo-hygiene.ts";

describe("sitemap deny list", () => {
  it("never lists login, register, cabinet or customer QR destinations", () => {
    const paths = buildIndexableStaticPaths();
    assert.equal(paths.includes("/"), true);
    assert.equal(paths.includes("/blog"), true);
    assert.equal(paths.includes("/qr-lifetime"), true);
    assert.equal(paths.includes("/privacy-policy"), true);
    assert.equal(paths.includes("/qr-menu"), true);
    for (const deny of SITEMAP_DENY_PATHS) {
      assert.equal(paths.some((path) => path === deny || path.startsWith(`${deny}/`)), false, deny);
    }
    assert.equal(isDeniedSitemapPath("https://qr-s.ru/login"), true);
    assert.equal(isDeniedSitemapPath("https://qr-s.ru/register"), true);
    assert.equal(isDeniedSitemapPath("https://qr-s.ru/r/abc"), true);
    assert.equal(isDeniedSitemapPath("https://qr-s.ru/p/abc"), true);
    assert.equal(isDeniedSitemapPath("https://qr-s.ru/blog/qr-kod-dlya-kalendarya"), false);
    assert.deepEqual(findSitemapServiceUrls(["https://qr-s.ru/", "https://qr-s.ru/login"]), ["https://qr-s.ru/login"]);
  });
});

describe("default robots.txt", () => {
  it("closes private surfaces and keeps login crawlable so noindex can be read", () => {
    const txt = getDefaultRobotsTxt("https://qr-s.ru");
    assert.match(txt, /Disallow: \/dashboard/);
    assert.match(txt, /Disallow: \/admin/);
    assert.match(txt, /Disallow: \/api\//);
    assert.match(txt, /Sitemap: https:\/\/qr-s\.ru\/sitemap\.xml/);
    assert.equal(txt.includes("Disallow: /login"), false);
    assert.equal(txt.includes("Disallow: /register"), false);
    assert.equal(txt.includes("Disallow: /r"), false);
  });
});

describe("noindex headers", () => {
  it("marks auth, cabinet and printed QR hops, not marketing pages", () => {
    assert.equal(pathNeedsNoindexHeader("/login"), true);
    assert.equal(pathNeedsNoindexHeader("/r/short"), true);
    assert.equal(pathNeedsNoindexHeader("/p/short"), true);
    assert.equal(pathNeedsNoindexHeader("/preview/landings"), true);
    assert.equal(pathNeedsNoindexHeader("/"), false);
    assert.equal(pathNeedsNoindexHeader("/qr-menu"), false);
    assert.equal(pathNeedsNoindexHeader("/blog"), false);
  });
});

describe("blog list indexing", () => {
  it("indexes only the first unfiltered listing", () => {
    assert.deepEqual(blogListIndexing(1, null).robots, { index: true, follow: true });
    assert.equal(blogListIndexing(1, null).canonicalPath, "/blog");
    assert.deepEqual(blogListIndexing(2).robots, { index: false, follow: true });
    assert.deepEqual(blogListIndexing(1, "marketing").robots, { index: false, follow: true });
  });
});
