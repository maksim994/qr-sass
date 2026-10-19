import { COMMERCIAL } from "@/lib/commercial-config";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { MSG } from "@/lib/user-messages";

export type PlanId = "FREE" | "PRO" | "BUSINESS";
export const PLAN_IDS: PlanId[] = ["FREE", "PRO", "BUSINESS"];

export type PlanLimits = {
  maxQrCodes: number | null;
  maxUsers: number | null;
  maxDynamicQr?: number | null;
  allowsDynamic: boolean;
  allowsAnalytics: boolean;
  exportFormats: ("PNG" | "SVG" | "JPG" | "EPS" | "PDF")[];
};

export type PlanInfo = {
  accessMode?: "standard" | "archive" | "friends";
  id: PlanId;
  name: string;
  description: string;
  priceRub: number;
  limits: PlanLimits;
  limitLabels: string[];
};

function exportLimitLabel(formats: PlanLimits["exportFormats"]): string {
  const hasPdfOrEps = formats.includes("PDF") || formats.includes("EPS");
  if (hasPdfOrEps) {
    return "PNG и SVG; PDF и EPS — растровая картинка";
  }
  if (formats.includes("SVG")) {
    return "Экспорт PNG и SVG";
  }
  return "Экспорт PNG";
}

function analyticsLimitLabel(limits: PlanLimits): string {
  if (!limits.allowsDynamic) return "Статические QR";
  if (limits.maxDynamicQr != null) return `Статические + ${limits.maxDynamicQr} динамических`;
  return "Динамика: смена ссылки и открытия по дням";
}

function usersLimitLabel(limits: PlanLimits): string {
  if (limits.maxUsers === 1) return "1 пользователь";
  if (limits.maxUsers != null) return `До ${limits.maxUsers} участников команды`;
  return "Участники: уже зарегистрированные пользователи";
}

export function buildLimitLabels(limits: PlanLimits, planId: PlanId): string[] {
  const parts: string[] = [];
  if (limits.maxQrCodes != null) parts.push(`До ${limits.maxQrCodes} QR-кодов`);
  else parts.push("Неограниченные QR-коды");
  parts.push(analyticsLimitLabel(limits));
  parts.push(exportLimitLabel(limits.exportFormats));
  parts.push(usersLimitLabel(limits));
  if (planId === "BUSINESS") {
    parts.push("API-ключи");
  }
  return parts;
}

export const PLAN_DEFAULTS: Record<PlanId, Omit<PlanInfo, "id">> = {
  FREE: {
    name: "Бесплатный",
    description: "Статические QR и два динамических кода бесплатно",
    priceRub: COMMERCIAL.free.priceRub,
    limits: {
      maxQrCodes: COMMERCIAL.free.archive,
      maxDynamicQr: COMMERCIAL.free.dynamic,
      maxUsers: COMMERCIAL.free.members,
      allowsDynamic: true,
      allowsAnalytics: true,
      exportFormats: ["PNG", "SVG"],
    },
    limitLabels: [
      `До ${COMMERCIAL.free.archive} QR в архиве кабинета`,
      `Статические + ${COMMERCIAL.free.dynamic} динамических`,
      "Экспорт PNG и SVG",
      "1 пользователь",
    ],
  },
  PRO: {
    name: "Про",
    description: "Динамика, открытия по дням и устройству, смена ссылки после печати",
    priceRub: COMMERCIAL.pro.priceRub,
    limits: {
      maxQrCodes: null,
      maxUsers: COMMERCIAL.pro.members,
      allowsDynamic: true,
      allowsAnalytics: true,
      exportFormats: ["PNG", "SVG", "JPG", "EPS", "PDF"],
    },
    limitLabels: [
      "Неограниченные QR-коды",
      "Динамика: смена ссылки и открытия по дням",
      "PNG и SVG; PDF и EPS — растровая картинка",
      "До 5 участников команды",
    ],
  },
  BUSINESS: {
    name: "Бизнес",
    description: "Возможности Про, совместная работа команды и API-ключи",
    priceRub: COMMERCIAL.business.priceRub,
    limits: {
      maxQrCodes: null,
      maxUsers: null,
      allowsDynamic: true,
      allowsAnalytics: true,
      exportFormats: ["PNG", "SVG", "JPG", "EPS", "PDF"],
    },
    limitLabels: [
      "Неограниченные QR-коды",
      "Динамика: смена ссылки и открытия по дням",
      "PNG и SVG; PDF и EPS — растровая картинка",
      "Участники: уже зарегистрированные пользователи",
      "API-ключи",
    ],
  },
};

export async function getPlan(planId: PlanId | string | null | undefined, options?: { strict?: boolean }): Promise<PlanInfo> {
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
    const allowsDynamic = id === "FREE" ? true : override.allowsDynamic ?? base.limits.allowsDynamic;
    const allowsAnalytics = id === "FREE" ? true : override.allowsAnalytics ?? base.limits.allowsAnalytics;
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
      maxDynamicQr: base.limits.maxDynamicQr,
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
  } catch (error) {
    if (options?.strict) throw error;
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
  FREE: COMMERCIAL.free.csvRows,
  PRO: COMMERCIAL.pro.csvRows,
  BUSINESS: COMMERCIAL.business.csvRows,
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
  plan: PlanInfo;
  count?: number;
  needsDynamic?: boolean;
  db?: Pick<Prisma.TransactionClient, "qrCode">;
}): Promise<QrCreateQuotaCheck> {
  const count = Math.max(1, options.count ?? 1);
  const needsDynamic = options.needsDynamic ?? false;
  const plan = options.plan;
  const currentCount = await (options.db ?? getDb()).qrCode.count({
    where: { workspaceId: options.workspaceId, isArchived: false },
  });
  const remaining =
    plan.limits.maxQrCodes == null ? null : Math.max(0, plan.limits.maxQrCodes - currentCount);

  const dynamicCount = needsDynamic && plan.limits.maxDynamicQr != null
    ? await (options.db ?? getDb()).qrCode.count({ where: { workspaceId: options.workspaceId, isArchived: false, OR: [{ kind: "DYNAMIC" }, { shortCode: { not: null } }] } }) : 0;
  if (needsDynamic && (!plan.limits.allowsDynamic || (plan.limits.maxDynamicQr != null && dynamicCount + count > plan.limits.maxDynamicQr))) {
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
