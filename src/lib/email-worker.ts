import { randomUUID } from "node:crypto";
import type { EmailOutbox } from "@prisma/client";
import { getDb } from "@/lib/db";
import { decryptIntegrationSecret } from "@/lib/integration-secrets";
import { sendMail } from "@/lib/mail";
import {
  billingEmailPath,
  emailDate,
  queueEmail,
  queueOwnerAlert,
  serviceMessage,
  type EmailMessage,
} from "@/lib/email-notifications";
import {
  DAY_MS,
  digestWindow,
  EMAIL_MAX_ATTEMPTS,
  OWNER_EMAIL,
  periodNoticeStage,
  permanentSmtpError,
  retryDelay,
  smtpErrorCode,
} from "@/lib/email-notification-policy";
import { getPlan } from "@/lib/plans";
import { applyWorkspaceTerms } from "@/lib/workspace-plan";
import { isComplimentary } from "@/lib/workspace-plan";

export async function emailStillRelevant(job: EmailOutbox, now = new Date()) {
  const db = getDb(),
    context = job.context as Record<string, unknown>;
  if (job.expiresAt && job.expiresAt <= now) return false;
  if (
    job.userId &&
    job.kind !== "email_changed" &&
    context.securityNotice !== true
  ) {
    const user = await db.user.findUnique({ where: { id: job.userId } });
    if (!user || user.email !== job.toEmail) return false;
  }
  if (job.kind === "payment_received" && job.workspaceId && job.userId) {
    const owner = await db.membership.findFirst({
      where: {
        userId: job.userId,
        workspaceId: job.workspaceId,
        role: "OWNER",
      },
    });
    if (!owner) return false;
  }
  if (context.verificationId) {
    const token = await db.emailVerificationToken.findUnique({
      where: { id: String(context.verificationId) },
    });
    if (!token || token.usedAt || token.expiresAt <= now) return false;
  }
  if (context.resetId) {
    const token = await db.passwordResetToken.findUnique({
      where: { id: String(context.resetId) },
    });
    const user = job.userId
      ? await db.user.findUnique({ where: { id: job.userId } })
      : null;
    if (
      !token ||
      token.usedAt ||
      token.expiresAt <= now ||
      user?.sessionVersion !== context.sessionVersion
    )
      return false;
  }
  if (context.inviteId) {
    const invite = await db.workspaceInvite.findUnique({
      where: { id: String(context.inviteId) },
    });
    if (
      !invite ||
      invite.status !== "PENDING" ||
      invite.expiresAt <= now ||
      invite.email !== job.toEmail
    )
      return false;
  }
  if (context.periodEnd && job.workspaceId) {
    const workspace = await db.workspace.findUnique({
      where: { id: job.workspaceId },
      include: { subscription: true },
    });
    const sub = workspace?.subscription;
    if (
      !workspace ||
      isComplimentary(workspace) ||
      !sub ||
      sub.currentPeriodEnd.toISOString() !== context.periodEnd
    )
      return false;
    const owner = await db.membership.findFirst({
      where: {
        userId: job.userId!,
        workspaceId: job.workspaceId,
        role: "OWNER",
      },
    });
    if (!owner) return false;
    if (Number(context.stage) === 0) return sub.currentPeriodEnd <= now;
    return (
      sub.currentPeriodEnd > now &&
      ["active", "trial", "canceled"].includes(sub.status) &&
      periodNoticeStage(sub.currentPeriodEnd, now, context.trial === true) ===
        context.stage
    );
  }
  return true;
}

