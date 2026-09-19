import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const withExt = /\.(ts|js|mjs|cjs)$/.test(rel) ? rel : `${rel}.ts`;
    return nextResolve(pathToFileURL(join(srcRoot, withExt)).href, context);
  }
  return nextResolve(specifier, context);
}
