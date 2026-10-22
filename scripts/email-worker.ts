import { getDb } from "../src/lib/db.ts";
import { logger } from "../src/lib/logger.ts";
import { smtpErrorCode } from "../src/lib/email-notification-policy.ts";
import {
  deliverNextEmail,
  scheduleEmailNotifications,
} from "../src/lib/email-worker.ts";
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
while (!stopping) {
  try {
    await scheduleEmailNotifications();
    await deliverNextEmail();
    await getDb().emailControl.update({
      where: { id: "default" },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    logger.error({ area: "runtime", message: "Email worker iteration failed", code: smtpErrorCode(error) });
    // A scheduler error must not block retries of already queued messages.
    try { await deliverNextEmail(); } catch {
      logger.error({ area: "runtime", message: "Email queue unavailable", code: "EMAIL_QUEUE_ERROR" });
    }
  }
  if (process.argv.includes("--once")) break;
  await new Promise((resolve) => setTimeout(resolve, 4000));
}
await getDb().$disconnect();
