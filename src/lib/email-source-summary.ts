type SourceTotal = { registrations: number; payments: number; revenue: number };

/** Only the short source label enters owner emails, never click IDs or raw attribution. */
export function emailSourceSummary(
  registrations: readonly string[],
  payments: readonly { source: string; amount: number }[],
) {
  const totals = new Map<string, SourceTotal>();
  const group = (source: string) => {
    const label = source || "нет данных";
    let value = totals.get(label);
    if (!value) { value = { registrations: 0, payments: 0, revenue: 0 }; totals.set(label, value); }
    return value;
  };
  for (const source of registrations) group(source).registrations++;
  for (const payment of payments) {
    const total = group(payment.source);
    total.payments++;
    total.revenue += payment.amount;
  }
  const lines = [...totals].sort(([a], [b]) => a.localeCompare(b, "ru"))
    .map(([source, total]) => `${source}: регистрации — ${total.registrations}, оплаты — ${total.payments}, выручка — ${total.revenue} ₽`);
  return `Источники регистрации и оплат:\n${lines.length ? lines.join("\n") : "За этот период событий нет."}`;
}
