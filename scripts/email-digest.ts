/** Owner-only operational command; preview by default, send always marked as a test. */
import { getDb } from "../src/lib/db.ts";
import { buildOwnerDigest, queueOwnerDigest } from "../src/lib/email-digest.ts";
import { digestDateWindow } from "../src/lib/email-digest-policy.ts";
import { smtpErrorCode } from "../src/lib/email-notification-policy.ts";

const args = process.argv.slice(2);
const date = args.find(arg => arg.startsWith("--date="))?.slice(7);
if (!date || args.some(arg => arg !== "--send" && arg !== `--date=${date}`))
  throw new Error("Usage: npm run email:digest -- --date=YYYY-MM-DD [--send]");
const window = digestDateWindow(date);
if (window.end > new Date()) throw new Error("Choose a completed Moscow calendar day");
const db = getDb();
try {
  if (args.includes("--send")) {
    // One test per date; rerunning the command cannot create another copy.
    const key = `digest-test:${date}`;
    await db.$transaction(tx => queueOwnerDigest(tx, window, key, true), { timeout: 30_000 });
    const job = await db.emailOutbox.findUniqueOrThrow({ where: { key },
      select: { key: true, status: true, attempts: true, sentAt: true, errorCode: true } });
    console.log(JSON.stringify(job));
    if (["FAILED", "CANCELED"].includes(job.status)) process.exitCode = 1;
  } else {
    const message = await db.$transaction(tx => buildOwnerDigest(tx, window, true), { timeout: 30_000 });
    console.log(`${message.subject}\n\n${message.text}`);
  }
} catch (error) {
  // Never print raw Prisma/SMTP errors, connection strings or credentials.
  console.error(JSON.stringify({ code: smtpErrorCode(error), operation: "owner_digest" }));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
