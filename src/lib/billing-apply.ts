import { archivedPlanId, isComplimentary } from "@/lib/workspace-plan";
import { recordBusinessEvent } from "@/lib/business-events";
import { PaymentStatus, Prisma, WorkspacePlan } from "@prisma/client";
import { getDb } from "@/lib/db";
import { funnelTable } from "@/lib/funnel-table";
import { logger } from "@/lib/logger";
import { nextPaidPeriodEnd, resolvePaidPlanId } from "@/lib/billing-period";
import { getPlan } from "@/lib/plans";
import {
  getYookassaPayment,
  yookassaPaymentMatchesOrder,
  type YookassaPayment,
} from "@/lib/yookassa";
import { metadataString, parseYookassaAmountRub } from "@/lib/yookassa-amount";
import { FUNNEL_EVENTS, recordFunnelEvent } from "@/lib/funnel";

type Tx = Prisma.TransactionClient;

const OPEN_FOR_FULFILL = [
  PaymentStatus.PENDING,
  PaymentStatus.CANCELED,
] as const;

async function recordEvent(
  tx: Tx | ReturnType<typeof getDb>,
  data: {
    workspaceId?: string | null;
    paymentId?: string | null;
    providerPaymentId?: string | null;
    type: string;
    message?: string;
    payload?: Prisma.InputJsonValue;
  },
) {
  await tx.billingEvent.create({
    data: {
      workspaceId: data.workspaceId ?? undefined,
      paymentId: data.paymentId ?? undefined,
      providerPaymentId: data.providerPaymentId ?? undefined,
      type: data.type,
      message: data.message,
      payload: data.payload,
    },
  });
}

