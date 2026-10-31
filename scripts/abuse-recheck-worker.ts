import { warnAbuseConfiguration } from '../src/lib/abuse/config.ts';
import { env } from '../src/lib/env.ts';
import { getDb } from '../src/lib/db.ts';
import { getRedis } from '../src/lib/redis.ts';
import { logger } from '../src/lib/logger.ts';
import { runAbuseRecheck } from '../src/lib/abuse/recheck.ts';
warnAbuseConfiguration();
let stopped = false;
process.on('SIGTERM', () => { stopped = true; }); process.on('SIGINT', () => { stopped = true; });
let pendingAt = 0;
while (!stopped && env.ABUSE_CHECK_ENABLED) {
  try {
    const now = new Date(), moscow = new Date(+now + 3 * 3600000);
    const day = moscow.toISOString().slice(0, 10), key = `abuse:daily:${day}`;
    const full = moscow.getUTCHours() >= env.ABUSE_RECHECK_HOUR && !(await getDb().abuseProviderQuota.findUnique({ where: { key } }))?.count;
    if (full || Date.now() - pendingAt >= 600000) {
      const result = await runAbuseRecheck(full, now);
      if (full && !result.skipped && !result.deferred) await getDb().abuseProviderQuota.upsert({ where: { key }, create: { key, count: 1 }, update: { count: 1 } });
      pendingAt = Date.now();
    }
  } catch { logger.error({ area: 'runtime', message: 'Abuse recheck failed; will retry without changing public QR destinations' }); }
  if (process.argv.includes('--once')) break;
  for (let n = 0; n < 30 && !stopped; n++) await new Promise(resolve => setTimeout(resolve, 1000));
}
await getDb().$disconnect(); await getRedis()?.quit();
