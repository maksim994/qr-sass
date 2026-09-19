import { purgeExpiredAnalyticsFields } from "../src/lib/analytics-retention.ts";

const result = await purgeExpiredAnalyticsFields();
console.log(
  JSON.stringify(
    { cutoff: result.cutoff.toISOString(), days: result.days, updated: result.updated },
    null,
    2,
  ),
);