export async function deliverNextEmail(transport = sendMail) {
  const db = getDb(),
    now = new Date(),
    leaseToken = randomUUID();
  const job = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "EmailOutbox" WHERE (status='PENDING' AND "nextAttemptAt"<=${now}) OR (status='SENDING' AND "leaseUntil"<${now}) ORDER BY CASE WHEN kind IN ('password_reset','password_changed','verify_email') THEN 0 ELSE 1 END, "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!rows[0]) return null;
    return tx.emailOutbox.update({
      where: { id: rows[0].id },
      data: {
        status: "SENDING",
        leaseToken,
        leaseUntil: new Date(now.getTime() + 120_000),
        attempts: { increment: 1 },
      },
    });
  });
  if (!job) return false;
  const where = { id: job.id, leaseToken };
  try {
    if (!(await emailStillRelevant(job, now))) {
      await db.emailOutbox.updateMany({
        where,
        data: {
          status: "CANCELED",
          payloadCipher: null,
          leaseUntil: null,
          leaseToken: null,
        },
      });
      return true;
    }
    if (job.attempts > EMAIL_MAX_ATTEMPTS) throw { code: "ATTEMPTS_EXHAUSTED" };
    if (!job.payloadCipher) throw { code: "EMPTY_PAYLOAD" };
    const message: EmailMessage = JSON.parse(
      decryptIntegrationSecret(job.payloadCipher),
    );
    const result = await transport({
      ...message,
      to: job.toEmail,
      messageId: `<${job.id}@qr-s.ru>`,
    });
    if (!result.sent) throw { code: "SMTP_NOT_CONFIGURED" };
    await db.emailOutbox.updateMany({
      where,
      data: {
        status: "SENT",
        sentAt: new Date(),
        payloadCipher: null,
        leaseUntil: null,
        leaseToken: null,
        errorCode: null,
      },
    });
  } catch (error) {
    const failed =
      job.attempts >= EMAIL_MAX_ATTEMPTS || permanentSmtpError(error);
    await db.emailOutbox.updateMany({
      where,
      data: {
        status: failed ? "FAILED" : "PENDING",
        errorCode: smtpErrorCode(error),
        nextAttemptAt: new Date(Date.now() + retryDelay(job.attempts)),
        leaseUntil: null,
        leaseToken: null,
      },
    });
  }
  return true;
}