export async function applySucceededPayment(
  paymentId: string,
): Promise<{ applied: boolean; reason: string }> {
  const db = getDb();
  const result = await db.$transaction(async (tx) => {
    const local = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!local) return { applied: false, reason: "missing" };
    if (local.status === PaymentStatus.SUCCEEDED) {
      await recordEvent(tx, {
        workspaceId: local.workspaceId,
        paymentId: local.id,
        providerPaymentId: local.providerPaymentId,
        type: "payment.duplicate_ignored",
        message: "Платёж уже применён, период не продлевается повторно.",
      });
      await recordFunnelEvent({
        name: FUNNEL_EVENTS.payment_succeeded,
        workspaceId: local.workspaceId,
        paymentId: local.id,
        isTest: local.isTest,
        oncePerPayment: true,
        tx,
        throwOnError: true,
      });
      return { applied: false, reason: "already_applied" };
    }
    if (
      local.status !== PaymentStatus.PENDING &&
      local.status !== PaymentStatus.CANCELED
    ) {
      return { applied: false, reason: "not_pending" };
    }
    if (!local.planId || local.planId === WorkspacePlan.FREE) {
      return { applied: false, reason: "plan" };
    }

    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${local.workspaceId} FOR UPDATE`;

    const claimed = await tx.payment.updateMany({
      where: { id: local.id, status: { in: [...OPEN_FOR_FULFILL] } },
      data: { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
    });
    if (claimed.count !== 1) {
      await recordEvent(tx, {
        workspaceId: local.workspaceId,
        paymentId: local.id,
        providerPaymentId: local.providerPaymentId,
        type: "payment.duplicate_ignored",
        message: "Параллельный webhook уже применил платёж.",
      });
      return { applied: false, reason: "lost_claim" };
    }

    const locked = await tx.payment.findUnique({ where: { id: local.id } });
    if (!locked?.planId || locked.planId === WorkspacePlan.FREE) {
      return { applied: false, reason: "plan" };
    }

    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: local.workspaceId }, include: { subscription: true } });
    const archiveId = archivedPlanId(workspace);
    if (isComplimentary(workspace) || (archiveId && archiveId !== locked.planId && locked.termsMode !== "current")) {
      await recordEvent(tx, { workspaceId: local.workspaceId, paymentId: local.id,
        providerPaymentId: local.providerPaymentId, type: "payment.access_preserved",
        message: "Оплата получена, но специальные условия не заменены. Требуется проверка администратором." });
      return { applied: false, reason: "access_preserved" };
    }
    const existing = await tx.subscription.findUnique({
      where: { workspaceId: local.workspaceId },
    });
    const currentPeriodEnd = nextPaidPeriodEnd(
      new Date(),
      existing?.currentPeriodEnd,
      existing?.status,
    );
    const subscription = await tx.subscription.upsert({
      where: { workspaceId: local.workspaceId },
      create: {
        workspaceId: local.workspaceId,
        plan: locked.planId,
        status: "active",
        currentPeriodEnd,
      },
      update: {
        plan: locked.planId,
        currentPeriodEnd,
        status: "active",
        cancelAtPeriodEnd: false,
      },
    });

    await tx.payment.update({
      where: { id: local.id },
      data: { subscriptionId: subscription.id },
    });
    await tx.workspace.update({
      where: { id: local.workspaceId },
      data: { plan: locked.planId, ...(locked.termsMode === "current" ? { accessMode: "standard" } : {}) },
    });
    await recordEvent(tx, {
      workspaceId: local.workspaceId,
      paymentId: local.id,
      providerPaymentId: local.providerPaymentId,
      type: "payment.applied",
      message: `Права ${locked.planId} до ${currentPeriodEnd.toISOString()}`,
      payload: {
        planId: locked.planId,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        amount: local.amount,
      },
    });
    await recordFunnelEvent({
      name: FUNNEL_EVENTS.payment_succeeded,
      workspaceId: local.workspaceId,
      paymentId: local.id,
      isTest: locked.isTest,
      oncePerPayment: true,
      tx,
      throwOnError: true,
    });
    const previousPayments = await tx.payment.count({
      where: {
        workspaceId: local.workspaceId,
        id: { not: local.id },
        status: PaymentStatus.SUCCEEDED,
        isTest: false,
      },
    });
    await recordBusinessEvent(tx, {
      key: `payment:${local.id}`,
      name: "payment_succeeded",
      workspaceId: local.workspaceId,
      paymentId: local.id,
      isTest: locked.isTest || process.env.NODE_ENV !== "production",
      payload: {
        amount: local.amount,
        plan: locked.planId,
        periodEnd: currentPeriodEnd.toISOString(),
        firstPayment: previousPayments === 0,
      },
    });
    return { applied: true, reason: "applied" };
  });
  return result;
}

async function resolvePlanForRemote(input: {
  localPlanId: string | null | undefined;
  remote: YookassaPayment;
  description?: string | null;
  amountRub: number;
}): Promise<WorkspacePlan | null> {
  const [planPro, planBusiness] = await Promise.all([
    getPlan("PRO"),
    getPlan("BUSINESS"),
  ]);
  return resolvePaidPlanId({
    localPlanId: input.localPlanId,
    metadataPlanId: input.remote.metadata?.planId,
    description: input.description,
    amountRub: input.amountRub,
    prices: { PRO: planPro.priceRub, BUSINESS: planBusiness.priceRub },
  });
}

export async function recoverLocalPayment(
  remote: YookassaPayment,
): Promise<{ id: string } | null> {
  const db = getDb();
  const existing = await db.payment.findUnique({
    where: { providerPaymentId: remote.id },
  });
  if (existing) return { id: existing.id };

  const workspaceId = metadataString(remote.metadata, "workspaceId");
  const amountRub = parseYookassaAmountRub(remote.amount?.value);
  if (!workspaceId || amountRub == null) {
    await recordEvent(db, {
      providerPaymentId: remote.id,
      type: "payment.unmatched",
      message: "Нет workspaceId или суммы в объекте YooKassa.",
      payload: {
        metadata: remote.metadata ?? {},
        amount: remote.amount ?? null,
      },
    });
    return null;
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true },
  });
  if (!workspace) {
    await recordEvent(db, {
      providerPaymentId: remote.id,
      type: "payment.unmatched",
      message: "Workspace из metadata не найден.",
      payload: { workspaceId },
    });
    return null;
  }

  const planId = await resolvePlanForRemote({
    localPlanId: metadataString(remote.metadata, "planId"),
    remote,
    description:
      `Оплата тарифа ${metadataString(remote.metadata, "planId") ?? ""}`.trim(),
    amountRub,
  });
  if (!planId) {
    await recordEvent(db, {
      workspaceId,
      providerPaymentId: remote.id,
      type: "payment.unmatched",
      message: "Не удалось определить тариф для восстановленного платежа.",
    });
    return null;
  }

  const match = yookassaPaymentMatchesOrder(remote, {
    amount: amountRub,
    currency: remote.amount?.currency ?? "RUB",
    planId,
  });
  if (!match.ok) {
    await recordEvent(db, {
      workspaceId,
      providerPaymentId: remote.id,
      type: "payment.unmatched",
      message: `Платёж провайдера не совпал с заказом: ${match.reason}`,
    });
    return null;
  }

  try {
    const created = await db.payment.create({
      data: {
        workspaceId,
        providerPaymentId: remote.id,
        amount: amountRub,
        currency: remote.amount?.currency ?? "RUB",
        planId,
        termsMode: ["archive", "current"].includes(metadataString(remote.metadata, "termsMode") ?? "") ? metadataString(remote.metadata, "termsMode") : null,
        isTest: Boolean(remote.test),
        status: PaymentStatus.PENDING,
        description: `Оплата тарифа ${planId} (восстановлено из провайдера)`,
      },
    });
    await recordEvent(db, {
      workspaceId,
      paymentId: created.id,
      providerPaymentId: remote.id,
      type: "payment.recovered",
      message: "Локальный заказ восстановлен из объекта YooKassa.",
      payload: { planId, amount: amountRub },
    });
    return { id: created.id };
  } catch (error) {
    const raced = await db.payment.findUnique({
      where: { providerPaymentId: remote.id },
    });
    if (raced) return { id: raced.id };
    logger.error({
      area: "api",
      route: "/api/billing/webhook",
      message: "Failed to recover local payment",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message } : error,
    });
    return null;
  }
}

export async function fulfillYookassaPayment(
  remote: YookassaPayment,
): Promise<{ applied: boolean; reason: string }> {
  const db = getDb();
  let local = await db.payment.findUnique({
    where: { providerPaymentId: remote.id },
  });
  if (!local) {
    const recovered = await recoverLocalPayment(remote);
    if (!recovered) return { applied: false, reason: "unmatched" };
    local = await db.payment.findUnique({ where: { id: recovered.id } });
  }
  if (!local) return { applied: false, reason: "missing" };

  if (Boolean(remote.test) !== local.isTest) {
    await db.payment.update({
      where: { id: local.id },
      data: { isTest: Boolean(remote.test) },
    });
    if (local.status === PaymentStatus.SUCCEEDED) {
      await funnelTable(db).updateMany({
        where: { paymentId: local.id, name: FUNNEL_EVENTS.payment_succeeded },
        data: { isTest: Boolean(remote.test) },
      });
    }
    local = { ...local, isTest: Boolean(remote.test) };
  }

  if (local.status === PaymentStatus.SUCCEEDED) {
    return applySucceededPayment(local.id);
  }

  const planId = await resolvePlanForRemote({
    localPlanId: local.planId,
    remote,
    description: local.description,
    amountRub: local.amount,
  });
  if (!planId) {
    await recordEvent(db, {
      workspaceId: local.workspaceId,
      paymentId: local.id,
      providerPaymentId: local.providerPaymentId,
      type: "payment.unmatched",
      message: "Не удалось определить тариф для локального заказа.",
    });
    return { applied: false, reason: "plan" };
  }

  const match = yookassaPaymentMatchesOrder(remote, {
    amount: local.amount,
    currency: local.currency,
    planId,
  });
  if (!match.ok) {
    await recordEvent(db, {
      workspaceId: local.workspaceId,
      paymentId: local.id,
      providerPaymentId: local.providerPaymentId,
      type: "payment.rejected",
      message: `YooKassa не совпала с локальным заказом: ${match.reason}`,
    });
    return { applied: false, reason: match.reason };
  }

  if (!local.planId || Boolean(remote.test) !== local.isTest) {
    await db.payment.updateMany({
      where: { id: local.id, status: { in: [...OPEN_FOR_FULFILL] } },
      data: {
        ...(!local.planId ? { planId } : {}),
        isTest: Boolean(remote.test),
      },
    });
  }

  return applySucceededPayment(local.id);
}

export async function cancelPendingPayment(providerPaymentId: string) {
  const db = getDb();
  const updated = await db.payment.updateMany({
    where: { providerPaymentId, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.CANCELED },
  });
  if (updated.count === 1) {
    const local = await db.payment.findUnique({ where: { providerPaymentId } });
    await recordEvent(db, {
      workspaceId: local?.workspaceId,
      paymentId: local?.id,
      providerPaymentId,
      type: "payment.canceled",
      message: "Локальный заказ отменён по статусу YooKassa.",
    });
  }
  return updated.count === 1;
}

export async function syncYookassaPayment(providerPaymentId: string) {
  const remote = await getYookassaPayment(providerPaymentId);
  if (!remote) return { ok: false as const, reason: "provider_missing" };

  if (remote.status === "canceled") {
    await cancelPendingPayment(providerPaymentId);
    return { ok: true as const, reason: "canceled" };
  }

  if (remote.status !== "succeeded") {
    return { ok: true as const, reason: remote.status };
  }

  const result = await fulfillYookassaPayment(remote);
  return { ok: true as const, reason: result.reason, applied: result.applied };
}
