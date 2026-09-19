import { Prisma, type PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

type Db = PrismaClient | Prisma.TransactionClient;
type FunnelDelegate = PrismaClient["funnelEvent"];

function nativeFunnel(db: Db): FunnelDelegate | null {
  try {
    const funnel = (db as { funnelEvent?: FunnelDelegate }).funnelEvent;
    if (typeof funnel?.findMany === "function") return funnel;
  } catch {
    return null;
  }
  return null;
}

function whereSql(where: Record<string, unknown> = {}): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (typeof where.workspaceId === "string") {
    parts.push(Prisma.sql`"workspaceId" = ${where.workspaceId}`);
  }
  if (typeof where.qrCodeId === "string") {
    parts.push(Prisma.sql`"qrCodeId" = ${where.qrCodeId}`);
  }
  if (typeof where.paymentId === "string") {
    parts.push(Prisma.sql`"paymentId" = ${where.paymentId}`);
  }
  if (typeof where.name === "string") {
    parts.push(Prisma.sql`name = ${where.name}`);
  }
  if (typeof where.isTest === "boolean") {
    parts.push(Prisma.sql`"isTest" = ${where.isTest}`);
  }
  const createdAt = where.createdAt;
  if (createdAt && typeof createdAt === "object" && createdAt !== null && "gte" in createdAt) {
    parts.push(Prisma.sql`"createdAt" >= ${(createdAt as { gte: Date }).gte}`);
  }
  return Prisma.join(parts, " AND ");
}

function rawFunnel(db: Db): FunnelDelegate {
  return {
    findMany: async (args?: { where?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const select = args?.select ?? { id: true };
      const columns = Object.keys(select)
        .filter((key) => select[key])
        .map((key) => Prisma.raw(`"${key}"`));
      return db.$queryRaw(
        Prisma.sql`SELECT ${Prisma.join(columns)} FROM "FunnelEvent" WHERE ${whereSql(args?.where)}`,
      );
    },
    findFirst: async (args?: { where?: Record<string, unknown>; select?: Record<string, boolean> }) => {
      const select = args?.select ?? { id: true };
      const columns = Object.keys(select)
        .filter((key) => select[key])
        .map((key) => Prisma.raw(`"${key}"`));
      const rows = await db.$queryRaw<Array<Record<string, unknown>>>(
        Prisma.sql`SELECT ${Prisma.join(columns)} FROM "FunnelEvent" WHERE ${whereSql(args?.where)} LIMIT 1`,
      );
      return rows[0] ?? null;
    },
    create: async (args: {
      data: {
        workspaceId: string;
        userId?: string;
        qrCodeId?: string;
        paymentId?: string;
        name: string;
        source?: string | null;
        isTest?: boolean;
      };
    }) => {
      const id = nanoid();
      const rows = await db.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          INSERT INTO "FunnelEvent" ("id", "workspaceId", "userId", "qrCodeId", "paymentId", "name", "source", "isTest")
          VALUES (
            ${id},
            ${args.data.workspaceId},
            ${args.data.userId ?? null},
            ${args.data.qrCodeId ?? null},
            ${args.data.paymentId ?? null},
            ${args.data.name},
            ${args.data.source ?? null},
            ${Boolean(args.data.isTest)}
          )
          RETURNING "id"
        `,
      );
      return rows[0];
    },
    count: async (args?: { where?: Record<string, unknown> }) => {
      const rows = await db.$queryRaw<Array<{ n: bigint | number }>>(
        Prisma.sql`SELECT COUNT(*)::int AS n FROM "FunnelEvent" WHERE ${whereSql(args?.where)}`,
      );
      return Number(rows[0]?.n ?? 0);
    },
    updateMany: async (args: { where?: Record<string, unknown>; data?: { isTest?: boolean } }) => {
      const result = await db.$executeRaw(
        Prisma.sql`UPDATE "FunnelEvent" SET "isTest" = ${Boolean(args.data?.isTest)} WHERE ${whereSql(args.where)}`,
      );
      return { count: result };
    },
  } as unknown as FunnelDelegate;
}

export function funnelTable(db: Db): FunnelDelegate {
  return nativeFunnel(db) ?? rawFunnel(db);
}
