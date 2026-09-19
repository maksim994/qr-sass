import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { getSeoPages } from "./seo-content.ts";
import { landingDetails } from "./landing-details.ts";
import { landingMetadata, landingStructuredData } from "./landing-seo.ts";
import { safePostAuthPath } from "./safe-redirect.ts";
import { buildIndexableStaticPaths } from "./seo-hygiene.ts";

// Public landing inventory, social assets and post-auth destinations must stay in sync.
describe("public landing SEO contract", () => {
  it("keeps all published landings discoverable with distinct content and existing PNG previews", () => {
    const pages = getSeoPages();
    assert.equal(new Set(pages.map(page => page.title)).size, pages.length);
    assert.equal(new Set(pages.map(page => page.description)).size, pages.length);
    for (const page of pages) {
      const detail = landingDetails[page.slug];
      assert.ok(detail, `Missing content for ${page.slug}`);
      assert.ok(buildIndexableStaticPaths().includes(`/${page.slug}`));
      assert.equal(safePostAuthPath(detail.next, "/dashboard"), detail.next);
      const png = readFileSync(new URL(`../../public/images/landings/${page.slug}.png`, import.meta.url));
      assert.equal(png.subarray(1, 4).toString(), "PNG");
      assert.equal(png.readUInt32BE(16), 1200);
      assert.equal(png.readUInt32BE(20), 630);
    }
  });
  it("does not expand post-auth redirects beyond the two explicit destinations", () => {
    for (const path of ["/dashboard/bulk/delete", "/dashboard/analytics/export", "/admin", "//evil.test/dashboard/bulk", "/dashboard/bulk?next=https://evil.test"]) {
      const expected = path.startsWith("/dashboard/bulk?") ? "/dashboard/bulk" : "/dashboard";
      assert.equal(safePostAuthPath(path), expected);
    }
  });
  it("uses the same canonical identity for metadata, sharing and structured breadcrumbs", () => {
    for (const page of getSeoPages()) {
      const metadata = landingMetadata(page);
      const data = landingStructuredData(page, landingDetails[page.slug].label);
      assert.equal(metadata.alternates?.canonical, data["@graph"][0].url);
      assert.equal(metadata.openGraph?.url, metadata.alternates?.canonical);
      assert.equal(data["@graph"][1].itemListElement?.[1].item, metadata.alternates?.canonical);
      assert.equal(metadata.twitter?.title, page.title);
      assert.deepEqual(metadata.robots, { index: true, follow: true });
    }
  });
});
