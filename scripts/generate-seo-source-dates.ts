// Run in a Git checkout and commit the manifest. Docker validates the same
// source fingerprints without needing Git, network access or release-time dates.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSeoPageCatalog } from "../src/lib/seo-page-registry.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "src/lib/seo-source-dates.json");
type Stamp = { fingerprint: string; lastModified: string };
const previous: Record<string, Stamp> = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : {};
const next: Record<string, Stamp> = {};
const sources = new Map<string, string[]>();
function dependencies(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) return seen;
  seen.add(file);
  let imports = sources.get(file);
  if (!imports) {
    imports = [];
    for (const match of readFileSync(file, "utf8").matchAll(/(?:from\s+|import\s*(?:\(\s*)?)["']([^"']+)["']/g)) {
      const specifier = match[1];
      const target = specifier.startsWith("@/") ? join(root, "src", specifier.slice(2))
        : specifier.startsWith(".") ? resolve(dirname(file), specifier) : null;
      if (!target) continue;
      const found = [target, `${target}.ts`, `${target}.tsx`, join(target, "index.ts"), join(target, "index.tsx")]
        .find(candidate => /\.(?:ts|tsx|css|json)$/.test(candidate) && existsSync(candidate));
      if (found && found !== output) imports.push(found);
    }
    sources.set(file, imports);
  }
  for (const imported of imports) dependencies(imported, seen);
  return seen;
}
function git(args: string[]): string | null {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}
const hasGit = git(["rev-parse", "--is-inside-work-tree"]) === "true";
for (const page of getSeoPageCatalog()) {
  const segment = page.path === "/" ? "" : page.path.slice(1);
  const ownPage = join(root, "src/app", segment, "page.tsx");
  const route = existsSync(ownPage) ? ownPage : join(root, "src/app/[slug]/page.tsx");
  const files = dependencies(route);
  dependencies(join(root, "src/app/layout.tsx"), files);
  const layout = join(dirname(route), "layout.tsx");
  if (existsSync(layout)) dependencies(layout, files);
  const paths = [...files].map(file => relative(root, file)).sort();
  const hash = createHash("sha256");
  for (const file of paths) hash.update(file).update("\0").update(readFileSync(join(root, file))).update("\0");
  const fingerprint = hash.digest("hex");
  if (previous[page.path]?.fingerprint === fingerprint) {
    next[page.path] = previous[page.path];
    continue;
  }
  if (!hasGit) throw new Error(`SEO source dates are stale for ${page.path}. Run npm run seo:source-dates in a Git checkout and commit src/lib/seo-source-dates.json.`);
  const changed = git(["status", "--porcelain", "--", ...paths]);
  const committedAt = git(["log", "-1", "--format=%cI", "--", ...paths]);
  if (changed === null || !committedAt) throw new Error(`Cannot determine source date for ${page.path}`);
  next[page.path] = { fingerprint, lastModified: changed ? new Date().toISOString() : new Date(committedAt).toISOString() };
}
const json = JSON.stringify(next, null, 2) + "\n";
if (!existsSync(output) || readFileSync(output, "utf8") !== json) writeFileSync(output, json);
console.log(`SEO source dates: ${Object.keys(next).length} pages verified`);
