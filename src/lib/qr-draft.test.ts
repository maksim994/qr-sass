import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createQrContinuePath,
  nameFromUrl,
  normalizeDraftUrl,
  parseCreatePrefill,
  parseQrCreateDraft,
} from "./qr-draft.ts";
import { safePostAuthPath } from "./safe-redirect.ts";

describe("qr draft", () => {
  it("adds https and rejects unsafe schemes", () => {
    assert.equal(normalizeDraftUrl("cafe.example/menu"), "https://cafe.example/menu");
    assert.equal(normalizeDraftUrl("https://cafe.example/menu"), "https://cafe.example/menu");
    assert.equal(normalizeDraftUrl("javascript:alert(1)"), null);
    assert.equal(normalizeDraftUrl("http://localhost/admin"), null);
    assert.equal(normalizeDraftUrl(""), null);
  });

  it("names a QR from the destination host", () => {
    assert.equal(nameFromUrl("https://www.cafe.example/menu"), "cafe.example");
    assert.equal(nameFromUrl("https://qr-s.ru/"), "qr-s.ru");
  });

  it("parses a stored draft and ignores junk", () => {
    const draft = parseQrCreateDraft({
      v: 1,
      contentType: "URL",
      url: "cafe.example",
      kind: "DYNAMIC",
    });
    assert.deepEqual(draft, {
      v: 1,
      contentType: "URL",
      url: "https://cafe.example",
      kind: "DYNAMIC",
    });
    assert.equal(parseQrCreateDraft({ v: 1, contentType: "PDF", url: "https://x.test", kind: "STATIC" }), null);
    assert.equal(parseQrCreateDraft("{not json"), null);
  });

  it("builds a continue path that post-auth redirect will accept", () => {
    const path = createQrContinuePath({
      v: 1,
      contentType: "URL",
      url: "https://cafe.example/menu",
      kind: "DYNAMIC",
    });
    assert.equal(
      path,
      "/dashboard/create/url?kind=DYNAMIC&url=https%3A%2F%2Fcafe.example%2Fmenu",
    );
    assert.equal(safePostAuthPath(path, "/dashboard"), path);
  });

  it("reads prefill from search params", () => {
    const draft = parseCreatePrefill({ url: "https://example.com/a", kind: "STATIC" });
    assert.equal(draft?.url, "https://example.com/a");
    assert.equal(draft?.kind, "STATIC");
    assert.equal(parseCreatePrefill({ url: "javascript:alert(1)", kind: "DYNAMIC" }), null);
  });
});

describe("safePostAuthPath", () => {
  it("allows dashboard create and drops open redirects", () => {
    assert.equal(safePostAuthPath("/dashboard/create/url?kind=DYNAMIC", "/dashboard"), "/dashboard/create/url?kind=DYNAMIC");
    assert.equal(safePostAuthPath("//evil.test", "/dashboard"), "/dashboard");
    assert.equal(safePostAuthPath("/\\evil.test", "/dashboard"), "/dashboard");
    assert.equal(safePostAuthPath("https://evil.test", "/dashboard"), "/dashboard");
    assert.equal(safePostAuthPath("/login", "/dashboard"), "/dashboard");
    assert.equal(
      safePostAuthPath("/dashboard/create/url?kind=DYNAMIC&url=javascript:alert(1)", "/dashboard"),
      "/dashboard/create/url?kind=DYNAMIC",
    );
  });
});
