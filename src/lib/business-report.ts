import { getDb } from "@/lib/db";
export async function getBusinessReport(
  days: number,
  isTest: boolean,
  now = new Date(),
) {
  const since = new Date(now.getTime() - days * 86400000),
    db = getDb();
  const [counts, money, legacy, daily, cohorts] = await Promise.all([
    db.businessEvent.groupBy({
      by: ["name"],
      where: { isTest, createdAt: { gte: since, lte: now } },
      _count: true,
    }),
    db.payment.aggregate({
      where: { isTest, status: "SUCCEEDED", paidAt: { gte: since, lte: now } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.count({ where: { isTest, status: "SUCCEEDED", paidAt: null } }),
    db.$queryRaw<
      { day: string; registrations: bigint; trials: bigint; payments: bigint }[]
    >`SELECT to_char("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow','YYYY-MM-DD') AS day, count(*) FILTER (WHERE name='registration_completed') AS registrations, count(*) FILTER (WHERE name='trial_started') AS trials, count(*) FILTER (WHERE name='payment_succeeded') AS payments FROM "BusinessEvent" WHERE "isTest"=${isTest} AND "createdAt">=${since} AND "createdAt"<=${now} GROUP BY day ORDER BY day DESC`,
    db.$queryRaw<
      {
        week: string;
        started: bigint;
        mature: bigint;
        converted: bigint;
        pending: bigint;
      }[]
    >`SELECT to_char(date_trunc('week', t."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Moscow'),'YYYY-MM-DD') AS week, count(*) AS started, count(*) FILTER (WHERE t."createdAt" + interval '21 days' <= ${now}) AS mature, count(*) FILTER (WHERE t."createdAt" + interval '21 days' > ${now}) AS pending, count(*) FILTER (WHERE t."createdAt" + interval '21 days' <= ${now} AND EXISTS (SELECT 1 FROM "Payment" p WHERE p."workspaceId"=t."workspaceId" AND p."isTest"=${isTest} AND p."paidAt">=t."createdAt" AND p."paidAt"<=t."createdAt" + interval '21 days')) AS converted FROM "BusinessEvent" t WHERE t.name='trial_started' AND t."isTest"=${isTest} AND t."createdAt">=${since} AND t."createdAt"<=${now} GROUP BY week ORDER BY week DESC`,
  ]);
  return {
    count: (name: string) =>
      counts.find((row) => row.name === name)?._count ?? 0,
    money: money._sum.amount ?? 0,
    payments: money._count,
    legacy,
    daily,
    cohorts,
  };
}
