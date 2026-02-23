import { PrismaClient } from "@prisma/client";
import { ConfigError } from "@/lib/errors";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new ConfigError("DATABASE_URL is required. Create .env from .env.example and set DATABASE_URL.");
  }

  if (!globalForPrisma.prisma || typeof (globalForPrisma.prisma as { apiKey?: unknown }).apiKey === "undefined") {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return globalForPrisma.prisma;
}
