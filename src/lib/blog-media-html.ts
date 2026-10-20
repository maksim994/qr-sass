import { JSDOM } from "jsdom";
import { blogMediaUrl, blogMediaSrcset } from "@/lib/blog-media-url";
import { escapeImageAttribute } from "@/lib/blog-image-markup";

/** Attribute source slices retain all other rendered markup byte for byte. */
export function rewriteBlogMediaHtml(html: string): string {
  if (!html.includes("https://s3.mvmolkov.ru/qr/blog/")) return html;
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const edits: { start: number; end: number; text: string }[] = [];
  try {
    for (const img of dom.window.document.querySelectorAll("img, picture source")) {
      const location = dom.nodeLocation(img);
      if (!location) continue;
      for (const attr of ["src", "srcset"] as const) {
        const old = img.getAttribute(attr), range = location.attrs?.[attr];
        if (!old || !range) continue;
        const next = attr === "src" ? blogMediaUrl(old) : blogMediaSrcset(old);
        if (next !== old) edits.push({ start: range.startOffset, end: range.endOffset, text: `${attr}="${escapeImageAttribute(next)}"` });
      }
    }
  } finally { dom.window.close(); }
  for (const edit of edits.sort((a, b) => b.start - a.start)) html = html.slice(0, edit.start) + edit.text + html.slice(edit.end);
  return html;
}
export function blogImageUrls(html: string, cover?: string | null): string[] {
  const dom = new JSDOM(html);
  try {
    const images = Array.from(dom.window.document.querySelectorAll("img")) as Element[];
    const urls = [cover, ...images.map(img => img.getAttribute("src"))];
    return [...new Set(urls.filter((url): url is string => !!url && /^https?:\/\//.test(url)).map(blogMediaUrl))];
  } finally { dom.window.close(); }
}
/** Rewrite only image-valued properties of custom JSON-LD, keeping dates and prose intact. */
export function rewriteBlogMediaJsonLd(value: unknown, imageContext = false): unknown {
  if (typeof value === "string") return imageContext ? blogMediaUrl(value) : value;
  if (Array.isArray(value)) return value.map(item => rewriteBlogMediaJsonLd(item, imageContext));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const isImage = record["@type"] === "ImageObject";
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, rewriteBlogMediaJsonLd(item,
    ["image", "thumbnailUrl", "contentUrl"].includes(key) || ((isImage || imageContext) && ["url", "@id"].includes(key)))]));
}
