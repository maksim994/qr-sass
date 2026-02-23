#!/usr/bin/env node
import { copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules/ckeditor5/dist/ckeditor5.css");
const dest = join(root, "public/ckeditor5.css");

try {
  mkdirSync(join(root, "public"), { recursive: true });
  copyFileSync(src, dest);
  console.log("Copied ckeditor5.css to public/");
} catch (err) {
  console.warn("Could not copy ckeditor5.css:", err.message);
}
