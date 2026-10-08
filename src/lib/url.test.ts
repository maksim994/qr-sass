import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPolicyUrl, isBlockedHostname, isDisplayableMediaUrl, isHostedAssetPath, isSafeUrl, ipv4FromMapped, normalizePolicyUrl, policyUrlFromPayload } from "./url.ts";

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

test("policy links reject unsafe schemes and private hosts", () => {
  assert.deepEqual(normalizePolicyUrl(""), { ok: true, url: null });
  assert.deepEqual(normalizePolicyUrl("https://example.org/privacy"), { ok: true, url: "https://example.org/privacy" });
  assert.equal(normalizePolicyUrl("//evil.example").ok, false);
  assert.equal(normalizePolicyUrl("javascript:alert(1)").ok, false);
  assert.equal(normalizePolicyUrl("http://127.0.0.1/privacy").ok, false);
  assert.equal(policyUrlFromPayload({ gdprPolicyUrl: "https://evil.example" }), "https://evil.example");
  assert.equal(policyUrlFromPayload({ gdprPolicyUrl: "javascript:alert(1)" }), null);
});

test("policy edits preserve QR content and can explicitly clear a link", () => {
  const payload: Record<string, unknown> = { url: "https://example.org/target", gdprPolicyUrl: "  https://example.org/privacy  " };
  assert.equal(applyPolicyUrl(payload), true);
  assert.equal(payload.gdprPolicyUrl, "https://example.org/privacy");
  payload.gdprPolicyUrl = null;
  assert.equal(applyPolicyUrl(payload), true);
  assert.equal("gdprPolicyUrl" in payload, false);
  assert.equal(payload.url, "https://example.org/target");
  for (const gdprPolicyUrl of [42, {}, "data:text/html,unsafe", "//example.org/privacy", "http://[::1]/privacy"]) {
    assert.equal(applyPolicyUrl({ gdprPolicyUrl }), false);
  }
});

test("hosted asset path is displayable but not a generic public URL", () => {
  assert.equal(isHostedAssetPath("/api/qr/review-id/asset"), true);
  assert.equal(isDisplayableMediaUrl("/api/qr/review-id/asset"), true);
  assert.equal(isSafeUrl("/api/qr/review-id/asset"), false);
  assert.equal(isDisplayableMediaUrl("https://www.youtube.com/watch?v=dQw4w9wgGcQ"), true);
});
