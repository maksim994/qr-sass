import { env } from "@/lib/env";
import { OWNER_EMAIL } from "@/lib/email-notification-policy";
export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  messageId?: string;
};
export function smtpConfigured() {
  return Boolean(
    env.SMTP_HOST && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASS,
  );
}
export async function sendMail(
  payload: MailPayload,
): Promise<{ sent: boolean }> {
  if (!smtpConfigured()) return { sent: false };
  const nodemailer = await import("nodemailer");
  const port = env.SMTP_PORT;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  });
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      replyTo: OWNER_EMAIL,
      ...payload,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (!info.accepted?.length)
      throw new Error("SMTP did not accept the recipient");
    return { sent: true };
  } finally {
    transporter.close();
  }
}
export function appUrl() {
  return env.APP_URL.replace(/\/$/, "");
}
