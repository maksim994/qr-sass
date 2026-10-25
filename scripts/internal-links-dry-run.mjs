// Reads a local editorial snapshot only. There is deliberately no --apply, DB or network path.
// node --experimental-strip-types scripts/internal-links-dry-run.mjs --snapshot /absolute/snapshot.json
import { readFileSync } from "node:fs";
import { BLOG_REDIRECTS } from "../src/lib/blog-redirects.ts";
import { auditRedirects, planRelated } from "./internal-links-report.mjs";
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--snapshot") throw new Error("Usage: node --experimental-strip-types scripts/internal-links-dry-run.mjs --snapshot snapshot.json (report only; no apply mode)");
const snapshot = JSON.parse(readFileSync(args[1], "utf8"));
const plan = JSON.parse(readFileSync(new URL("./related-2026-10.json", import.meta.url), "utf8"));
console.log(JSON.stringify({ related: planRelated(snapshot, plan, BLOG_REDIRECTS), redirectAudit: auditRedirects(snapshot, BLOG_REDIRECTS) }, null, 2));
