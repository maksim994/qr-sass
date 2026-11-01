import assert from "node:assert/strict";
import { test } from "node:test";
import { publicOrigin, publicSiteUrl } from "@/lib/public-url";
import { landingMetadata } from "./landing-seo.ts";
import { getSeoPageCatalog } from "./seo-page-registry.ts";

test("publicSiteUrl never emits a double slash after the host", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://qr-s.ru/";
  try {
    assert.equal(publicOrigin(), "https://qr-s.ru");
    assert.equal(publicSiteUrl("/blog/qr-kod-dlya-kalendarya"), "https://qr-s.ru/blog/qr-kod-dlya-kalendarya");
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});

test("canonical and og:url stay local and contain no doubled pathname separators for every landing", (context) => {
  const previous = process.env.APP_URL;
  context.after(() => { if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous; });
  for (const origin of ["https://qr-s.ru", "https://qr-s.ru/", "https://qr-s.ru////"]) {
    process.env.APP_URL = origin;
    for (const page of getSeoPageCatalog()) {
      const metadata = landingMetadata({ ...page, slug: page.path.replace(/^\//, ""), keywords: [] });
      for (const value of [metadata.alternates?.canonical, metadata.openGraph?.url]) {
        const url = new URL(String(value));
        assert.equal(url.origin, "https://qr-s.ru");
        assert.doesNotMatch(url.pathname, /\/\//, page.path);
      }
    }
    for (const path of ["blog/qr-kod-dlya-wifi-gostyam", "/blog/qr-kod-dlya-wifi-gostyam", "//blog//qr-kod-dlya-wifi-gostyam"]) {
      assert.equal(publicSiteUrl(path), "https://qr-s.ru/blog/qr-kod-dlya-wifi-gostyam");
    }
    assert.equal(publicOrigin(), "https://qr-s.ru");
  }
  assert.equal(publicSiteUrl("//external.test/path"), "https://qr-s.ru/external.test/path");
  assert.equal(publicSiteUrl("//blog//post?next=https://example.test/a//b#part"), "https://qr-s.ru/blog/post?next=https://example.test/a//b#part");
});
