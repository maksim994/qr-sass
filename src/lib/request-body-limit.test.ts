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
