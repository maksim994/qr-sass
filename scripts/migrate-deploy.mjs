import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function isPrismaP3005(output) {
  return /\bP3005\b/.test(output) || /database schema is not empty/i.test(output);
}

function alreadyRecordedAsApplied(output) {
  return /already been applied|already recorded|P3008/i.test(output);
}

function listMigrationNames(entries) {
  return entries
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function prisma(args, { silent = false, input } = {}) {
  const bin = path.join(process.cwd(), "node_modules", ".bin", "prisma");
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    input,
    env: process.env,
  });
  if (!silent) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  return result;
}

function combined(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

const deploy = prisma(["migrate", "deploy"]);
if ((deploy.status ?? 1) === 0) {
  process.exit(0);
}

if (!isPrismaP3005(combined(deploy))) {
  process.exit(deploy.status ?? 1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to adopt an existing database.");
  process.exit(1);
}

console.error("Empty migration history on a non-empty database (P3005). Comparing schema before adopt.");

const names = listMigrationNames(readdirSync(path.join(process.cwd(), "prisma/migrations"), { withFileTypes: true }));
function compare(schema) {
  return prisma(["migrate", "diff", "--from-url", process.env.DATABASE_URL,
    "--to-schema-datamodel", schema, "--exit-code"], { silent: true });
}
let diff = compare("prisma/schema.prisma");
if (diff.status === 2) {
  const legacy = compare("prisma/legacy-schema.prisma");
  if (legacy.status !== 0) {
    console.error("Existing database schema does not match the audited legacy schema. Refusing upgrade/adopt.");
    process.stderr.write(legacy.stdout ?? "");
    process.stderr.write(legacy.stderr ?? "");
    process.exit(1);
  }
  // Audited db-push schema only. One transaction prevents a half-upgrade;
  // no schema reset, no data-loss flag, no unverified resolve.
  const sql = names.map(name => readFileSync(path.join("prisma/migrations", name, "migration.sql"), "utf8")).join("\n");
  const upgrade = prisma(["db", "execute", "--schema", "prisma/schema.prisma", "--stdin"], {
    input: `BEGIN;\n${sql}\nCOMMIT;\n`,
  });
  if (upgrade.status !== 0) process.exit(upgrade.status ?? 1);
  diff = compare("prisma/schema.prisma");
}
if (diff.status !== 0) {
  console.error("Existing database schema does not match prisma/schema.prisma. Migrations were not marked applied.");
  process.stderr.write(diff.stdout ?? "");
  process.stderr.write(diff.stderr ?? "");
  process.exit(diff.status ?? 1);
}

for (const name of names) {
  const resolved = prisma(["migrate", "resolve", "--applied", name]);
  if ((resolved.status ?? 1) !== 0 && !alreadyRecordedAsApplied(combined(resolved))) {
    process.exit(resolved.status ?? 1);
  }
}

const again = prisma(["migrate", "deploy"]);
process.exit(again.status ?? 1);
