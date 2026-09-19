import { getDb } from "@/lib/db";

const DEFAULT_DAYS = 90;

export function analyticsRetentionDays(): number {
  const n = Number(process.env.ANALYTICS_RETENTION_DAYS || DEFAULT_DAYS);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : DEFAULT_DAYS;
}

/** Drop raw UA, IP hashes and referer older than the retention window. Coarse device/OS stay. */
export async function purgeExpiredAnalyticsFields(now = new Date()) {
  const days = analyticsRetentionDays();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const db = getDb();
  const result = await db.scanEvent.updateMany({
    where: {
      scannedAt: { lt: cutoff },
      OR: [{ userAgentRaw: { not: null } }, { ipHash: { not: null } }, { referer: { not: null } }],
    },
    data: { userAgentRaw: null, ipHash: null, referer: null },
  });
  await db.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      analyticsPurgedAt: now,
      analyticsPurgeUpdated: result.count,
    },
    update: {
      analyticsPurgedAt: now,
      analyticsPurgeUpdated: result.count,
    },
  });
  return { cutoff, days, updated: result.count, purgedAt: now };
}
