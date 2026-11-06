import { mkdir, chown, chmod } from "node:fs/promises";
// The host bind mount is a dedicated media volume, shared with UID 1001 in app/tools.
await mkdir("/data/media", { recursive: true });
await chown("/data/media", 1001, 1001);
await chmod("/data/media", 0o750);
