import assert from "node:assert/strict";
import { test } from "node:test";
import { isBlockedHostname, isDisplayableMediaUrl, isHostedAssetPath, isSafeUrl, ipv4FromMapped } from "./url.ts";

test("rejects IPv4-mapped loopback in http URLs", () => {
  assert.equal(ipv4FromMapped("::ffff:127.0.0.1"), "127.0.0.1");
  assert.equal(ipv4FromMapped("[::ffff:7f00:1]"), "127.0.0.1");
  assert.equal(isBlockedHostname("::ffff:127.0.0.1"), true);
  assert.equal(isBlockedHostname("[::ffff:7f00:1]"), true);
  assert.equal(isSafeUrl("http://[::ffff:127.0.0.1]:9/synthetic-private-image"), false);
  assert.equal(isSafeUrl("http://127.0.0.1/logo.png"), false);
  assert.equal(isSafeUrl("https://example.org/logo.png"), true);
  assert.equal(isSafeUrl("http://[::ffff:8.8.8.8]/logo.png"), true);
});

test("hosted asset path is displayable but not a generic public URL", () => {
  assert.equal(isHostedAssetPath("/api/qr/review-id/asset"), true);
  assert.equal(isDisplayableMediaUrl("/api/qr/review-id/asset"), true);
  assert.equal(isSafeUrl("/api/qr/review-id/asset"), false);
  assert.equal(isDisplayableMediaUrl("https://www.youtube.com/watch?v=dQw4w9wgGcQ"), true);
});
