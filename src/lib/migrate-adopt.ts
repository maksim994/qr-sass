export function isPrismaP3005(output: string): boolean {
  return /\bP3005\b/.test(output) || /database schema is not empty/i.test(output);
}

export function listMigrationNames(entries: Array<{ name: string; isDirectory: () => boolean }>): string[] {
  return entries
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export function alreadyRecordedAsApplied(output: string): boolean {
  return /already been applied|already recorded|P3008/i.test(output);
}
