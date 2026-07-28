import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";

export type PlanId = "FREE" | "PRO" | "BUSINESS";
export const PLAN_IDS: PlanId[] = ["FREE", "PRO", "BUSINESS"];

export type PlanLimits = {
  maxQrCodes: number | null;
  maxUsers: number | null;
  allowsDynamic: boolean;
  allowsAnalytics: boolean;
  exportFormats: ("PNG" | "SVG" | "JPG" | "EPS" | "PDF")[];
};

export type PlanInfo = {
  id: PlanId;
  name: string;
  description: string;
  priceRub: number;
  limits: PlanLimits;
  limitLabels: string[];
};

export const PLAN_DEFAULTS: Record<PlanId, Omit<PlanInfo, "id">> = {
  FREE: {
    name: "Бесплатный",
    description: "Попробовать сервис и создать несколько статических QR",
    priceRub: 0,
    limits: {
      maxQrCodes: 10,
      maxUsers: 1,
      allowsDynamic: false,
      allowsAnalytics: false,
      exportFormats: ["PNG", "SVG"],
    },
    limitLabels: ["До 10 QR-кодов", "Только статические", "Экспорт PNG и SVG", "1 пользователь"],
  },
  PRO: {
    name: "Про",
    description: "Для маркетинга и малого бизнеса: динамика, аналитика, смена ссылки",
    priceRub: 990,
    limits: {
      maxQrCodes: null,
      maxUsers: 5,
      allowsDynamic: true,
      allowsAnalytics: true,
      exportFormats: ["PNG", "SVG", "JPG", "EPS", "PDF"],
    },
    limitLabels: ["Неограниченные QR-коды", "Динамические QR с аналитикой", "Экспорт PNG, SVG, JPG, EPS, PDF", "До 5 пользователей"],
  },
  BUSINESS: {
    name: "Бизнес",
    description: "Для команды, агентства или сети: API, роли и без лимита пользователей",
    priceRub: 2990,
    limits: {
      maxQrCodes: null,
      maxUsers: null,
      allowsDynamic: true,
      allowsAnalytics: true,
      exportFormats: ["PNG", "SVG", "JPG", "EPS", "PDF"],
    },
    limitLabels: ["Неограниченные QR-коды", "Неограниченные пользователи", "API-доступ", "Белая метка"],
  },
};

function buildLimitLabels(limits: PlanLimits, planId: PlanId): string[] {
  const parts: string[] = [];
  if (limits.maxQrCodes != null) parts.push(`До ${limits.maxQrCodes} QR-кодов`);
  else parts.push("Неограниченные QR-коды");
  parts.push(limits.allowsDynamic ? "Динамические QR с аналитикой" : "Только статические");
  if (limits.exportFormats.includes("PDF")) {
    parts.push("Экспорт PNG, SVG, JPG, EPS, PDF");
  } else if (limits.exportFormats.length > 1) {
    parts.push("Экспорт PNG и SVG");
  } else {
    parts.push("Экспорт PNG");
  }
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
        exportFormats = Array.isArray(parsed) ? parsed.filter((f: string) => ["PNG", "SVG", "JPG", "EPS", "PDF"].includes(f)) : exportFormats;
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
      description: base.description,
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

/** Per-batch row caps for CSV/XLSX mass create (independent of maxQrCodes quota). */
export const BULK_BATCH_LIMITS: Record<PlanId, number> = {
  FREE: 50,
  PRO: 1000,
  BUSINESS: 5000,
};

export function getBulkBatchLimit(planId: PlanId | string | null | undefined): number {
  const id = String(planId ?? "FREE").toUpperCase() as PlanId;
  return BULK_BATCH_LIMITS[id] ?? BULK_BATCH_LIMITS.FREE;
}

export type QrCreateQuotaCheck = {
  ok: true;
  plan: PlanInfo;
  currentCount: number;
  remaining: number | null;
} | {
  ok: false;
  plan: PlanInfo;
  currentCount: number;
  remaining: number | null;
  code: "DYNAMIC_REQUIRED" | "QR_LIMIT";
  message: string;
};

/**
 * Shared plan gate for create / bulk / API.
 * Counts non-archived QR codes in the workspace.
 */
export async function assertCanCreateQrCodes(options: {
  workspaceId: string;
  planId: string | null | undefined;
  count?: number;
  needsDynamic?: boolean;
}): Promise<QrCreateQuotaCheck> {
  const count = Math.max(1, options.count ?? 1);
  const needsDynamic = options.needsDynamic ?? false;
  const plan = await getPlan(options.planId);
  const currentCount = await getDb().qrCode.count({
    where: { workspaceId: options.workspaceId, isArchived: false },
  });
  const remaining =
    plan.limits.maxQrCodes == null ? null : Math.max(0, plan.limits.maxQrCodes - currentCount);

  if (needsDynamic && !plan.limits.allowsDynamic) {
    return {
      ok: false,
      plan,
      currentCount,
      remaining,
      code: "DYNAMIC_REQUIRED",
      message: MSG.PLAN_DYNAMIC_REQUIRED,
    };
  }

  if (plan.limits.maxQrCodes != null && currentCount + count > plan.limits.maxQrCodes) {
    return {
      ok: false,
      plan,
      currentCount,
      remaining,
      code: "QR_LIMIT",
      message: MSG.QR_LIMIT_REACHED(plan.limits.maxQrCodes, remaining ?? 0, count),
    };
  }

  return { ok: true, plan, currentCount, remaining };
}
