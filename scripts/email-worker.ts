import { getDb } from "../src/lib/db.ts";
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
    await getDb().emailControl.update({
      where: { id: "default" },
      data: { lastSeenAt: new Date() },
    });
    await scheduleEmailNotifications();
    await deliverNextEmail();
  } catch {
    console.error(
      "Email worker iteration failed; no credentials or message content logged.",
    );
  }
  if (process.argv.includes("--once")) break;
  await new Promise((resolve) => setTimeout(resolve, 4000));
}
await getDb().$disconnect();
