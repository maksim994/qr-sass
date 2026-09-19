import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getScenarioLanding, SCENARIO_LANDING_SLUGS, scenarioLandings } from "./scenario-landings.ts";
import { splitPopularQrTypes, qrTypes, POPULAR_QR_TYPES } from "./qr-types.ts";
import { QR_LIFETIME } from "./qr-lifetime-policy.ts";
import { getSeoPage } from "./seo-content.ts";
import { safePostAuthPath } from "./safe-redirect.ts";

describe("scenario landings", () => {
  it("covers exactly two public scenarios with unique headings", () => {
    assert.deepEqual([...SCENARIO_LANDING_SLUGS], ["qr-menu", "qr-for-packaging"]);
    const headings = SCENARIO_LANDING_SLUGS.map((slug) => scenarioLandings[slug].heading);
    assert.equal(new Set(headings).size, 2);
    assert.match(scenarioLandings["qr-menu"].heading, /меню/i);
    assert.match(scenarioLandings["qr-for-packaging"].heading, /упаковк/i);
  });

  it("pre-fills a dynamic URL form without stuffing a fake destination", () => {
    for (const slug of SCENARIO_LANDING_SLUGS) {
      const page = scenarioLandings[slug];
      assert.equal(page.defaultKind, "DYNAMIC");
      assert.ok(page.placeholder.startsWith("https://"));
      assert.ok(page.submitLabel.length > 8);
      assert.equal(getScenarioLanding(slug)?.slug, slug);
    }
  });

  it("keeps hosted-type next paths inside post-auth allowlist", () => {
    assert.equal(safePostAuthPath("/dashboard/create/menu", "/dashboard"), "/dashboard/create/menu");
    assert.equal(safePostAuthPath("/dashboard/create/pdf", "/dashboard"), "/dashboard/create/pdf");
  });

  it("stays aligned with SEO titles for the same URLs", () => {
    assert.equal(getSeoPage("qr-menu")?.heading, scenarioLandings["qr-menu"].heading);
    assert.equal(getSeoPage("qr-for-packaging")?.heading, scenarioLandings["qr-for-packaging"].heading);
  });
});

describe("popular QR types", () => {
  it("puts URL, menu, Wi-Fi and vCard first", () => {
    const { popular, rest } = splitPopularQrTypes(qrTypes);
    assert.deepEqual(
      popular.map((item) => item.type),
      [...POPULAR_QR_TYPES],
    );
    assert.ok(rest.every((item) => !POPULAR_QR_TYPES.includes(item.type as (typeof POPULAR_QR_TYPES)[number])));
    assert.equal(popular.length + rest.length, qrTypes.length);
  });
});

describe("printed QR after trial", () => {
  it("states that printed dynamic codes keep opening", () => {
    assert.match(QR_LIFETIME.billing, /продолжают открываться/i);
    assert.match(QR_LIFETIME.billing, /Новые динамические/i);
  });
});
