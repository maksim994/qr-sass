import { getDb } from "@/lib/db";
import { PlansForm } from "./plans-form";

export default async function AdminPlansPage() {
  const db = getDb();
  const overrides = await db.planOverride.findMany();
  const byPlan = Object.fromEntries(overrides.map((o) => [o.planId, o]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Тарифы</h1>
      <p className="mt-1 text-slate-600">Параметры лимитов. Изменения применяются сразу на всём сайте.</p>

      <PlansForm initialOverrides={byPlan} />
    </div>
  );
}
