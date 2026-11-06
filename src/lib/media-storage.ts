import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { BlogMediaObject } from "@/lib/blog-media-http";

export type MediaAccess = "private" | "public";
export interface MediaStorage {
  put(key: string, body: Buffer, contentType: string, access: MediaAccess): Promise<void>;
  get(key: string, head?: boolean): Promise<BlogMediaObject | null>;
  delete(key: string): Promise<void>;
}
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export function assertMediaKey(key: string) {
  if (!key || key.length > 1024 || key.split("/").some(part => !/^[A-Za-z0-9_.-]+$/.test(part) || part === "." || part === ".." || part.startsWith(".")))
    throw new Error("Invalid media key");
}
export function mediaContentType(key: string) {
  const types: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".ico": "image/x-icon", ".pdf": "application/pdf", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm" };
  return types[extname(key).toLowerCase()] ?? "application/octet-stream";
}
function missing(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && ["ENOENT", "ENOTDIR"].includes(String(error.code));
}
export class LocalMediaStorage implements MediaStorage {
  readonly root: string;
  constructor(root: string) { this.root = resolve(root); }

  // Refuse symlinks in the tree. Media roots must be writable only by the app/operator.
  private async path(key: string, create = false) {
    assertMediaKey(key);
    if (create) await mkdir(this.root, { recursive: true, mode: 0o750 });
    let current = this.root;
    for (const part of key.split("/").slice(0, -1)) {
      current = join(current, part);
      if (create) await mkdir(current, { mode: 0o750 }).catch(error => { if (error.code !== "EEXIST") throw error; });
      const stat = await lstat(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Unsafe media directory");
    }
    return join(this.root, key);
  }
  async put(key: string, body: Buffer, _contentType: string, _access: MediaAccess) {
    // Extensions come from validated file signatures; MIME is deterministic on read.
    void _contentType; void _access;
    if (body.length > MEDIA_MAX_BYTES) throw new Error("Oversized media");
    const file = await this.path(key, true);
    const temporary = join(dirname(file), `.upload-${randomUUID()}`);
    try {
      const handle = await open(temporary, "wx", 0o640);
      try { await handle.writeFile(body); await handle.sync(); } finally { await handle.close(); }
      await rename(temporary, file);
    } finally { await rm(temporary, { force: true }); }
  }
  async get(key: string, head = false): Promise<BlogMediaObject | null> {
    try {
      const file = await this.path(key);
      const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > MEDIA_MAX_BYTES) throw new Error("Invalid media file");
        const body = head ? undefined : await handle.readFile();
        return { body, length: stat.size, contentType: mediaContentType(key), lastModified: stat.mtime,
          etag: `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"` };
      } finally { await handle.close(); }
    } catch (error) { if (missing(error)) return null; throw error; }
  }
  async delete(key: string) {
    try { await rm(await this.path(key), { force: true }); }
    catch (error) { if (!missing(error)) throw error; }
  }
}
