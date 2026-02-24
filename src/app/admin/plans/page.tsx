import { getDb } from "@/lib/db";
import { PlansForm } from "./plans-form";

export default async function AdminPlansPage() {
  const db = getDb();
  const overrides = await db.planOverride.findMany();
  const byPlan = Object.fromEntries(overrides.map((o) => [o.planId, o]));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Тарифы</h1>
        <p className="mt-1 text-sm text-slate-500">Параметры лимитов. Изменения применяются сразу на всём сайте.</p>
      </div>
      <div className="card p-6">
        <PlansForm initialOverrides={byPlan} />
      </div>
    </div>
  );
}
