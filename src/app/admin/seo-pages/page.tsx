import { requireAdmin } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { listSeoPageAdminRows } from "@/lib/seo-page-admin";
import { SeoPagesAdmin } from "./seo-pages-client";

export default async function AdminSeoPagesPage() {
  await requireAdmin();
  const rows = await listSeoPageAdminRows();
  return (
    <div>
      <AdminPageHeader
        title="SEO-страницы"
        description="Мета-теги публичных URL без деплоя. Пустые поля берут значения из кода. Изменения применяются при следующем открытии страницы."
      />
      <SeoPagesAdmin rows={rows} />
    </div>
  );
}
