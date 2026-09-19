import { getDb } from "@/lib/db";
import { PlansForm } from "./plans-form";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";

export default async function AdminPlansPage() {
  const db = getDb();
  const overrides = await db.planOverride.findMany();
  const byPlan = Object.fromEntries(overrides.map((o) => [o.planId, o]));

  return (
    <div>
      <AdminPageHeader title="Тарифы" description="Публичные тарифы. Изменения не затрагивают сохранённые архивные условия." />
      <p>Скрытый тариф «Для своих»: 0 ₽, бессрочно, все возможности, QR и участники без лимитов. Назначается в карточке кабинета через «Изменить доступ».</p>
      <AdminCard>
        <PlansForm initialOverrides={byPlan} />
      </AdminCard>
    </div>
  );
}
