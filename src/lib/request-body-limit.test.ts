import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BodyTooLargeError,
  inspectDeclaredContentLength,
  readRequestBodyCapped,
} from "./request-body-limit.ts";

test("bulk rejects missing and oversized Content-Length before the body is read", () => {
  assert.equal(inspectDeclaredContentLength(null).status, 411);
  assert.equal(inspectDeclaredContentLength("").status, 411);
  assert.equal(inspectDeclaredContentLength("0").status, 411);
  assert.equal(inspectDeclaredContentLength("1048577").status, 413);
  assert.equal(inspectDeclaredContentLength("512").ok, true);
});

test("capped body reader stops before buffering more than the limit", async () => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("a".repeat(8)));
      controller.enqueue(encoder.encode("b".repeat(8)));
      controller.close();
    },
  });
  await assert.rejects(
    () =>
      readRequestBodyCapped(
        new Request("http://bulk.invalid", { method: "POST", body: stream, duplex: "half" } as RequestInit),
        10,
      ),
    (error: unknown) => error instanceof BodyTooLargeError,
  );
});

test("upload caps undeclared chunked bodies and cancels overflow", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(16)); },
    cancel() { cancelled = true; },
  });
  const { formDataWithinLimit } = await import("./request-body-limit.ts");
  await assert.rejects(() => formDataWithinLimit(new Request("http://upload.invalid", {
    method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" }, body: stream, duplex: "half",
  } as RequestInit), 20, { requireLength: false, tooLargeMessage: "upload exceeded" }), /upload exceeded/);
  assert.equal(cancelled, true);
});

test("upload accepts a bounded multipart without Content-Length", async () => {
  const { formDataWithinLimit } = await import("./request-body-limit.ts");
  const form = new FormData(); form.set("workspaceId", "synthetic"); form.set("file", new File(["hello"], "test.txt"));
  const request = new Request("http://upload.invalid", { method: "POST", body: form });
  const parsed = await formDataWithinLimit(request, 2048, { requireLength: false });
  assert.equal(parsed.get("workspaceId"), "synthetic");
  assert.equal(await (parsed.get("file") as File).text(), "hello");
});
