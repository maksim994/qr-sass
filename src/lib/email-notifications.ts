import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { encryptIntegrationSecret } from "@/lib/integration-secrets";
import { env } from "@/lib/env";
import { canEmail, OWNER_EMAIL } from "@/lib/email-notification-policy";
import { renderEmailLayout } from "@/lib/email/templates";
import { generateResetToken, hashResetToken } from "@/lib/password-reset";
export type EmailTx = Prisma.TransactionClient;
export type EmailMessage = { subject: string; text: string; html?: string };
export function emailLink(path: string) {
  return new URL(path, env.APP_URL).toString();
}
export function billingEmailPath(workspaceId: string) {
  return `/dashboard/billing?workspaceId=${encodeURIComponent(workspaceId)}`;
}
export function emailDate(date: Date) {
  return date.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " МСК";
}
export function serviceMessage(
  title: string,
  text: string,
  path = "/dashboard",
  label = "Открыть кабинет",
): EmailMessage {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return {
    subject: `${title} — QR-S.ru`,
    text: `${text}\n\n${emailLink(path)}\nПоддержка: ${OWNER_EMAIL}`,
    html: renderEmailLayout({
      title,
      previewText: title,
      bodyHtml: escaped
        .split("\n")
        .map((p) => `<p>${p}</p>`)
        .join(""),
      ctaLabel: label,
      ctaUrl: emailLink(path),
      appUrl: env.APP_URL,
      footerNote: `Сервисное уведомление QR-S.ru. Поддержка: ${OWNER_EMAIL}`,
    }),
  };
}
export async function queueEmail(
  tx: EmailTx,
  input: {
    key: string;
    kind: string;
    to: string;
    message: EmailMessage;
    userId?: string;
    workspaceId?: string;
    context?: Prisma.InputJsonObject;
    expiresAt?: Date;
  },
) {
  if (!canEmail(input.to)) return;
  await tx.emailOutbox.createMany({
    data: {
      key: input.key,
      kind: input.kind,
      toEmail: input.to,
      userId: input.userId,
      workspaceId: input.workspaceId,
      context: input.context ?? {},
      expiresAt: input.expiresAt,
      payloadCipher: encryptIntegrationSecret(JSON.stringify(input.message)),
    },
    skipDuplicates: true,
  });
}
export async function queueVerification(
  tx: EmailTx,
  user: { id: string; email: string; name: string | null },
) {
  if (!canEmail(user.email)) return;
  await tx.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = generateResetToken(),
    expiresAt = new Date(Date.now() + 24 * 60 * 60_000);
  const row = await tx.emailVerificationToken.create({
    data: {
      userId: user.id,
      email: user.email,
      tokenHash: hashResetToken(token),
      expiresAt,
    },
  });
  const path = `/verify-email?token=${encodeURIComponent(token)}`;
  await queueEmail(tx, {
    key: `verify:${row.id}`,
    kind: "verify_email",
    to: user.email,
    userId: user.id,
    expiresAt,
    context: { verificationId: row.id },
    message: serviceMessage(
      "Подтвердите email",
      `Здравствуйте${user.name ? ", " + user.name : ""}! Ваш аккаунт QR-S.ru готов.\nПодтвердите этот адрес, чтобы получать сервисные уведомления. Ссылка действует 24 часа.\nЕсли вы не создавали аккаунт и не меняли email, проигнорируйте письмо.`,
      path,
      "Подтвердить email",
    ),
  });
}
export async function queuePasswordChanged(
  tx: EmailTx,
  user: { id: string; email: string },
  key: string,
) {
  await queueEmail(tx, {
    key,
    kind: "password_changed",
    to: user.email,
    userId: user.id,
    context: { securityNotice: true },
    message: serviceMessage(
      "Пароль изменён",
      "Пароль вашего аккаунта QR-S.ru изменён.\nЕсли это были не вы, сразу восстановите доступ и обратитесь в поддержку.",
      "/forgot-password",
      "Восстановить доступ",
    ),
  });
}
export async function queueOwnerAlert(
  tx: EmailTx,
  key: string,
  title: string,
  text: string,
) {
  await queueEmail(tx, {
    key,
    kind: "owner_alert",
    to: OWNER_EMAIL,
    message: serviceMessage(title, text, "/admin", "Открыть админку"),
  });
}
export async function queuePaymentEmail(
  tx: EmailTx,
  input: {
    id: string;
    workspaceId: string;
    amount: number;
    plan: string;
    periodEnd: Date;
    isTest: boolean;
  },
) {
  if (input.isTest) return;
  const owners = await tx.membership.findMany({
    where: { workspaceId: input.workspaceId, role: "OWNER" },
    include: { user: true, workspace: true },
  });
  for (const owner of owners)
    await queueEmail(tx, {
      key: `payment:${input.id}:${owner.userId}`,
      kind: "payment_received",
      to: owner.user.email,
      userId: owner.userId,
      workspaceId: input.workspaceId,
      message: serviceMessage(
        "Оплата получена",
        `Рабочее пространство: ${owner.workspace.name}.\nПолучено ${input.amount} ₽. Тариф ${input.plan} активирован до ${emailDate(input.periodEnd)}.\nНомер платежа: ${input.id}.\nЭто подтверждение от сервиса. Фискальный чек оформляется отдельно платёжным провайдером.`,
        billingEmailPath(input.workspaceId),
      ),
    });
}
export async function enqueueOwnerEvent(
  tx: EmailTx,
  name: string,
  key: string,
  payload: Prisma.InputJsonObject,
) {
  if (name !== "payment_succeeded") return;
  await queueOwnerAlert(
    tx,
    `owner:${key}`,
    "Получена оплата",
    `${payload.firstPayment ? "Первая" : "Повторная"} оплата: ${payload.amount} ₽. Тариф: ${payload.plan}.\nДоступ до: ${payload.periodEnd}.`,
  );
}
export async function emailHealth() {
  const db = getDb();
  const [control, pending, failed] = await Promise.all([
    db.emailControl.findUnique({ where: { id: "default" } }),
    db.emailOutbox.count({ where: { status: "PENDING" } }),
    db.emailOutbox.count({ where: { status: "FAILED" } }),
  ]);
  return { control, pending, failed };
}
