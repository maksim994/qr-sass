/** Disposable local database only; SMTP is always a stub. */
import assert from "node:assert/strict";
import { getDb } from "../src/lib/db.ts";
import { scheduleEmailNotifications, deliverNextEmail } from "../src/lib/email-worker.ts";
import { buildOwnerDigest, queueOwnerDigest } from "../src/lib/email-digest.ts";
import { decryptIntegrationSecret } from "../src/lib/integration-secrets.ts";
import { digestDateWindow } from "../src/lib/email-digest-policy.ts";

const url = new URL(process.env.DATABASE_URL!);
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/daily_summary_test");
assert.equal(process.env.SMTP_HOST, undefined);
const db = getDb();
const run = Date.now();
const start = new Date(run + 86400000 * 2);
const day = new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Moscow"}).format(start);
const window = digestDateWindow(day);
try {
  await db.emailOutbox.deleteMany();
  await db.businessEvent.deleteMany();
  await db.emailControl.upsert({ where: {id: "default"}, create: {id: "default"},
    update: { enabledSince: new Date(window.start.getTime() - 86400000), lastScheduledAt: null } });
  // Run on the following day so the empty day is fully over at 09:00.
  const tomorrow = new Date(window.end.getTime() + 9 * 3600000);
  const digestKey = `digest:${new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Moscow"}).format(tomorrow)}`;
  await scheduleEmailNotifications(new Date(tomorrow.getTime() - 1000));
  assert.equal(await db.emailOutbox.count({where:{key: digestKey}}), 0);
  await db.emailControl.update({where:{id:"default"},data:{lastScheduledAt:null}});
  await Promise.all([scheduleEmailNotifications(tomorrow), scheduleEmailNotifications(tomorrow)]);
  let job = await db.emailOutbox.findUniqueOrThrow({where:{key:digestKey}});
  const message = JSON.parse(decryptIntegrationSecret(job.payloadCipher!));
  assert.match(message.text, /За сутки регистраций и оплат не было/);
  assert.match(message.text, /Регистрации: 0/);
  assert.equal(await db.emailOutbox.count({where:{key:digestKey}}), 1);
  assert.equal(job.expiresAt, null);
  await deliverNextEmail(async () => { throw { responseCode:451, message:"PRIVATE" }; });
  job = await db.emailOutbox.findUniqueOrThrow({where:{key:digestKey}});
  assert.equal(job.status, "PENDING");
  assert.equal(job.errorCode, "SMTP_451");
  await db.emailOutbox.update({where:{id:job.id},data:{nextAttemptAt:new Date(0)}});
  let delivered = 0;
  await Promise.all([deliverNextEmail(async () => { delivered++; return {sent:true}; }),
    deliverNextEmail(async () => { delivered++; return {sent:true}; })]);
  assert.equal(delivered, 1);
  job = await db.emailOutbox.findUniqueOrThrow({where:{key:digestKey}});
  assert.equal(job.status,"SENT");
  assert.equal(job.payloadCipher,null);
  await db.$transaction(tx => queueOwnerDigest(tx, window, `digest-test:${day}`, true));
  await db.$transaction(tx => queueOwnerDigest(tx, window, `digest-test:${day}`, true));
  assert.equal(await db.emailOutbox.count({where:{key:`digest-test:${day}`}}), 1);
  const user = await db.user.create({data:{email:`daily-${run}@example.test`, passwordHash:"synthetic"}});
  await db.businessEvent.create({data:{key:`registration:${run}`,name:"registration_completed",userId:user.id,createdAt:window.start,payload:{}}});
  const aggregate = await db.$transaction(tx => buildOwnerDigest(tx, window, true));
  assert.match(aggregate.subject,/\[ТЕСТ\]/);
  assert.match(aggregate.text,/Регистрации: 1/);
  assert.match(aggregate.text,/нет данных: регистрации — 1/);
  assert.doesNotMatch(aggregate.text, new RegExp(user.email.replace(/[.]/g,"\\.")));
  assert.doesNotMatch(aggregate.text,/не было/);
  await deliverNextEmail(async () => { throw { responseCode: 550 }; });
  const rejected = await db.emailOutbox.findUniqueOrThrow({ where: { key: `digest-test:${day}` } });
  assert.equal(rejected.status, "FAILED");
  await db.emailOutbox.update({ where: { id: rejected.id }, data: { createdAt: tomorrow } });
  await scheduleEmailNotifications(new Date(tomorrow.getTime() + 61000));
  assert.equal(await db.emailOutbox.count({ where: { key: `delivery-alert:${digestKey.slice(7)}`, kind: "owner_alert" } }), 1);
  console.log(JSON.stringify({ok:true, emptyDay:true, atNineMoscow:true, concurrentSchedulers:true,
    retryThenSent:true, permanentFailureAlert:true, concurrentDelivery:true, manualIdempotency:true, aggregateOnly:true, externalEmails:0}));
} finally { await db.$disconnect(); }
