import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
try {
  const [control, failed] = await Promise.all([
    db.emailControl.findUnique({where:{id:'default'}}),
    db.emailOutbox.count({where:{status:'FAILED', createdAt:{gte:new Date(Date.now()-86400000)}}})
  ]);
  console.log(JSON.stringify({alive:!!control?.lastSeenAt && Date.now()-control.lastSeenAt.getTime()<120000, failed}));
} finally { await db.$disconnect(); }
