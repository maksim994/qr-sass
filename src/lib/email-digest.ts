import { signupSourceLabel } from "@/lib/signup-source";
import { emailSourceSummary } from "@/lib/email-source-summary";
import { queueEmail, serviceMessage, type EmailTx } from "@/lib/email-notifications";
import { moscowDay, OWNER_EMAIL } from "@/lib/email-notification-policy";
import { digestTitle, digestTotalsText } from "@/lib/email-digest-policy";

export async function buildOwnerDigest(tx: EmailTx, window: { start: Date; end: Date }, test = false) {
  const [events, money] = await Promise.all([
    tx.businessEvent.groupBy({
      by: ["name"],
      where: {
        isTest: false,
        createdAt: { gte: window.start, lt: window.end },
      },
      _count: true,
    }),
    tx.payment.aggregate({
      where: {
        isTest: false,
        status: "SUCCEEDED",
        paidAt: { gte: window.start, lt: window.end },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);
  const count = (name: string) =>
    events.find((e) => e.name === name)?._count ?? 0;
  const [registrations, payments] = await Promise.all([
    tx.businessEvent.findMany({
      where: { name: "registration_completed", isTest: false, createdAt: { gte: window.start, lt: window.end } },
      select: { userId: true },
    }),
    tx.payment.findMany({
      where: { isTest: false, status: "SUCCEEDED", paidAt: { gte: window.start, lt: window.end } },
      select: { amount: true, signupSourceUserId: true },
    }),
  ]);
  const ids = [...new Set([
    ...registrations.map(event => event.userId),
    ...payments.map(payment => payment.signupSourceUserId),
  ].filter((id): id is string => !!id))];
  const sources = await tx.userSignupSource.findMany({ where: { userId: { in: ids } } });
  const labels = new Map(sources.map(source => [source.userId, signupSourceLabel(source)]));
  const sourceLabel = (id: string | null) => id ? labels.get(id) ?? "нет данных" : "нет данных";
  const sourceSummary = emailSourceSummary(
    registrations.map(event => sourceLabel(event.userId)),
    payments.map(payment => ({ source: sourceLabel(payment.signupSourceUserId), amount: payment.amount })),
  );
  const day = moscowDay(window.start);
  return serviceMessage(
    digestTitle(day, test),
    `${test ? "Тестовая сводка. Только агрегаты, без персональных данных.\n" : ""}За ${day}. МСК.\n${digestTotalsText(count("registration_completed"), count("trial_started"), money._count, money._sum.amount ?? 0)}\n\n${sourceSummary}`,
    "/admin/business", "Открыть отчёт",
  );
}

export async function queueOwnerDigest(tx: EmailTx, window: { start: Date; end: Date }, key: string, test = false) {
  // Check before aggregating; the unique key also protects concurrent schedulers.
  if (await tx.emailOutbox.findUnique({ where: { key }, select: { id: true } })) return;
  await queueEmail(tx, {
    key, kind: "owner_digest", to: OWNER_EMAIL,
    context: { digestDate: moscowDay(window.start), test },
    message: await buildOwnerDigest(tx, window, test),
  });
}
