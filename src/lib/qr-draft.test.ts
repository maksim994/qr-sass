import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createQrContinuePath,
  nameFromUrl,
  normalizeDraftUrl,
  parseCreatePrefill,
  parseQrCreateDraft,
  resolveQrCreateDraft,
  legacyQrIntentPath,
  writeQrCreateDraft,
  readQrCreateDraft,
  clearQrCreateDraft,
} from "./qr-draft.ts";
import { safePostAuthPath } from "./safe-redirect.ts";
import { defaultQrStyle } from "./qr-style-config.ts";

describe("qr draft", () => {
  it("reports unavailable storage and keeps the saved draft until explicit successful-save cleanup", () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const values = new Map<string, string>();
    const draft = { v: 1 as const, contentType: "URL" as const, kind: "DYNAMIC" as const, url: "https://example.com/menu", style: defaultQrStyle };
    try {
      Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } });
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      } });
      assert.equal(writeQrCreateDraft(draft), true);
      assert.equal(readQrCreateDraft()?.style?.dotColor, defaultQrStyle.dotColor);
      Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw Error("disabled"); } });
      assert.equal(writeQrCreateDraft(draft), false);
      assert.equal(values.size, 1);
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key) } });
      clearQrCreateDraft();
      assert.equal(readQrCreateDraft(), null);
    } finally {
      if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor); else Reflect.deleteProperty(globalThis, "window");
      if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor); else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });

  it("preserves the downloaded appearance only for the matching URL and kind", () => {
    const at = Date.now();
    const saved = parseQrCreateDraft({ v: 1, contentType: "URL", kind: "DYNAMIC", url: "https://example.com/menu", name: "Меню", createdAt: at,
      style: { ...defaultQrStyle, frameStyle: "tag", frameText: "Открыть меню", dotColor: "#1E4FD1" } });
    assert.equal(saved?.style?.frameText, "Открыть меню");
    assert.equal(saved?.style?.dotColor, "#1E4FD1");
    const prefill = parseCreatePrefill({ url: "https://example.com/menu", kind: "DYNAMIC" });
    assert.deepEqual(resolveQrCreateDraft(prefill, saved), saved);
    const other = parseCreatePrefill({ url: "https://other.example", kind: "DYNAMIC" });
    assert.deepEqual(resolveQrCreateDraft(other, saved), other);
    assert.deepEqual(resolveQrCreateDraft({ ...prefill!, kind: "STATIC" }, saved), { ...prefill, kind: "STATIC" });
    assert.equal(parseQrCreateDraft({ ...saved, createdAt: at - 3600001 }, at), null);
    assert.equal(parseQrCreateDraft({ ...saved, createdAt: at + 1 }, at), null);
    assert.equal(parseQrCreateDraft({ ...saved, style: { dotType: "invalid" } }, at), null);
  });

  it("keeps QR type intent for guest links including types with underscores", () => {
    for (const type of ["wifi", "pdf", "link_list", "social_links"]) {
      const path = legacyQrIntentPath({ intent: "create", type });
      assert.equal(path, `/dashboard/create/${type}`);
      assert.equal(safePostAuthPath(path), path);
    }
    assert.equal(legacyQrIntentPath({ from: "download" }), "/dashboard/create/url?kind=DYNAMIC");
    assert.equal(legacyQrIntentPath({ intent: "create", type: "//evil.test" }), undefined);
  });
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
