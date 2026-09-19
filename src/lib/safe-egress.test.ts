import assert from "node:assert/strict";
import http from "node:http";
import dnsPromises from "node:dns/promises";
import { test } from "node:test";
import sharp from "sharp";
import { fetchPinnedHttp } from "./safe-egress.ts";

async function withPinnedFixture(
  handler: http.RequestListener,
  run: (url: string) => Promise<void>,
) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const originalLookup = dnsPromises.lookup;
  const originalRequest = http.request;
  dnsPromises.lookup = (async () => [{ address: "192.0.2.1", family: 4 }]) as typeof dnsPromises.lookup;
  http.request = ((options, callback) => {
    const next = typeof options === "object" && options ? { ...options, hostname: "127.0.0.1", port, lookup: undefined } : options;
    return originalRequest(next as Parameters<typeof originalRequest>[0], callback as never);
  }) as typeof http.request;
  try {
    await run("http://synthetic.invalid/logo");
  } finally {
    dnsPromises.lookup = originalLookup;
    http.request = originalRequest;
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test("HTTP 204 205 redirect oversize and abort reject without killing the process", async () => {
  await withPinnedFixture((_req, res) => {
    res.writeHead(204);
    res.end();
  }, async (url) => {
    await assert.rejects(() => fetchPinnedHttp(url, AbortSignal.timeout(1000)), /логотип/i);
  });
  await withPinnedFixture((_req, res) => {
    res.writeHead(205);
    res.end();
  }, async (url) => {
    await assert.rejects(() => fetchPinnedHttp(url, AbortSignal.timeout(1000)), /логотип/i);
  });
  await withPinnedFixture((_req, res) => {
    res.writeHead(302, { Location: "https://example.org/x" });
    res.end();
  }, async (url) => {
    await assert.rejects(() => fetchPinnedHttp(url, AbortSignal.timeout(1000)), /Недопустимый/);
  });
  await withPinnedFixture((_req, res) => {
    res.writeHead(200, { "Content-Length": String(2_000_000) });
    res.end(Buffer.alloc(16));
  }, async (url) => {
    await assert.rejects(() => fetchPinnedHttp(url, AbortSignal.timeout(1000)), /большой/);
  });
  await withPinnedFixture((_req, res) => {
    setTimeout(() => {
      res.writeHead(200);
      res.end("late");
    }, 400);
  }, async (url) => {
    await assert.rejects(() => fetchPinnedHttp(url, AbortSignal.timeout(50)), /timeout/);
  });
});

test("valid PNG is returned through pinned HTTP", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#00ff00" } }).png().toBuffer();
  await withPinnedFixture((_req, res) => {
    res.writeHead(200, { "Content-Type": "image/png", "Content-Length": String(png.length) });
    res.end(png);
  }, async (url) => {
    const response = await fetchPinnedHttp(url, AbortSignal.timeout(1000));
    assert.equal(response.ok, true);
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(body.equals(png), true);
  });
});
