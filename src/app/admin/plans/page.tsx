import { getDb } from "@/lib/db";
import { PlansForm } from "./plans-form";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";

export default async function AdminPlansPage() {
  const db = getDb();
  const overrides = await db.planOverride.findMany();
  const byPlan = Object.fromEntries(overrides.map((o) => [o.planId, o]));

  return (
    <div>
      <AdminPageHeader title="Тарифы" description="Параметры лимитов. Изменения применяются сразу на всём сайте." />
      <AdminCard>
        <PlansForm initialOverrides={byPlan} />
      </AdminCard>
    </div>
  );
}
