import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";

export function getExportQueue() {
  const connection = getRedis();
  if (!connection) return null;

  return new Queue("qr-export", { connection });
}
