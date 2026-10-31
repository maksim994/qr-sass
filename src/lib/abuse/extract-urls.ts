/** WHATWG URL handles host casing and IDN. Never fetch a customer destination. */
export function normalizeDestinationUrl(value: string, allowBare = false): string | null {
  try {
    const raw = value.trim();
    const candidate = /^https?:\/\//i.test(raw) ? raw : allowBare && !/^[a-z][\w+.-]*:/i.test(raw) && /^(?:[^\s/.]+\.)+[^\s/]+/.test(raw) ? `https://${raw}` : null;
    if (!candidate) return null;
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}
export function extractDestinationUrls(_contentType: string, payload: unknown, currentTargetUrl?: string | null): string[] {
  const urls = new Set<string>();
  const add = (value: string, bare = false) => { const url = normalizeDestinationUrl(value, bare); if (url) urls.add(url); };
  if (currentTargetUrl) add(currentTargetUrl, true);
  function walk(value: unknown, key = '', depth = 0) {
    if (depth > 30) return;
    if (typeof value === 'string') add(value, /url|link|href|^(default|ios|android|desktop)$/i.test(key));
    else if (Array.isArray(value)) value.forEach(item => walk(item, key, depth + 1));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, k, depth + 1));
  }
  walk(payload);
  return [...urls].sort();
}
