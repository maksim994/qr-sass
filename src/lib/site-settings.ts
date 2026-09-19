import { getDb } from "@/lib/db";
import { getDefaultRobotsTxt } from "@/lib/seo-hygiene";

export type SiteSettingsData = {
  yandexMetrikaId: string | null;
  customHeadCode: string | null;
  robotsTxtContent: string | null;
  faviconUrl: string | null;
  indexNowKey: string | null;
};

const defaults: SiteSettingsData = {
  yandexMetrikaId: null,
  customHeadCode: null,
  robotsTxtContent: null,
  faviconUrl: null,
  indexNowKey: null,
};

export { getDefaultRobotsTxt };

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
      indexNowKey: row?.indexNowKey ?? null,
    };
  } catch {
    return defaults;
  }
}
