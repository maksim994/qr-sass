import { purgeExpiredAnalyticsFields } from "../src/lib/analytics-retention.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

async function once() {
  const result = await purgeExpiredAnalyticsFields();
  console.log(
    JSON.stringify({
      cutoff: result.cutoff.toISOString(),
      days: result.days,
      updated: result.updated,
      purgedAt: result.purgedAt.toISOString(),
    }),
  );
}

await once();
setInterval(() => {
  void once().catch((error) => {
    console.error("analytics purge failed", error);
  });
}, DAY_MS);
