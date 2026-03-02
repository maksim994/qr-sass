import { getDb } from "@/lib/db";

export type SiteSettingsData = {
  yandexMetrikaId: string | null;
  customHeadCode: string | null;
};

const defaults: SiteSettingsData = {
  yandexMetrikaId: null,
  customHeadCode: null,
};

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
    };
  } catch {
    return defaults;
  }
}
