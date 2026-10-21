// Validate actual local response headers in synthetic HTTPS frames: no requests to Yandex or production.
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const origin = 'http://127.0.0.1:3010';
const cases = [
  { parent: 'https://qr-s.ru', path: '/contacts', allowed: true },
  { parent: 'https://metrika.yandex.ru', path: '/contacts', allowed: true },
  { parent: 'https://playback.webvisor.com', path: '/contacts', allowed: true },
  { parent: 'https://evil.example.invalid', path: '/contacts', allowed: false },
  { parent: 'https://metrika.yandex.ru.evil.example.invalid', path: '/contacts', allowed: false },
  { parent: 'http://metrika.yandex.ru', path: '/contacts', allowed: false },
  { parent: 'https://metrika.yandex.ru', path: '/login', allowed: false },
];
const policies = {};
for (const path of ['/contacts', '/login']) {
  const r = await fetch(origin + path);
  assert.equal(r.status, 200);
  policies[path] = { 'Content-Security-Policy': r.headers.get('content-security-policy'), 'X-Frame-Options': r.headers.get('x-frame-options'), 'Content-Type': 'text/html' };
}
const results = [];
for (const [engine, type, opts] of [['chrome', chromium, { channel: 'chrome' }], ['webkit', webkit, {}]]) {
  const browser = await type.launch({ headless: true, ...opts });
  for (const entry of cases) {
    const page = await browser.newPage();
    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url === 'https://qr-s.ru/__frame-check') return route.fulfill({ status: 200, headers: policies[entry.path], body: '<!doctype html><script>parent.postMessage("frame-ok","*")</script><p>Frame fixture</p>' });
      if (url === entry.parent + '/parent') return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><script>window.received=false;addEventListener("message",e=>{if(e.data==="frame-ok"&&e.origin==="https://qr-s.ru")window.received=true})</script><iframe src="https://qr-s.ru/__frame-check" onload="window.loaded=true"></iframe>' });
      return route.abort();
    });
    await page.goto(entry.parent + '/parent', { waitUntil: 'networkidle' });
    const received = await page.evaluate(() => window.received);
    assert.equal(received, entry.allowed, JSON.stringify({ engine, ...entry, headers: policies[entry.path] }));
    results.push({ engine, ...entry, passed: true });
    await page.close();
  }
  await browser.close();
}
writeFileSync(new URL('../outputs/tz10-stage1/frame-acceptance.json', import.meta.url), JSON.stringify({ localHeaders: policies, syntheticOrigins: true, externalNetworkRequests: 0, results }, null, 2));
console.log(JSON.stringify({ result: 'passed', checks: results.length }));
