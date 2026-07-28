import { getDb } from "@/lib/db";
import { SiteSettingsForm } from "./site-settings-form";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";

export default async function AdminSiteSettingsPage() {
  const db = getDb();
  const row = await db.siteSettings.findUnique({
    where: { id: "default" },
  });

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Настройки сайта"
        description="Яндекс Метрика и произвольный код в <head>. Применяется на всём сайте."
      />
      <AdminCard>
        <SiteSettingsForm
          initialYandexMetrikaId={row?.yandexMetrikaId ?? ""}
          initialCustomHeadCode={row?.customHeadCode ?? ""}
          initialRobotsTxtContent={row?.robotsTxtContent ?? ""}
          initialFaviconUrl={row?.faviconUrl ?? ""}
          initialIndexNowKey={row?.indexNowKey ?? ""}
          initialContactEmail={row?.contactEmail ?? ""}
          initialContactPhone={row?.contactPhone ?? ""}
          initialRequisitesInn={row?.requisitesInn ?? ""}
          initialRequisitesName={row?.requisitesName ?? ""}
        />
      </AdminCard>
    </div>
  );
}
