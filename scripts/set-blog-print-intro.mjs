// Narrow, idempotent TZ-06 adjustment. Read-only unless --apply is explicitly supplied.
import { getDb } from "../src/lib/db.ts";
const db = getDb();
const slug = "razmer-qr-koda-dlya-pechati";
try {
  const before = await db.blogPost.findUnique({ where: { slug }, select: { id: true, showPrintSizeIntro: true, updatedAt: true, contentUpdatedAt: true } });
  if (!before) throw new Error("Target article not found");
  if (process.argv.includes("--apply")) {
    // Deliberately updates only this flag, not the content or editorial/system dates.
    await db.$executeRaw`UPDATE "BlogPost" SET "showPrintSizeIntro" = false WHERE "id" = ${before.id}`;
  }
  const after = await db.blogPost.findUniqueOrThrow({ where: { slug }, select: { showPrintSizeIntro: true, updatedAt: true, contentUpdatedAt: true } });
  if (before.updatedAt.getTime() !== after.updatedAt.getTime() || before.contentUpdatedAt?.getTime() !== after.contentUpdatedAt?.getTime()) throw new Error("Date changed unexpectedly");
  console.log(JSON.stringify({ slug, showPrintSizeIntro: after.showPrintSizeIntro, applied: process.argv.includes("--apply"), datesUnchanged: true }));
} finally { await db.$disconnect(); }
