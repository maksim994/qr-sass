import { parseMetrikaAttribution } from "@/lib/metrika-attribution";
import { getSiteSettings } from "@/lib/site-settings";
import { NextRequest, NextResponse } from "next/server";
import { WorkspacePlan } from "@prisma/client";
import { MSG } from "@/lib/user-messages";
import { getApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";
import { applyWorkspaceTerms, archivedPlanId, isComplimentary } from "@/lib/workspace-plan";
import { getPlan } from "@/lib/plans";
import { createYookassaPayment } from "@/lib/yookassa";
import { FUNNEL_EVENTS, isPrivateOrLocalIp, recordFunnelEvent } from "@/lib/funnel";
import { getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { apiError, apiSuccess, readJsonBody } from "@/lib/api-response";
import { env } from "@/lib/env";
import { buildRobokassaPayment, getRobokassaConfig, newRobokassaInvoiceId, robokassaPaymentId } from "@/lib/robokassa";

const PAID_PLANS: WorkspacePlan[] = ["PRO", "BUSINESS"];

export async function POST(req: NextRequest) {
  const prisma = getDb();
  try {
    const user = await getApiUser();
    if (!user) {
      return NextResponse.json({ error: MSG.UNAUTHORIZED }, { status: 401 });
    }
    if (user.kind === "apiKey") {
      return NextResponse.json({ error: MSG.CHECKOUT_SESSION_REQUIRED }, { status: 403 });
    }

    const parsed = z.object({
      workspaceId: z.string().min(1), planId: z.enum(["PRO", "BUSINESS"]), useCurrentTerms: z.boolean().optional(), metrika: z.unknown().optional(),
    }).safeParse(await readJsonBody(req));
    if (!parsed.success) return apiError(MSG.WORKSPACE_ID_OR_PLAN_REQUIRED, "VALIDATION_ERROR", 400);
    const body = parsed.data;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const planId = PAID_PLANS.includes(body.planId) ? (body.planId as WorkspacePlan) : null;

    if (!workspaceId || !planId) {
      return NextResponse.json({ error: MSG.WORKSPACE_ID_OR_PLAN_REQUIRED }, { status: 400 });
    }

    const membership = user.memberships.find((w) => w.workspaceId === workspaceId);
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      return NextResponse.json({ error: MSG.FORBIDDEN }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, include: { subscription: true } });
    if (isComplimentary(workspace)) return NextResponse.json({ error: MSG.COMPLIMENTARY_NO_PAYMENT }, { status: 409 });
    const useCurrentTerms = body.useCurrentTerms === true;
    const archiveId = archivedPlanId(workspace);
    if (archiveId && archiveId !== planId && !useCurrentTerms) {
      return NextResponse.json({ error: MSG.ARCHIVE_CHANGE_CONFIRM }, { status: 409 });
    }
    const termsMode = archiveId && !useCurrentTerms ? "archive" : "current";
    const base = await getPlan(planId, { strict: true });
    const plan = termsMode === "archive" ? applyWorkspaceTerms(workspace, base) : base;
    if (plan.id === "FREE") {
      return NextResponse.json({ error: MSG.INVALID_PLAN }, { status: 400 });
    }
    const amount = plan.priceRub;
    let counter: string | null = null;
    try { counter = (await getSiteSettings()).yandexMetrikaId; } catch { /* Optional attribution. */ }
    const metrika = parseMetrikaAttribution(body.metrika, counter);
    const attribution = metrika ? { metrikaUserId: user.id, metrikaClientId: metrika.clientId, metrikaCounterId: metrika.counterId, metrikaConsentAt: new Date(), metrikaConsentVersion: metrika.consentVersion } : {};

    if (env.BILLING_PROVIDER === "robokassa") {
      const config = getRobokassaConfig();
      const invoiceId = newRobokassaInvoiceId();
      const name = `Доступ к QR-S.ru: тариф ${plan.name}, 1 месяц`;
      const local = await prisma.payment.create({ data: {
        workspaceId, provider: "robokassa", providerPaymentId: robokassaPaymentId(invoiceId),
        amount, currency: "RUB", planId, termsMode, ...attribution, isTest: config.isTest,
        description: config.isTest ? `Тест: ${name}` : name,
      } });
      const payment = buildRobokassaPayment({ invoiceId, orderId: local.id, amount, name, email: user.email }, config);
      await recordFunnelEvent({
        name: FUNNEL_EVENTS.checkout_started, workspaceId, userId: user.id, source: planId,
        isTest: config.isTest || isPrivateOrLocalIp(getClientIp(req)),
      });
      return apiSuccess({ provider: "robokassa" as const, paymentId: local.id, payment });
    }

    const paymentData = await createYookassaPayment(
      amount,
      `Оплата тарифа ${planId}`,
      { workspaceId, planId, userId: user.id, termsMode },
    );

    try {
      await prisma.payment.create({
        data: {
          workspaceId,
          providerPaymentId: paymentData.id,
          amount,
          currency: "RUB",
          planId,
          termsMode,
          ...attribution,
          isTest: Boolean(paymentData.test),
          status: "PENDING",
          description: `Оплата тарифа ${planId}`,
        },
      });
    } catch (error) {
      await prisma.billingEvent
        .create({
          data: {
            workspaceId,
            providerPaymentId: paymentData.id,
            type: "payment.local_create_failed",
            message: "YooKassa создала платёж, локальный заказ не записался. Webhook восстановит его.",
            payload: { planId, amount },
          },
        })
        .catch(() => undefined);
      logger.error({
        area: "api",
        route: "/api/billing/checkout",
        message: "Local payment row missing after YooKassa create",
        code: "INTERNAL_ERROR",
        status: 500,
        details: error instanceof Error ? { message: error.message } : error,
      });
    }

    await recordFunnelEvent({
      name: FUNNEL_EVENTS.checkout_started,
      workspaceId,
      userId: user.id,
      source: planId,
      isTest: isPrivateOrLocalIp(getClientIp(req)),
    });

    return NextResponse.json({ token: paymentData.confirmation?.confirmation_token });
  } catch {
    logger.error({
      area: "api",
      route: "/api/billing/checkout",
      message: "Checkout error",
      code: "INTERNAL_ERROR",
      status: 500,
    });
    return NextResponse.json({ error: MSG.INTERNAL_ERROR }, { status: 500 });
  }
}
