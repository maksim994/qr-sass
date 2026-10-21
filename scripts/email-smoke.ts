import { randomUUID } from "node:crypto";
import { getDb } from "../src/lib/db.ts";
import { queueEmail, serviceMessage } from "../src/lib/email-notifications.ts";
import { OWNER_EMAIL } from "../src/lib/email-notification-policy.ts";
import { sendMail } from "../src/lib/mail.ts";
const message = serviceMessage(
  "Проверка почтовых уведомлений",
  "Проверка новой версии QR-S.ru. Отправитель: noreply@qr-s.ru. Ответы на письма направляются в поддержку. Сервисные уведомления, напоминания и ежедневная сводка подключены.",
  "/admin/notifications",
  "Посмотреть доставку",
);
if (process.argv.includes("--send")) {
  const result = await sendMail({ to: OWNER_EMAIL, ...message });
  if (!result.sent) throw new Error("SMTP is not configured");
  console.log(JSON.stringify({ accepted: true, recipient: OWNER_EMAIL }));
} else if (process.argv.includes("--queue")) {
  const db = getDb(),
    key = `smoke:${randomUUID()}`;
  try {
    await db.$transaction((tx) =>
      queueEmail(tx, { key, kind: "test", to: OWNER_EMAIL, message }),
    );
    console.log(JSON.stringify({ queued: true, key, recipient: OWNER_EMAIL }));
  } finally {
    await db.$disconnect();
  }
} else throw new Error("Choose --send or --queue");
