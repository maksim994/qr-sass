import assert from "node:assert/strict";
import { test } from "node:test";
import { createQrSchema, validatePayloadUrls } from "./validation.ts";
import { workspaceFilePath } from "./workspace-file-path.ts";

function createBody(contentType: string, payload: Record<string, unknown>) {
  return {
    workspaceId: "ws1",
    name: "Медиа",
    kind: "DYNAMIC" as const,
    contentType,
    payload,
    style: {},
  };
}

test("workspace upload path is accepted for PDF IMAGE MP3 VIDEO create and patch checks", () => {
  const fileUrl = workspaceFilePath("test123");
  for (const contentType of ["PDF", "IMAGE", "MP3", "VIDEO"]) {
    const payload =
      contentType === "VIDEO"
        ? { fileUrl, videoUrl: fileUrl, fileId: "test123" }
        : { fileUrl, fileId: "test123" };
    assert.equal(validatePayloadUrls(payload, contentType), true, contentType);
    const parsed = createQrSchema.safeParse(createBody(contentType, payload));
    assert.equal(parsed.success, true, contentType);
  }
});

test("payload media URLs still reject relative, hosted-asset and mismatched fileId", () => {
  const owned = workspaceFilePath("test123");
  assert.equal(validatePayloadUrls({ fileUrl: "/static/file.pdf", fileId: "test123" }, "PDF"), false);
  assert.equal(validatePayloadUrls({ fileUrl: "/api/qr/qr1/asset", fileId: "test123" }, "PDF"), false);
  assert.equal(validatePayloadUrls({ fileUrl: owned, fileId: "other" }, "PDF"), false);
  assert.equal(validatePayloadUrls({ url: owned }, "URL"), false);
  assert.equal(validatePayloadUrls({ fileUrl: "https://example.org/doc.pdf" }, "PDF"), true);
  assert.equal(
    validatePayloadUrls({ videoUrl: "https://www.youtube.com/watch?v=dQw4w9wgGcQ" }, "VIDEO"),
    true,
  );
  assert.equal(createQrSchema.safeParse(createBody("PDF", { fileUrl: "/static/file.pdf" })).success, false);
});
