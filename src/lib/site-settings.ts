import { getDb } from "@/lib/db";

export type SiteSettingsData = {
  yandexMetrikaId: string | null;
  customHeadCode: string | null;
};

export async function getSiteSettings(): Promise<SiteSettingsData> {
  const db = getDb();
  const row = await db.siteSettings.findUnique({
    where: { id: "default" },
  });
  return {
    yandexMetrikaId: row?.yandexMetrikaId ?? null,
    customHeadCode: row?.customHeadCode ?? null,
  };
}
