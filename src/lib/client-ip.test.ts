import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIpFromHeaders, getClientIp } from "./client-ip.ts";

function withTrustProxy(value: string | undefined, fn: () => void) {
  const previous = process.env.TRUST_PROXY;
  if (value == null) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = value;
  try {
    fn();
  } finally {
    if (previous == null) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  }
}

test("clientIpFromHeaders ignores spoofed X-Forwarded-For without TRUST_PROXY", () => {
  withTrustProxy(undefined, () => {
    const headers = new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" });
    assert.equal(clientIpFromHeaders(headers), undefined);
    assert.equal(getClientIp(new Request("http://localhost/", { headers })), "unknown");
  });
});

test("clientIpFromHeaders uses the first hop when TRUST_PROXY is on", () => {
  withTrustProxy("1", () => {
    const headers = new Headers({ "x-forwarded-for": "8.8.8.8, 10.0.0.1" });
    assert.equal(clientIpFromHeaders(headers), "8.8.8.8");
  });
});
