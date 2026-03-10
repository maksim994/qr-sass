import { getDb } from "@/lib/db";

export type SiteSettingsData = {
  yandexMetrikaId: string | null;
  customHeadCode: string | null;
  robotsTxtContent: string | null;
  faviconUrl: string | null;
};

const defaults: SiteSettingsData = {
  yandexMetrikaId: null,
  customHeadCode: null,
  robotsTxtContent: null,
  faviconUrl: null,
};

export function getDefaultRobotsTxt(): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /admin
Disallow: /admin/

Sitemap: ${base}/sitemap.xml`;
}

/** При build (нет БД) возвращает defaults, чтобы layout не падал */
export async function getSiteSettings(): Promise<SiteSettingsData> {
  try {
    const db = getDb();
    const row = await db.siteSettings.findUnique({
      where: { id: "default" },
    });
    return {
      yandexMetrikaId: row?.yandexMetrikaId ?? null,
      customHeadCode: row?.customHeadCode ?? null,
      robotsTxtContent: row?.robotsTxtContent ?? null,
      faviconUrl: row?.faviconUrl ?? null,
    };
  } catch {
    return defaults;
  }
}
