import { getDb } from "../src/lib/db.ts";
import {
  deliverNextNotification,
  scheduleDailyDigest,
} from "../src/lib/telegram-notifications.ts";
let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
while (!stopping) {
  try {
    await getDb().notificationWorkerState.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: { lastSeenAt: new Date() },
    });
    await scheduleDailyDigest();
    await deliverNextNotification();
  } catch {
    console.error(
      "Notification worker iteration failed; retrying. No event data or credentials logged.",
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 4000));
}
await getDb().$disconnect();
