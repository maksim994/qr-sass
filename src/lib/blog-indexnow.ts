import { getDb } from "@/lib/db";
import { publicSiteUrl } from "@/lib/public-url";
import { notifyIndexNow } from "@/lib/indexnow";

/** Preserve the existing publication notification; don't let an external outage undo a save. */
export async function notifyArticleIndexNow(slug: string) {
  try {
    const settings = await getDb().siteSettings.findUnique({ where: { id: "default" }, select: { indexNowKey: true } });
    if (settings?.indexNowKey) await notifyIndexNow([publicSiteUrl(`/blog/${slug}`)], settings.indexNowKey);
  } catch { /* The article was saved; search engines can also discover it through sitemap. */ }
}
