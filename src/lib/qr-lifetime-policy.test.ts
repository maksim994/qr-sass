import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { qrDeleteConfirm, qrUnavailablePath, QR_LIFETIME } from "./qr-lifetime-policy.ts";
import { libraryDestination, libraryHref, libraryStatus, parseLibraryQuery } from "./library-query.ts";
import { parseYookassaAmountRub, metadataString } from "./yookassa-amount.ts";
import { safeInternalPath } from "./safe-redirect.ts";

describe("qr lifetime policy", () => {
  it("warns that deleting a dynamic QR stops the printed short link", () => {
    assert.match(qrDeleteConfirm("DYNAMIC"), /короткая ссылка/i);
    assert.match(QR_LIFETIME.downloadDynamic, /тариф/i);
  });

  it("does not claim a static printed image can be switched off", () => {
    assert.match(qrDeleteConfirm("STATIC"), /продолжит работать/i);
  });

  it("builds an honest archived landing path", () => {
    assert.equal(qrUnavailablePath("archived"), "/unavailable?reason=archived");
    assert.equal(safeInternalPath("/unavailable?reason=archived", "/"), "/unavailable?reason=archived");
  });
});

describe("library query", () => {
  it("parses search, kind and page from the URL", () => {
    const query = parseLibraryQuery({ q: " меню ", kind: "dynamic", page: "3" });
    assert.equal(query.q, "меню");
    assert.equal(query.kind, "DYNAMIC");
    assert.equal(query.page, 3);
  });

  it("keeps filters in pagination links so page 2 does not drop old matches", () => {
    assert.equal(libraryHref({ q: "кафе", kind: "DYNAMIC", page: 2 }), "/dashboard/library?q=%D0%BA%D0%B0%D1%84%D0%B5&kind=DYNAMIC&page=2");
  });

  it("shows the live target for dynamic codes", () => {
    assert.equal(
      libraryDestination({ kind: "DYNAMIC", currentTargetUrl: "https://example.com/a", shortCode: "abc" }),
      "https://example.com/a",
    );
    assert.equal(libraryStatus({ kind: "DYNAMIC", expireAt: "2000-01-01T00:00:00.000Z", now: new Date("2026-09-18") }), "Срок истёк");
  });

  it("shows the encoded URL for a static code instead of a placeholder", () => {
    assert.equal(
      libraryDestination({
        kind: "STATIC",
        currentTargetUrl: null,
        shortCode: null,
        encodedContent: "https://example.com/menu",
      }),
      "https://example.com/menu",
    );
  });

  it("uses the public hosted path, not a bare short code", () => {
    assert.equal(
      libraryDestination({
        kind: "DYNAMIC",
        currentTargetUrl: null,
        shortCode: "abc12",
        publicPath: "/p/abc12",
      }),
      "/p/abc12",
    );
    assert.equal(
      libraryDestination({
        kind: "DYNAMIC",
        currentTargetUrl: null,
        shortCode: "vcf1",
        publicPath: "/v/vcf1",
      }),
      "/v/vcf1",
    );
  });
});

describe("yookassa amount", () => {
  it("accepts whole-ruble provider amounts and rejects kopecks", () => {
    assert.equal(parseYookassaAmountRub("990.00"), 990);
    assert.equal(parseYookassaAmountRub("990"), 990);
    assert.equal(parseYookassaAmountRub("990.50"), null);
    assert.equal(parseYookassaAmountRub(""), null);
  });

  it("reads trusted metadata strings", () => {
    assert.equal(metadataString({ workspaceId: "ws_1" }, "workspaceId"), "ws_1");
    assert.equal(metadataString({ workspaceId: "  " }, "workspaceId"), null);
  });
});
