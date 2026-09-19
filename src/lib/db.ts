import { PrismaClient } from "@prisma/client";
import { MSG } from "@/lib/user-messages";
import { ConfigError } from "@/lib/errors";

const PRISMA_CLIENT_EPOCH = "workspace-terms-v1";
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaEpoch?: string;
};

export function getDb(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new ConfigError(MSG.DATABASE_URL_REQUIRED);
  }

  const existing = globalForPrisma.prisma;
  const apiKeyMissing = existing ? typeof (existing as { apiKey?: unknown }).apiKey === "undefined" : true;
  if (!existing || globalForPrisma.prismaEpoch !== PRISMA_CLIENT_EPOCH || apiKeyMissing) {
    void existing?.$disconnect().catch(() => undefined);
    const client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    globalForPrisma.prisma = client;
    globalForPrisma.prismaEpoch = PRISMA_CLIENT_EPOCH;
    return client;
  }

  return existing;
}
