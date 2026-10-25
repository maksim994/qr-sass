// Verify exact raw fragments and combined per-article proposals without writing content.
import { readFileSync } from "node:fs";
import { verifyContentPlan } from "./internal-links-report.mjs";
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--articles") throw new Error("Usage: node scripts/verify-internal-links-content.mjs --articles articles.json (verification only)");
const input = JSON.parse(readFileSync(args[1], "utf8"));
const plan = JSON.parse(readFileSync(new URL("../outputs/internal-links-content-2026-10.json", import.meta.url), "utf8"));
console.log(JSON.stringify(verifyContentPlan(Array.isArray(input) ? input : input.posts, plan), null, 2));
