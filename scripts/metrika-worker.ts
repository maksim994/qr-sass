import { deliverMetrikaPayments } from "../src/lib/metrika-worker.ts";
import { getDb } from "../src/lib/db.ts";
import { setTimeout } from "node:timers/promises";
const loop = process.argv.includes("--loop");
const stop = new AbortController();
process.once("SIGTERM", () => stop.abort());
process.once("SIGINT", () => stop.abort());
try {
  do {
    try { const result = await deliverMetrikaPayments(); if (!loop || result.enabled) console.log(JSON.stringify(result)); }
    catch { console.error("Metrika worker failed; no credentials or payload logged."); if (!loop) process.exitCode = 1; }
    if (!loop || stop.signal.aborted) break;
    await setTimeout(60_000, undefined, { signal: stop.signal }).catch(() => undefined);
  } while (!stop.signal.aborted);
} finally { if (process.env.DATABASE_URL) await getDb().$disconnect(); }
