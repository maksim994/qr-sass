/** Synthetic isolated DB only. Never uses an SMTP transport. */
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db.ts";
import {
  queueEmail,
  queueVerification,
  queuePasswordChanged,
  serviceMessage,
} from "../src/lib/email-notifications.ts";
import { decryptIntegrationSecret } from "../src/lib/integration-secrets.ts";
import {
  deliverNextEmail,
  emailStillRelevant,
  scheduleEmailNotifications,
} from "../src/lib/email-worker.ts";
import { hashResetToken } from "../src/lib/password-reset.ts";
import { applySucceededPayment } from "../src/lib/billing-apply.ts";
if (!process.env.DATABASE_URL?.includes("/notifications_test"))
  throw new Error("Synthetic notifications_test DB required");
const db = getDb();
let checks = 0;
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
const id = `email-qa-${Date.now()}`;
const user = await db.user.create({
  data: {
    id,
    email: `${id}@example.test`,
    name: "Проверка <HTML>",
    passwordHash: "synthetic",
    memberships: {
      create: {
        role: "OWNER",
        workspace: {
          create: { id, name: "Тестовая команда", slug: id, plan: "PRO" },
        },
      },
    },
  },
});
const now = new Date();
await db.emailControl.update({
  where: { id: "default" },
  data: {
    enabledSince: new Date(now.getTime() - 86400000),
    lastScheduledAt: null,
  },
});
try {
  await db.$transaction((tx) => queueVerification(tx, user));
  let job = await db.emailOutbox.findFirstOrThrow({
    where: { userId: user.id, kind: "verify_email" },
  });
  const verification = JSON.parse(decryptIntegrationSecret(job.payloadCipher!));
  check(
    verification.html.includes("&lt;HTML&gt;"),
    "User-controlled HTML is escaped",
  );
  check(
    !job.payloadCipher!.includes("verify-email"),
    "Verification link encrypted at rest",
  );
  const rawToken = new URL(
    verification.text.match(/http[^\s]+/)![0],
  ).searchParams.get("token")!;
  const token = await db.emailVerificationToken.findUniqueOrThrow({
    where: { tokenHash: hashResetToken(rawToken) },
  });
  check(token.email === user.email, "Verification bound to exact email");
  await db.$transaction((tx) => queueVerification(tx, user));
  check(
    !(await emailStillRelevant(job)),
    "Superseded verification is canceled",
  );
  const activeToken = await db.emailVerificationToken.findFirstOrThrow({
    where: { userId: user.id, usedAt: null },
  });
  await db.user.update({
    where: { id: user.id },
    data: { email: "changed@example.test" },
  });
  const activeJob = await db.emailOutbox.findFirstOrThrow({
    where: { key: `verify:${activeToken.id}` },
  });
  check(
    !(await emailStillRelevant(activeJob)),
    "Email change cancels old-address mail",
  );
  await db.user.update({ where: { id: user.id }, data: { email: user.email } });
  const sub = await db.subscription.create({
    data: {
      workspaceId: id,
      plan: "PRO",
      status: "active",
      currentPeriodEnd: new Date(now.getTime() + 2 * 86400000),
    },
  });
  await scheduleEmailNotifications(now);
  const notices = await db.emailOutbox.findMany({
    where: { userId: user.id, kind: "period_ending" },
  });
  check(notices.length === 1, "Exactly one 3-day reminder queued");
  const notice = notices[0];
  check(await emailStillRelevant(notice), "Current reminder is relevant");
  await db.subscription.update({
    where: { id: sub.id },
    data: { currentPeriodEnd: new Date(now.getTime() + 30 * 86400000) },
  });
  check(!(await emailStillRelevant(notice)), "Renewal cancels queued reminder");
  await db.emailControl.update({
    where: { id: "default" },
    data: { lastScheduledAt: null },
  });
  await db.workspace.update({ where: { id }, data: { accessMode: "friends" } });
  await db.subscription.update({
    where: { id: sub.id },
    data: { currentPeriodEnd: new Date(now.getTime() + 3600000) },
  });
  await scheduleEmailNotifications(new Date(now.getTime() + 61000));
  check(
    (await db.emailOutbox.count({
      where: { kind: "period_ending", userId: user.id },
    })) === 1,
    "Complimentary workspace has no new reminders",
  );
  await db.workspace.update({
    where: { id },
    data: { accessMode: "standard" },
  });
  const payment = await db.payment.create({
    data: {
      workspaceId: id,
      provider: "robokassa",
      providerPaymentId: `robokassa:${Date.now()}`,
      amount: 199,
      planId: "PRO",
      termsMode: "current",
    },
  });
  await applySucceededPayment(payment.id);
  await applySucceededPayment(payment.id);
  check(
    (await db.emailOutbox.count({
      where: { key: `payment:${payment.id}:${user.id}` },
    })) === 1,
    "Duplicate webhook does not duplicate confirmation",
  );
  const fulfilled = await db.payment.findUniqueOrThrow({
    where: { id: payment.id },
  });
  check(
    fulfilled.status === "SUCCEEDED" && !!fulfilled.subscriptionId,
    "Receipt is queued only with activated rights",
  );
  const invitation = await db.workspaceInvite.create({
    data: {
      workspaceId: id,
      email: user.email,
      invitedByUserId: user.id,
      expiresAt: new Date(now.getTime() + 86400000),
    },
  });
  await db.$transaction((tx) =>
    queueEmail(tx, {
      key: `qa-invite:${id}`,
      kind: "team_invite",
      to: user.email,
      userId: user.id,
      workspaceId: id,
      context: { inviteId: invitation.id },
      message: serviceMessage("Тест", "Тест"),
    }),
  );
  const inviteJob = await db.emailOutbox.findUniqueOrThrow({
    where: { key: `qa-invite:${id}` },
  });
  check(
    await emailStillRelevant(inviteJob),
    "Pending invitation is deliverable",
  );
  await db.workspaceInvite.update({
    where: { id: invitation.id },
    data: { status: "REVOKED" },
  });
  check(
    !(await emailStillRelevant(inviteJob)),
    "Revoked invitation canceled before sending",
  );
  await db.emailOutbox.updateMany({
    data: { status: "CANCELED", payloadCipher: null },
  });
  await db.$transaction((tx) =>
    queuePasswordChanged(tx, user, `qa-security:${id}`),
  );
  const sent: string[] = [];
  const transport = async (input: { to: string }) => {
    sent.push(input.to);
    return { sent: true };
  };
  await Promise.all([deliverNextEmail(transport), deliverNextEmail(transport)]);
  check(sent.length === 1, "Concurrent workers lease a message once");
  job = await db.emailOutbox.findUniqueOrThrow({
    where: { key: `qa-security:${id}` },
  });
  check(
    job.status === "SENT" && job.payloadCipher === null,
    "Sent payload is erased",
  );
  await db.$transaction((tx) =>
    queueEmail(tx, {
      key: `qa-retry:${id}`,
      kind: "test",
      to: user.email,
      message: serviceMessage("Тест", "Тест"),
    }),
  );
  await deliverNextEmail(async () => {
    throw { responseCode: 451, message: "secret-do-not-log" };
  });
  job = await db.emailOutbox.findUniqueOrThrow({
    where: { key: `qa-retry:${id}` },
  });
  check(
    job.status === "PENDING" &&
      job.attempts === 1 &&
      job.errorCode === "SMTP_451",
    "Temporary SMTP failure retries without logging contents",
  );
  await db.emailOutbox.update({
    where: { id: job.id },
    data: { nextAttemptAt: new Date(0) },
  });
  await deliverNextEmail(async () => {
    throw { responseCode: 550 };
  });
  job = await db.emailOutbox.findUniqueOrThrow({ where: { id: job.id } });
  check(job.status === "FAILED", "Permanent recipient rejection stops retry");
  console.log(
    JSON.stringify({
      ok: true,
      checks,
      transport: "stub",
      externalMessages: 0,
    }),
  );
} finally {
  await db.$disconnect();
}
