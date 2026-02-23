import { getDb } from "@/lib/db";

export type PlanId = "FREE" | "PRO" | "BUSINESS";
export const PLAN_IDS: PlanId[] = ["FREE", "PRO", "BUSINESS"];

export type PlanLimits = {
  maxQrCodes: number | null;
  maxUsers: number | null;
  allowsDynamic: boolean;
  allowsAnalytics: boolean;
  exportFormats: ("PNG" | "SVG")[];
};

export type PlanInfo = {
  id: PlanId;
  name: string;
  priceRub: number;
  limits: PlanLimits;
  limitLabels: string[];
};

export const PLAN_DEFAULTS: Record<PlanId, Omit<PlanInfo, "id">> = {
  FREE: {
    name: "Бесплатный",
    priceRub: 0,
    limits: {
      maxQrCodes: 10,
      maxUsers: 1,
      allowsDynamic: false,
      allowsAnalytics: false,
      exportFormats: ["PNG"],
    },
    limitLabels: ["До 10 QR-кодов", "Только статические", "Экспорт PNG", "1 пользователь"],
  },
  PRO: {
    name: "Про",
    priceRub: 990,
    limits: {
      maxQrCodes: null,
      maxUsers: 5,
      allowsDynamic: true,
      allowsAnalytics: true,
      exportFormats: ["PNG", "SVG"],
    },
    limitLabels: ["Неограниченные QR-коды", "Динамические QR с аналитикой", "Экспорт PNG и SVG", "До 5 пользователей"],
  },
  BUSINESS: {
    name: "Бизнес",
    priceRub: 2990,
    limits: {
      maxQrCodes: null,
      maxUsers: null,
      allowsDynamic: true,
      allowsAnalytics: true,
      exportFormats: ["PNG", "SVG"],
    },
    limitLabels: ["Неограниченные QR-коды", "Неограниченные пользователи", "API-доступ", "Белая метка"],
  },
};

function buildLimitLabels(limits: PlanLimits, planId: PlanId): string[] {
  const parts: string[] = [];
  if (limits.maxQrCodes != null) parts.push(`До ${limits.maxQrCodes} QR-кодов`);
  else parts.push("Неограниченные QR-коды");
  parts.push(limits.allowsDynamic ? "Динамические QR с аналитикой" : "Только статические");
  parts.push(limits.exportFormats.length > 1 ? "Экспорт PNG и SVG" : "Экспорт PNG");
  if (limits.maxUsers != null) {
    parts.push(limits.maxUsers === 1 ? "1 пользователь" : `До ${limits.maxUsers} пользователей`);
  } else {
    parts.push("Неограниченные пользователи");
  }
  if (planId === "BUSINESS") {
    parts.push("API-доступ");
    parts.push("Белая метка");
  }
  return parts;
}

export async function getPlan(planId: PlanId | string | null | undefined): Promise<PlanInfo> {
  const id = String(planId ?? "FREE").toUpperCase() as PlanId;
  const base = PLAN_DEFAULTS[id] ?? PLAN_DEFAULTS.FREE;

  try {
    const db = getDb();
    const override = await db.planOverride.findUnique({
      where: { planId: id },
    });

    if (!override) {
      return { id, ...base };
    }

    const maxQrCodes = override.maxQrCodes ?? base.limits.maxQrCodes;
    const maxUsers = override.maxUsers ?? base.limits.maxUsers;
    const priceRub = override.priceRub ?? base.priceRub;
    const allowsDynamic = override.allowsDynamic ?? base.limits.allowsDynamic;
    const allowsAnalytics = override.allowsAnalytics ?? base.limits.allowsAnalytics;
    let exportFormats = base.limits.exportFormats;
    if (override.exportFormats) {
      try {
        const parsed = JSON.parse(override.exportFormats);
        exportFormats = Array.isArray(parsed) ? parsed.filter((f: string) => ["PNG", "SVG"].includes(f)) : exportFormats;
      } catch {
        /* keep default */
      }
    }

    const limits: PlanLimits = {
      maxQrCodes,
      maxUsers,
      allowsDynamic,
      allowsAnalytics,
      exportFormats,
    };

    return {
      id,
      name: base.name,
      priceRub,
      limits,
      limitLabels: buildLimitLabels(limits, id),
    };
  } catch {
    return { id, ...base };
  }
}

export function getPlanSync(planId: PlanId | string | null | undefined): PlanInfo {
  const id = String(planId ?? "FREE").toUpperCase() as PlanId;
  const base = PLAN_DEFAULTS[id] ?? PLAN_DEFAULTS.FREE;
  return { id, ...base };
}

export function formatUsage(current: number, limit: number | null): string {
  if (limit === null) return `${current}`;
  return `${current} / ${limit}`;
}
