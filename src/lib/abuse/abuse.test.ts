import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';
import { extractDestinationUrls, normalizeDestinationUrl } from '@/lib/abuse/extract-urls';
import { checkLocal, checkUrlBatch, combineChecks } from '@/lib/abuse/url-check';
import { moderationDecision } from '@/lib/abuse/moderation';
import { moderationResponse } from '@/lib/abuse/public';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { consumeRateLimit } from '@/lib/rate-limit';
import { purgeExpiredAbuseIp } from '@/lib/analytics-retention';
import { isSafeUrl } from '@/lib/url';

test('extract all hosted, smart redirect and A/B URLs, normalize IDN and deduplicate', () => {
  const urls = extractDestinationUrls('LINK_LIST', { links: [{ href: 'пример.рф/a#x' }, { url: 'https://EXAMPLE.com/a#z' }], smartRedirect: { default: 'default.example/a', ios: 'https://ios.example/', android: 'https://android.example/', desktop: 'https://desktop.example/' }, abTest: { urlA: 'https://a.example/', urlB: 'https://b.example/' }, nested: { link: 'https://EXAMPLE.com/a#t' } }, 'https://target.example/');
  assert.equal(urls.length, 9); assert.ok(urls.includes('https://xn--e1afmkfd.xn--p1ai/a')); assert.ok(urls.includes('https://default.example/a'));
  for (const type of ['MENU', 'BUSINESS', 'COUPON', 'SOCIAL_LINKS', 'APP_STORE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK']) assert.deepEqual(extractDestinationUrls(type, { url: 'example.com' }), ['https://example.com/']);
  assert.equal(normalizeDestinationUrl('tg://msg_url'), null);
  for (const url of ['tg://msg_url', 'javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd']) assert.equal(isSafeUrl(url), false);
});
test('local domain boundaries, decoded stopwords, allowlist and shorteners', () => {
  const rules = [{ kind: 'DOMAIN', value: 'evil.example', action: 'BLOCK' }, { kind: 'STOPWORD', value: 'закладк', action: 'REVIEW' }, { kind: 'ALLOW_DOMAIN', value: 'allowed.example', action: 'REVIEW' }] as const;
  assert.equal(checkLocal('https://sub.evil.example/', [...rules]).verdict, 'malicious');
  assert.equal(checkLocal('https://notevil.example/', [...rules]).verdict, 'clean');
  assert.equal(checkLocal(`https://other.example/?q=${encodeURIComponent('закладки')}`, [...rules]).verdict, 'suspicious');
  assert.equal(checkLocal('https://allowed.example/', [...rules], 'закладки').verdict, 'clean');
  assert.equal(checkLocal('https://bit.ly/a', []).verdict, 'suspicious');
  assert.equal(checkLocal('https://evil.example/', [...rules], '', true).verdict, 'clean');
});
test('moderation table and sticky manual review/block', () => {
  for (const [verdict, expected] of [['clean', 'OK'], ['suspicious', 'ON_MODERATION'], ['malicious', 'ON_MODERATION'], ['unknown', 'PENDING_CHECK']] as const) {
    const result = { verdict, reasons: [], sources: {} };
    assert.equal(moderationDecision(result), expected);
    assert.equal(moderationDecision(result, 'ON_MODERATION'), 'ON_MODERATION');
    assert.equal(moderationDecision(result, 'BLOCKED'), 'BLOCKED');
  }
});
test('public gates contain no target, no Location, correct statuses and noindex', async () => {
  assert.equal(moderationResponse('OK', 'x'), null); assert.equal(moderationResponse('PENDING_CHECK', 'x'), null);
  for (const status of ['ON_MODERATION', 'BLOCKED', 'PENDING_CHECK']) {
    const response = moderationResponse(status, 'a\"><script>', true)!;
    assert.equal(response.status, status === 'BLOCKED' ? 451 : 200); assert.equal(response.headers.get('Location'), null);
    assert.match(response.headers.get('X-Robots-Tag')!, /noindex/); assert.doesNotMatch(await response.text(), /<script>/);
  }
});
test('30 free creates vs 150 paid, rate limiter returns a retry delay', async () => {
  const free = new RateLimiterMemory({ points: 30, duration: 3600 });
  const paid = new RateLimiterMemory({ points: 150, duration: 3600 });
  for (let n = 0; n < 30; n++) assert.equal((await consumeRateLimit(free, 'user')).success, true);
  assert.equal((await consumeRateLimit(free, 'user')).success, false);
  for (let n = 0; n < 31; n++) assert.equal((await consumeRateLimit(paid, 'user')).success, true);
});
test('audit purge nulls only IP/UA after 365 days', async () => {
  const now = new Date('2026-10-25T00:00:00Z');
  let args: unknown;
  await purgeExpiredAbuseIp(now, { qrAuditEvent: { updateMany: async (input: unknown) => { args = input; return { count: 1 }; } } } as never);
  const input = args as { data: object; where: { createdAt: { lt: Date } } };
  assert.deepEqual(input.data, { ip: null, userAgent: null }); assert.equal(+now - +input.where.createdAt.lt, 365 * 86400000);
});
test('provider adapters: clean, malicious, partial/full outage, Google sends only URI', async () => {
  const previous = { y: env.YANDEX_SAFE_BROWSING_API_KEY, g: env.GOOGLE_WEB_RISK_API_KEY, flag: env.GOOGLE_WEB_RISK_ENABLED };
  env.YANDEX_SAFE_BROWSING_API_KEY = randomUUID(); env.GOOGLE_WEB_RISK_API_KEY = randomUUID(); env.GOOGLE_WEB_RISK_ENABLED = true;
  const url = 'https://provider-test.example/';
  try {
    for (const scenario of ['clean', 'malicious', 'one_down', 'both_down']) {
      const checked = await checkUrlBatch([url], { rules: [], ignoreCache: true, skipQuota: true, fetcher: (async (input: string | URL | Request, init?: RequestInit) => {
        const endpoint = new URL(String(input)); const google = endpoint.hostname === 'webrisk.googleapis.com';
        if (scenario === 'both_down' || scenario === 'one_down' && google) throw new Error('timeout');
        if (google) { assert.equal(endpoint.searchParams.get('uri'), url); assert.equal(init?.body, undefined); assert.equal(endpoint.searchParams.has('key'), false); }
        return Response.json(scenario === 'malicious' ? google ? { threat: { threatTypes: ['MALWARE'], expireTime: new Date(Date.now() + 100000).toISOString() } } : { matches: [{ threat: { url } }] } : {});
      }) as typeof fetch });
      assert.equal(checked.get(url)!.verdict, scenario === 'malicious' ? 'malicious' : scenario === 'both_down' ? 'unknown' : 'clean');
    }
  } finally { env.YANDEX_SAFE_BROWSING_API_KEY = previous.y; env.GOOGLE_WEB_RISK_API_KEY = previous.g; env.GOOGLE_WEB_RISK_ENABLED = previous.flag; }
});

