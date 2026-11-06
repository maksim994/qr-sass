import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { LocalMediaStorage } from "@/lib/media-storage";

export interface MediaBackupTarget {
  checksum(key: string): Promise<string | undefined>;
  put(key: string, body: Buffer, contentType: string, checksum: string): Promise<void>;
}
export async function* mediaKeys(root: string, prefix = ""): AsyncGenerator<string> {
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue; // Incomplete atomic uploads are never copied.
    if (entry.isSymbolicLink()) throw new Error("Symlinks are not allowed in media backup");
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) yield* mediaKeys(root, key);
    else if (entry.isFile()) yield key;
    else throw new Error("Unsupported media entry");
  }
}
/** Add/update only. Never propagate local deletion into the recovery bucket. */
export async function backupMedia(root: string, target: MediaBackupTarget) {
  const local = new LocalMediaStorage(root);
  let uploaded = 0, unchanged = 0;
  for await (const key of mediaKeys(root)) {
    const object = await local.get(key);
    if (!object?.body) throw new Error("Media disappeared during backup; retry required");
    const checksum = createHash("sha256").update(object.body).digest("hex");
    if (await target.checksum(key) === checksum) { unchanged++; continue; }
    await target.put(key, object.body, object.contentType, checksum);
    uploaded++;
  }
  return { uploaded, unchanged };
}
