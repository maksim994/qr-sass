import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

/**
 * Sends email when SMTP_* is set. Without SMTP the caller still succeeds:
 * the reset link is only logged server-side (never returned to the client).
 */
export async function sendMail(payload: MailPayload): Promise<{ sent: boolean }> {
  if (!smtpConfigured()) {
    logger.info({
      area: "runtime",
      message: "SMTP is not configured; email was not sent",
      details: { to: payload.to, subject: payload.subject },
    });
    return { sent: false };
  }

  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || "465");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  logger.info({
    area: "runtime",
    message: "Email sent",
    details: { to: payload.to, subject: payload.subject },
  });
  return { sent: true };
}

export function appUrl() {
  return env.APP_URL.replace(/\/$/, "");
}