export async function scheduleEmailNotifications(now = new Date()) {
  const db = getDb();
  const freePlan = await getPlan("FREE", { strict: true });
  // One scheduler at a time; a persistent watermark excludes all pre-release history.
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "EmailControl" WHERE id='default' FOR UPDATE`;
      const control = await tx.emailControl.findUniqueOrThrow({
        where: { id: "default" },
      });
      if (
        control.lastScheduledAt &&
        now.getTime() - control.lastScheduledAt.getTime() < 60_000
      )
        return;
      const since = control.enabledSince;
      const subs = await tx.subscription.findMany({
        where: {
          currentPeriodEnd: {
            gte: new Date(Math.max(since.getTime(), now.getTime() - DAY_MS)),
            lte: new Date(now.getTime() + 3 * DAY_MS),
          },
          plan: { not: "FREE" },
        },
        include: {
          workspace: {
            include: {
              memberships: {
                where: { role: "OWNER" },
                include: { user: true },
              },
            },
          },
        },
      });
      for (const sub of subs) {
        const workspace = sub.workspace;
        if (isComplimentary({ ...workspace, subscription: sub })) continue;
        const trial =
          sub.status === "trial" ||
          !!(await tx.businessEvent.findFirst({
            where: {
              workspaceId: workspace.id,
              name: "trial_started",
              payload: {
                path: ["periodEnd"],
                equals: sub.currentPeriodEnd.toISOString(),
              },
            },
          }));
        const stage = periodNoticeStage(sub.currentPeriodEnd, now, trial);
        if (
          stage === null ||
          (stage > 0 && !["active", "trial", "canceled"].includes(sub.status))
        )
          continue;
        const title =
          stage === 0
            ? trial
              ? "Пробный период закончился"
              : "Оплаченный период закончился"
            : trial
              ? "Пробный период заканчивается"
              : "Оплаченный период заканчивается";
        const limits = applyWorkspaceTerms(
          workspace,
          freePlan,
        ).limitLabels.join("; ");
        const free = `После окончания действуют бесплатные условия: ${limits}. Возможности API доступны только на действующем тарифе Бизнес.`;
        for (const owner of workspace.memberships)
          await queueEmail(tx, {
            key: `period:${sub.id}:${sub.currentPeriodEnd.toISOString()}:${stage}:${owner.userId}`,
            kind: stage === 0 ? "period_ended" : "period_ending",
            to: owner.user.email,
            userId: owner.userId,
            workspaceId: workspace.id,
            context: {
              periodEnd: sub.currentPeriodEnd.toISOString(),
              stage,
              trial,
            },
            expiresAt: new Date(sub.currentPeriodEnd.getTime() + DAY_MS),
            message: serviceMessage(
              title,
              `Рабочее пространство: ${workspace.name}.\nДата окончания периода: ${emailDate(sub.currentPeriodEnd)}.\n${free}\nУже созданные короткие ссылки продолжат работать; заданные вами пароль, срок действия и лимиты сканов сохраняются.\nПродлить доступ можно в разделе оплаты.`,
              billingEmailPath(workspace.id),
              "Посмотреть тариф и продлить",
            ),
          });
      }
      const window = digestWindow(now);
      if (window.start < since) window.start = since;
      if (window.ready && window.end > since) {
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
        await queueEmail(tx, {
          key: `digest:${window.day}`,
          kind: "owner_digest",
          to: OWNER_EMAIL,
          expiresAt: new Date(now.getTime() + DAY_MS),
          message: serviceMessage(
            "Сводка за день",
            `За ${window.start.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" })}.\nРегистрации: ${count("registration_completed")}.\nЗапуски пробного периода: ${count("trial_started")}.\nОплаты: ${money._count}.\nВыручка: ${money._sum.amount ?? 0} ₽.`,
            "/admin/business",
            "Открыть отчёт",
          ),
        });
      }
      const [failedEmails, blockedPayments] = await Promise.all([
        tx.emailOutbox.count({
          where: {
            status: "FAILED",
            kind: { not: "owner_alert" },
            createdAt: {
              gte: new Date(Math.max(since.getTime(), now.getTime() - DAY_MS)),
            },
          },
        }),
        tx.payment.findMany({
          where: {
            status: "SUCCEEDED",
            subscriptionId: null,
            isTest: false,
            paidAt: { gte: since, lt: new Date(now.getTime() - 5 * 60_000) },
          },
          take: 100,
        }),
      ]);
      if (failedEmails)
        await queueOwnerAlert(
          tx,
          `delivery-alert:${window.day}`,
          "Ошибки доставки писем",
          `За последние сутки не удалось доставить писем: ${failedEmails}. Проверьте SMTP и очередь в админке. Если SMTP недоступен, это письмо будет доставлено после восстановления.`,
        );
      for (const payment of blockedPayments)
        await queueOwnerAlert(
          tx,
          `payment-alert:${payment.id}`,
          "Оплата требует проверки",
          `Платёж ${payment.id} на ${payment.amount} ₽ подтверждён, но не привязан к активированной подписке. Проверьте кабинет ${payment.workspaceId}.`,
        );
      await tx.emailControl.update({
        where: { id: "default" },
        data: { lastScheduledAt: now },
      });
    },
    { timeout: 30_000 },
  );
  await db.emailOutbox.updateMany({
    where: {
      createdAt: { lt: new Date(now.getTime() - 7 * DAY_MS) },
      payloadCipher: { not: null },
    },
    data: { payloadCipher: null, status: "CANCELED" },
  });
  await db.emailOutbox.deleteMany({
    where: {
      status: { in: ["SENT", "FAILED", "CANCELED"] },
      createdAt: { lt: new Date(now.getTime() - 90 * DAY_MS) },
    },
  });
  await db.emailVerificationToken.deleteMany({
    where: { expiresAt: { lt: new Date(now.getTime() - 7 * DAY_MS) } },
  });
}
