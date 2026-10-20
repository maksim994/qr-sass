import { blogMediaKey } from "@/lib/blog-media-url";

export type BlogMediaObject = { body?: Buffer; contentType: string; length: number; etag?: string; lastModified?: Date };
type Loader = (key: string, head: boolean) => Promise<BlogMediaObject | null>;

/** Bounded process cache avoids S3 reads for hot images; browser/proxy caches use immutable URLs. */
export function createBlogMediaHandler(load: Loader, maxBytes = 64 * 1024 * 1024, maxEntries = 128) {
  const cache = new Map<string, BlogMediaObject>();
  const pending = new Map<string, Promise<BlogMediaObject | null>>();
  let bytes = 0;
  async function object(key: string, head: boolean) {
    const hit = cache.get(key);
    if (hit && (head || hit.body)) { cache.delete(key); cache.set(key, hit); return hit; }
    const pendingKey = `${head ? "head" : "get"}:${key}`;
    let work = pending.get(pendingKey);
    if (!work) {
      work = load(key, head).then(value => {
        if (value && (value.body?.byteLength ?? 0) <= maxBytes) {
          const previous = cache.get(key);
          // A late HEAD must never discard an already cached body.
          if (previous?.body && !value.body) return previous;
          bytes -= previous?.body?.byteLength ?? 0;
          cache.delete(key); cache.set(key, value); bytes += value.body?.byteLength ?? 0;
          while (cache.size > maxEntries || bytes > maxBytes) {
            const first = cache.keys().next().value!;
            bytes -= cache.get(first)?.body?.byteLength ?? 0; cache.delete(first);
          }
        }
        return value;
      }).finally(() => pending.delete(pendingKey));
      pending.set(pendingKey, work);
    }
    return work;
  }
  async function handle(req: Request, parts: readonly string[]) {
    const key = blogMediaKey(parts);
    if (!key) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    try {
      const file = await object(key, req.method === "HEAD");
      if (!file) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
      const headers = new Headers({ "Content-Type": file.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
      if (file.etag) headers.set("ETag", file.etag);
      if (file.lastModified) headers.set("Last-Modified", file.lastModified.toUTCString());
      const condition = req.headers.get("if-none-match");
      const notModified = condition
        ? condition.split(",").some(tag => tag.trim() === "*" || (file.etag && tag.trim().replace(/^W\//, "") === file.etag.replace(/^W\//, "")))
        : !!file.lastModified && !!req.headers.get("if-modified-since") && Math.floor(file.lastModified.getTime() / 1000) <= Math.floor(Date.parse(req.headers.get("if-modified-since")!) / 1000);
      if (notModified) return new Response(null, { status: 304, headers });
      headers.set("Content-Length", String(file.length));
      return new Response(req.method === "HEAD" ? null : new Uint8Array(file.body!), { headers });
    } catch {
      // Never expose SDK messages, credentials, bucket names or upstream addresses.
      return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
  }
  return { handle, object };
}
