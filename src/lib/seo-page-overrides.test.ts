import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSeoPageCatalogEntry } from "./seo-page-registry.ts";
import { invalidateSeoPageOverrideCache, mergeSeoFields, seoLengthWarnings, snapshotIsEmpty } from "./seo-page-overrides.ts";

describe("seo page overrides", () => {
  it("merges empty override fields with code defaults", () => {
    const defaults = {
      title: "Title from code",
      description: "Description from code",
      heading: "H1 from code",
      noindex: false,
    };
    const merged = mergeSeoFields(defaults, {
      metaTitle: "",
      metaDescription: null,
      heading: "  ",
      noindex: null,
    });
    assert.equal(merged.title, defaults.title);
    assert.equal(merged.description, defaults.description);
    assert.equal(merged.heading, defaults.heading);
    assert.equal(merged.noindex, false);
  });

  it("warns about long title and description", () => {
    const warnings = seoLengthWarnings("a".repeat(61), "b".repeat(161));
    assert.ok(warnings.title);
    assert.ok(warnings.description);
  });

  it("treats fully empty snapshot as removable override", () => {
    assert.equal(
      snapshotIsEmpty({ metaTitle: null, metaDescription: null, heading: null, noindex: null }),
      true,
    );
  });

  it("includes qr-dlya-max in catalog with updated defaults", () => {
    const entry = getSeoPageCatalogEntry("/qr-dlya-max");
    assert.ok(entry);
    assert.match(entry.title, /канала MAX, чата и профиля/i);
    assert.match(entry.description, /канал MAX/i);
    assert.match(entry.heading, /канала, чата или профиля/i);
  });

  it("allows cache invalidation hook", () => {
    invalidateSeoPageOverrideCache();
    assert.ok(true);
  });
});
