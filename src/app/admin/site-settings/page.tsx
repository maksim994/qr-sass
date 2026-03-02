import { getDb } from "@/lib/db";
import { SiteSettingsForm } from "./site-settings-form";

export default async function AdminSiteSettingsPage() {
  const db = getDb();
  const row = await db.siteSettings.findUnique({
    where: { id: "default" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Настройки сайта</h1>
        <p className="mt-1 text-sm text-slate-500">
          Яндекс Метрика и произвольный код в &lt;head&gt;. Применяется на всём сайте.
        </p>
      </div>
      <div className="card p-6">
        <SiteSettingsForm
          initialYandexMetrikaId={row?.yandexMetrikaId ?? ""}
          initialCustomHeadCode={row?.customHeadCode ?? ""}
        />
      </div>
    </div>
  );
}
