import assert from "node:assert/strict";
import { test } from "node:test";
import { getDb } from "./db.ts";
import { getEntitlements } from "./entitlements.ts";

test("transaction failure does not write FREE over a paid workspace", async (t) => {
  process.env.DATABASE_URL ??= "postgresql://unused:unused@127.0.0.1:1/unused";
  // Initialize the client cache marker before replacing its methods with the test double.
  // Constructing Prisma here does not connect to the database.
  const originalClient = getDb();
  t.after(async () => {
    (globalThis as { prisma?: unknown }).prisma = originalClient;
    await originalClient.$disconnect();
  });
  const writes: string[] = [];
  const state = {
    id: "w",
    plan: "PRO",
    subscription: {
      id: "s",
      plan: "PRO",
      status: "trial",
      currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    },
  };
  let reads = 0;
  (globalThis as { prisma?: unknown }).prisma = {
    apiKey: {},
    planOverride: { findUnique: async () => null },
    $transaction: async () => {
      throw new Error("simulated transaction failure");
    },
    workspace: {
      findUnique: async () => {
        reads += 1;
        if (reads === 2) {
          state.plan = "BUSINESS";
          Object.assign(state.subscription, {
            plan: "BUSINESS",
            status: "active",
            currentPeriodEnd: new Date("2026-10-18T00:00:00Z"),
          });
        }
        return structuredClone(state);
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        writes.push(`workspace:${JSON.stringify(data)}`);
        Object.assign(state, data);
        return state;
      },
    },
    subscription: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        writes.push(`subscription:${JSON.stringify(data)}`);
        Object.assign(state.subscription, data);
        return state.subscription;
      },
    },
  };

  const rights = await getEntitlements("w", new Date("2026-09-18T00:00:00Z"));
  assert.deepEqual(writes, []);
  assert.equal(state.plan, "BUSINESS");
  assert.equal(state.subscription.status, "active");
  assert.equal(rights.planId, "BUSINESS");
  assert.equal(rights.status, "active");
});