test('new legal edition changes only terms 4 and privacy 5, preserving old snapshots', async () => {
  const { legalSnapshot } = await import('../legal-documents.ts');
  const { legalSnapshot: oldSnapshot } = await import('../legal-history/2026-10-21.3.ts');
  const current = legalSnapshot(), old = oldSnapshot();
  assert.notEqual(current.version, old.version); assert.notEqual(current.privacyVersion, old.privacyVersion);
  assert.deepEqual(current.consent, old.consent);
  current.terms.forEach((section, i) => { if (i !== 3) assert.deepEqual(section, old.terms[i]); });
  current.privacy.forEach((section, i) => { if (!section.title.startsWith('5.')) assert.deepEqual(section, old.privacy[i]); });
  assert.match(JSON.stringify(current.privacy), /Google Web Risk/);
  assert.match(JSON.stringify(current.terms), /abuse@qr-s.ru/);
});


test('multi-link aggregation keeps a provider threat and BLOCK over later clean links', () => {
  const result = combineChecks([{ verdict: 'malicious', reasons: ['yandex:threat'], sources: { yandex: 'malicious', blocklist: 'BLOCK' } }, { verdict: 'clean', reasons: [], sources: { yandex: 'clean', blocklist: 'REVIEW' } }]);
  assert.equal(result.verdict, 'malicious'); assert.equal(result.sources.yandex, 'malicious'); assert.equal(result.sources.blocklist, 'BLOCK');
});

test('singleton Yandex matches are threats even with a different canonical URL or no URL', async () => {
  const saved = { yandex: env.YANDEX_SAFE_BROWSING_API_KEY, google: env.GOOGLE_WEB_RISK_ENABLED };
  env.YANDEX_SAFE_BROWSING_API_KEY = randomUUID(); env.GOOGLE_WEB_RISK_ENABLED = false;
  try {
    for (const match of [{ threat: { url: 'http://canonical.example/other-path' } }, { threatType: 'MALWARE' }]) {
      const results = await checkUrlBatch(['https://submitted.example/path'], { rules: [], ignoreCache: true, skipQuota: true, fetcher: async () => Response.json({ matches: [match] }) });
      assert.equal(results.get('https://submitted.example/path')?.verdict, 'malicious');
      assert.equal(results.get('https://submitted.example/path')?.sources.yandex, 'malicious');
    }
    const multi = await checkUrlBatch(['https://first.example/', 'https://second.example/'], { rules: [], ignoreCache: true, skipQuota: true, fetcher: async () => Response.json({ matches: [{ threat: { url: 'https://first.example/' } }] }) });
    assert.equal(multi.get('https://first.example/')?.verdict, 'malicious');
    assert.equal(multi.get('https://second.example/')?.verdict, 'clean');
  } finally { env.YANDEX_SAFE_BROWSING_API_KEY = saved.yandex; env.GOOGLE_WEB_RISK_ENABLED = saved.google; }
});
