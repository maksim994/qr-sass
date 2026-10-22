import { PrismaClient } from '@prisma/client';
import { expectedDigest } from './email-health-policy.mjs';
const db = new PrismaClient();
try {
  const [control, failed] = await Promise.all([
    db.emailControl.findUnique({where:{id:'default'}}),
    db.emailOutbox.count({where:{status:'FAILED', createdAt:{gte:new Date(Date.now()-86400000)}}})
  ]);
  const key = expectedDigest(new Date(), control?.enabledSince);
  const digest = key ? await db.emailOutbox.findUnique({ where: { key }, select: { status: true } }) : null;
  const digests = await db.emailOutbox.findMany({
    where: { kind: 'owner_digest', status: 'SENT', createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    select: { id: true }, orderBy: { createdAt: 'desc' }, take: 30,
  });
  console.log(JSON.stringify({alive:!!control?.lastSeenAt && Date.now()-control.lastSeenAt.getTime()<120000,
    failed, digestOverdue: !!key && digest?.status !== 'SENT',
    digestMessageIds: digests.map(job => `<${job.id}@qr-s.ru>`)}));
} finally { await db.$disconnect(); }
