import { domainToUnicode } from 'node:url';
import { createHash } from 'node:crypto';
import type { AbuseRule } from '@prisma/client';
import { getDb } from '@/lib/db';
import { env } from '@/lib/env';
import { getRedis } from '@/lib/redis';
import { warnAbuseConfiguration } from '@/lib/abuse/config';
import { normalizeDestinationUrl } from '@/lib/abuse/extract-urls';
export type Verdict = 'clean' | 'suspicious' | 'malicious' | 'unknown';
export type CheckResult = { verdict: Verdict; reasons: string[]; sources: { google?: string; yandex?: string; blocklist?: string }; deferred?: boolean };
type ProviderResult = { verdict: 'clean' | 'malicious'; source: 'google' | 'yandex'; expiresAt?: number };
const memory = new Map<string, { value: ProviderResult; until: number }>();
const shorteners = ['bit.ly', 'clck.ru', 'tinyurl.com', 'cutt.ly', 'goo.su', 't.co'];
export const urlHash = (url: string) => createHash('sha256').update(url).digest('hex');
const matchesDomain = (host: string, rule: string) => host === rule || host.endsWith(`.${rule}`);
function decoded(value: string) { try { return decodeURIComponent(value).toLowerCase(); } catch { return value.toLowerCase(); } }
export function checkLocal(url: string, rules: Pick<AbuseRule, 'kind' | 'value' | 'action'>[], name = '', approved = false): CheckResult {
  const host = new URL(url).hostname.replace(/\.$/, '');
  const sources: CheckResult['sources'] = {};
  const reasons: string[] = [];
  let verdict: Verdict = 'clean';
  const allow = approved || rules.some(r => r.kind === 'ALLOW_DOMAIN' && matchesDomain(host, r.value));
  for (const rule of rules) {
    if (approved) continue;
    const hit = rule.kind === 'DOMAIN' ? matchesDomain(host, rule.value) : !allow && (rule.kind === 'SHORTENER' ? matchesDomain(host, rule.value) : rule.kind === 'STOPWORD' && decoded(`${url} ${domainToUnicode(host)} ${name}`).includes(rule.value));
    if (!hit) continue;
    reasons.push(`${rule.kind}:${rule.value}`); if (sources.blocklist !== 'BLOCK' || rule.kind === 'DOMAIN' && rule.action === 'BLOCK') sources.blocklist = rule.kind === 'DOMAIN' ? rule.action : 'REVIEW';
    if (rule.action === 'BLOCK' && rule.kind === 'DOMAIN') verdict = 'malicious';
    else if (verdict !== 'malicious') verdict = 'suspicious';
  }
  if (!allow && shorteners.some(d => matchesDomain(host, d))) { reasons.push('shortener'); if (verdict !== 'malicious') verdict = 'suspicious'; }
  return { verdict, reasons, sources };
}
let redisUnavailableUntil = 0;
async function redisAttempt<T>(operation: () => Promise<T>): Promise<T | null> {
  if (redisUnavailableUntil > Date.now()) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([operation(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('cache_timeout')), 200); })]); }
  catch { redisUnavailableUntil = Date.now() + 30000; return null; }
  finally { clearTimeout(timer); }
}
async function cached(key: string): Promise<ProviderResult | null> {
  const redis = getRedis();
  if (redis) { try { const v = await redisAttempt(() => redis.get(key)); if (v) return JSON.parse(v); } catch { /* memory fallback */ } }
  const v = memory.get(key); if (v && v.until > Date.now()) return v.value; memory.delete(key); return null;
}
async function cache(key: string, value: ProviderResult) {
  const ttl = Math.min(value.verdict === 'clean' ? 21600 : 86400, value.expiresAt ? Math.max(0, Math.floor((value.expiresAt - Date.now()) / 1000)) : 86400);
  if (ttl <= 0) return;
  if (memory.size > 20000) memory.clear();
  memory.set(key, { value, until: Date.now() + ttl * 1000 });
  try { await redisAttempt(async () => getRedis()?.set(key, JSON.stringify(value), 'EX', ttl)); } catch { /* memory fallback */ }
}
async function quota(provider: string) {
  const key = `${provider}:${new Date().toISOString().slice(0, 10)}`;
  await getDb().abuseProviderQuota.upsert({ where: { key }, create: { key }, update: {} });
  return (await getDb().abuseProviderQuota.updateMany({ where: { key, count: { lt: env.ABUSE_SB_DAILY_QUOTA } }, data: { count: { increment: 1 } } })).count > 0;
}
export async function checkUrlBatch(input: string[], options: { rules?: AbuseRule[]; fetcher?: typeof fetch; skipQuota?: boolean; ignoreCache?: boolean } = {}): Promise<Map<string, CheckResult>> {
  const urls = [...new Set(input.map(u => normalizeDestinationUrl(u, true)).filter((u): u is string => Boolean(u)))];
  const rules = options.rules ?? await getDb().abuseRule.findMany();
  const results = new Map(urls.map(url => [url, checkLocal(url, rules)]));
  if (!env.ABUSE_CHECK_ENABLED) return new Map(urls.map(url => [url, { verdict: 'clean', reasons: ['disabled'], sources: {} }]));
  const providers: Array<'google' | 'yandex'> = [];
  if (env.YANDEX_SAFE_BROWSING_API_KEY) providers.push('yandex');
  if (env.GOOGLE_WEB_RISK_ENABLED && env.GOOGLE_WEB_RISK_API_KEY) providers.push('google');
  warnAbuseConfiguration();
  const fetcher = options.fetcher ?? fetch;
  const successes = new Map<string, number>();
  await Promise.allSettled(providers.map(async source => {
    const pending: string[] = [];
    const apply = (url: string, v: ProviderResult) => {
      successes.set(url, (successes.get(url) ?? 0) + 1);
      const result = results.get(url)!; result.sources[source] = v.verdict;
      if (v.verdict === 'malicious') { result.verdict = 'malicious'; result.reasons.push(`${source}:threat`); }
    };
    for (const url of urls) { const v = options.ignoreCache ? null : await cached(`abuse:check:${source}:${urlHash(url)}`); if (v) apply(url, v); else pending.push(url); }
    const size = source === 'yandex' ? 500 : 1;
    let next = 0;
    // One deadline per provider bounds multi-link hosted creation as well.
    const signal = AbortSignal.timeout(env.ABUSE_CHECK_TIMEOUT_MS);
    const worker = async () => { while (next < pending.length && !signal.aborted) {
      const offset = next; next += size;
      const batch = pending.slice(offset, offset + size);
      if (!options.skipQuota && !await quota(source)) { for (const url of batch) results.get(url)!.deferred = true; continue; }
      try {
        let response: Response;
        if (source === 'yandex') {
          response = await fetcher(`https://sba.yandex.net/v4/threatMatches:find?key=${encodeURIComponent(env.YANDEX_SAFE_BROWSING_API_KEY!)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal, redirect: 'error', body: JSON.stringify({ client: { clientId: 'qr-s', clientVersion: '1' }, threatInfo: { threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'], platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: batch.map(url => ({ url })) } }) });
        } else {
          const params = new URLSearchParams({ uri: batch[0] });
          ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'].forEach(t => params.append('threatTypes', t));
          response = await fetcher(`https://webrisk.googleapis.com/v1/uris:search?${params}`, { signal, redirect: 'error', headers: { 'X-Goog-Api-Key': env.GOOGLE_WEB_RISK_API_KEY! } });
        }
        if (!response.ok) throw new Error('provider_unavailable');
        const data = await response.json();
        if (!data || typeof data !== 'object' || Array.isArray(data) || (data.matches !== undefined && !Array.isArray(data.matches)) || data.error) throw new Error('invalid_response');
        if (source === 'google' && data.threat !== undefined && (!data.threat || !Array.isArray(data.threat.threatTypes) || !data.threat.threatTypes.every((v: unknown) => typeof v === 'string'))) throw new Error('invalid_response');
        if (source === 'yandex' && batch.length > 1 && data.matches?.some((m: { threat?: { url?: unknown } }) => typeof m?.threat?.url !== 'string')) throw new Error('invalid_response');
        for (const url of batch) {
          const threat = source === 'google' ? Boolean(data.threat?.threatTypes?.length) : (batch.length === 1 ? Boolean(data.matches?.length) : (data.matches ?? []).some((m: { threat?: { url?: string } }) => normalizeDestinationUrl(m.threat?.url ?? '') === url));
          const value: ProviderResult = { source, verdict: threat ? 'malicious' : 'clean', expiresAt: source === 'google' && threat ? Date.parse(data.threat.expireTime) : undefined };
          apply(url, value); await cache(`abuse:check:${source}:${urlHash(url)}`, value);
        }
      } catch { /* Deliberately do not log errors: fetch errors may contain API keys or destination URLs. */ }
    } };
    await Promise.all(Array.from({ length: source === 'google' ? Math.min(8, pending.length) : 1 }, worker));
  }));
  for (const [url, result] of results) if (providers.length && !successes.get(url) && result.verdict === 'clean') result.verdict = 'unknown';
  return results;
}
export function combineChecks(results: CheckResult[]): CheckResult {
  const rank: Record<Verdict, number> = { clean: 0, unknown: 1, suspicious: 2, malicious: 3 };
  return results.reduce<CheckResult>((a, b) => {
    const sources = { ...a.sources, ...b.sources };
    // A clean URL must never erase another URL's provider threat in a hosted QR.
    for (const key of ['google', 'yandex'] as const) if (a.sources[key] === 'malicious' || b.sources[key] === 'malicious') sources[key] = 'malicious';
    if (a.sources.blocklist === 'BLOCK' || b.sources.blocklist === 'BLOCK') sources.blocklist = 'BLOCK';
    return { verdict: rank[b.verdict] > rank[a.verdict] ? b.verdict : a.verdict, reasons: [...a.reasons, ...b.reasons], sources, deferred: a.deferred || b.deferred };
  }, { verdict: 'clean', reasons: [], sources: {} });
}
export async function checkUrls(urls: string[]): Promise<CheckResult> { return combineChecks([...(await checkUrlBatch(urls)).values()]); }
export async function checkForQr(urls: string[], name: string, batch?: Map<string, CheckResult>): Promise<CheckResult> {
  if (!env.ABUSE_CHECK_ENABLED) return { verdict: 'clean', reasons: ['disabled'], sources: {} };
  const [checks, rules, approvals] = await Promise.all([batch ?? checkUrlBatch(urls), getDb().abuseRule.findMany(), getDb().abuseUrlApproval.findMany({ where: { urlHash: { in: urls.map(urlHash) }, expiresAt: { gt: new Date() } } })]);
  if (!urls.length) return checkLocal("https://name.invalid/", rules.filter(r => r.kind === "STOPWORD"), name);
  return combineChecks(urls.map(url => {
    const approved = approvals.some(a => a.urlHash === urlHash(url));
    const external = checks.get(url) ?? { verdict: 'unknown' as const, reasons: [], sources: {} };
    const providerThreat = external.sources.google === 'malicious' || external.sources.yandex === 'malicious';
    return combineChecks([checkLocal(url, rules, name, approved), approved && !providerThreat ? { ...external, verdict: external.verdict === 'unknown' ? 'unknown' : 'clean', reasons: [], sources: { google: external.sources.google, yandex: external.sources.yandex } } : external]);
  }));
}
