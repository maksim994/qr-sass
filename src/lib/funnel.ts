import { getDb } from "@/lib/db";
import { funnelTable } from "@/lib/funnel-table";
import { logger } from "@/lib/logger";
import { mskDateKey } from "@/lib/analytics-metrics";
import type { Prisma } from "@prisma/client";

export const FUNNEL_EVENTS = {
  registration_completed: "registration_completed",
  qr_created: "qr_created",
  qr_downloaded: "qr_downloaded",
  first_external_open: "first_external_open",
  checkout_started: "checkout_started",
  payment_succeeded: "payment_succeeded",
} as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];

export const FUNNEL_DEFINITIONS = {
  activation:
    "Workspace сохранил QR, скачал файл через API и получил первое внешнее открытие. Собственные запросы из кабинета, боты и локальные IP не считаются.",
  payment:
    "Оплата подтверждена сервером (статус SUCCEEDED). Клик виджета ЮKassa и reachGoal на клиенте оплатой не являются.",
} as const;

const BOT_UA = /bot|crawler|spider|slurp|facebookexternalhit|preview|whatsapp|telegram|discord|slackbot/i;
const PRIVATE_V4 = /^(127\.|10\.|192\.168\.|0\.0\.0\.0$)/;

export function isPrivateOrLocalIp(ip: string | null | undefined): boolean {
  if (!ip || ip === "unknown") return false;
  const value = ip.trim().toLowerCase();
  if (value.startsWith("::ffff:")) return isPrivateOrLocalIp(value.slice(7));
  if (value === "::1" || value === "localhost") return true;
  if (value.startsWith("172.")) {
    const octet = Number(value.split(".")[1]);
    if (octet >= 16 && octet <= 31) return true;
  }
  return PRIVATE_V4.test(value);
}

export function isInternalReferer(referer: string | null | undefined): boolean {
  if (!referer) return false;
  try {
    const url = new URL(referer);
    return /\/dashboard(?:\/|$)/.test(url.pathname) || /\/preview(?:\/|$)/.test(url.pathname) || url.pathname.startsWith("/admin");
  } catch {
    return /\/dashboard|\/preview|\/admin/.test(referer);
  }
}

export function classifyOpen(input: {
  userAgent?: string | null;
  ip?: string | null;
  referer?: string | null;
  viewerUserId?: string | null;
  ownerUserIds?: string[];
}): { isBot: boolean; isOwner: boolean; isLocal: boolean; isTest: boolean; isExternal: boolean } {
  const ua = input.userAgent ?? "";
  const isBot = BOT_UA.test(ua);
  const isOwner = Boolean(input.viewerUserId && input.ownerUserIds?.includes(input.viewerUserId));
  const isLocal = isPrivateOrLocalIp(input.ip) || isInternalReferer(input.referer);
  const isTest = isBot || isOwner || isLocal;
  return { isBot, isOwner, isLocal, isTest, isExternal: !isTest };
}

/** Path or utm token only — never emails, query secrets or full destination URLs. */
export function sanitizeFunnelSource(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, 80);
  if (!trimmed || trimmed.includes("@")) return null;
  if (/^(javascript|data):/i.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const path = url.pathname.replace(/\/+$/, "") || "/";
      if (path.startsWith("/r/") || path.startsWith("/p/") || path.startsWith("/dashboard")) return path.slice(0, 80);
      return path.slice(0, 80);
    } catch {
      return null;
    }
  }
  if (!/^[a-zA-Z0-9_./?-]+$/.test(trimmed)) return null;
  return trimmed;
}

type RecordInput = {
  name: FunnelEventName;
  workspaceId: string;
  userId?: string | null;
  qrCodeId?: string | null;
  paymentId?: string | null;
  source?: unknown;
  isTest?: boolean;
  oncePerQr?: boolean;
  oncePerWorkspace?: boolean;
  oncePerPayment?: boolean;
  tx?: Prisma.TransactionClient;
  throwOnError?: boolean;
};

export async function recordFunnelEvent(input: RecordInput): Promise<void> {
  const db = input.tx ?? getDb();
  const funnel = funnelTable(db);
  try {
    if (input.oncePerQr && input.qrCodeId) {
      const existing = await funnel.findFirst({
        where: { qrCodeId: input.qrCodeId, name: input.name, isTest: false },
        select: { id: true },
      });
      if (existing) return;
    }
    if (input.oncePerWorkspace) {
      const existing = await funnel.findFirst({
        where: { workspaceId: input.workspaceId, name: input.name, isTest: false },
        select: { id: true },
      });
      if (existing) return;
    }
    if (input.oncePerPayment && input.paymentId) {
      const existing = await funnel.findFirst({
        where: { paymentId: input.paymentId, name: input.name },
        select: { id: true },
      });
      if (existing) return;
    }
    await funnel.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId ?? undefined,
        qrCodeId: input.qrCodeId ?? undefined,
        paymentId: input.paymentId ?? undefined,
        name: input.name,
        source: sanitizeFunnelSource(input.source),
        isTest: Boolean(input.isTest),
      },
    });
  } catch (error) {
    if (input.throwOnError) throw error;
    logger.warn({
      area: "runtime",
      message: "Funnel event not recorded",
      details: error instanceof Error ? { message: error.message, name: input.name } : { name: input.name },
    });
  }
}

export type FunnelReport = {
  definitions: typeof FUNNEL_DEFINITIONS;
  steps: Array<{ name: FunnelEventName; label: string; workspaces: number }>;
  activatedWorkspaces: number;
  paidWorkspaces: number;
  createdToActivated: string;
  activatedToPaid: string;
  excludedTestEvents: number;
  totalEventsInWindow: number;
  windowDays: number;
  cohorts: Array<{
    week: string;
    registered: number;
    created: number;
    activated: number;
    paid: number;
  }>;
};

const STEP_LABELS: Record<FunnelEventName, string> = {
  registration_completed: "Регистрация",
  qr_created: "Сохранён QR",
  qr_downloaded: "Скачан файл",
  first_external_open: "Первое внешнее открытие",
  checkout_started: "Начат checkout",
  payment_succeeded: "Оплата на сервере",
};

function isoWeekKey(date: Date): string {
  const key = mskDateKey(date);
  const utc = new Date(`${key}T00:00:00+03:00`);
  const day = (utc.getUTCDay() + 6) % 7;
  const thursday = new Date(utc.getTime() + (3 - day) * 86400000);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round((thursday.getTime() - jan4.getTime()) / 86400000 / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function ratioLabel(part: number, whole: number): string {
  if (whole === 0) return "нет базы";
  return `${Math.round((part / whole) * 100)}%`;
}

export async function buildFunnelReport(now = new Date()): Promise<FunnelReport> {
  const db = getDb();
  const funnel = funnelTable(db);
  const windowDays = 180;
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const [events, excludedTestEvents, testRegistrations, totalEventsInWindow] = await Promise.all([
    funnel.findMany({
      where: { isTest: false, createdAt: { gte: since } },
      select: { workspaceId: true, name: true, createdAt: true },
    }),
    funnel.count({ where: { isTest: true, createdAt: { gte: since } } }),
    funnel.findMany({
      where: { name: FUNNEL_EVENTS.registration_completed, isTest: true },
      select: { workspaceId: true },
    }),
    funnel.count({ where: { createdAt: { gte: since } } }),
  ]);

  const testWorkspaceIds = [...new Set(testRegistrations.map((row) => row.workspaceId))];

  const byName = new Map<FunnelEventName, Set<string>>();
  for (const name of Object.values(FUNNEL_EVENTS)) {
    byName.set(name, new Set());
  }
  for (const event of events) {
    if (testWorkspaceIds.includes(event.workspaceId)) continue;
    const set = byName.get(event.name as FunnelEventName);
    if (set) set.add(event.workspaceId);
  }

  const created = byName.get(FUNNEL_EVENTS.qr_created)!;
  const downloaded = byName.get(FUNNEL_EVENTS.qr_downloaded)!;
  const opened = byName.get(FUNNEL_EVENTS.first_external_open)!;
  const paid = byName.get(FUNNEL_EVENTS.payment_succeeded)!;
  const activated = new Set([...created].filter((id) => downloaded.has(id) && opened.has(id)));

  const workspaces = await db.workspace.findMany({
    where: {
      createdAt: { gte: since },
      ...(testWorkspaceIds.length > 0 ? { id: { notIn: testWorkspaceIds } } : {}),
    },
    select: { id: true, createdAt: true },
  });

  const cohortMap = new Map<string, { registered: Set<string>; created: Set<string>; activated: Set<string>; paid: Set<string> }>();
  for (const workspace of workspaces) {
    const week = isoWeekKey(workspace.createdAt);
    if (!cohortMap.has(week)) {
      cohortMap.set(week, { registered: new Set(), created: new Set(), activated: new Set(), paid: new Set() });
    }
    const row = cohortMap.get(week)!;
    row.registered.add(workspace.id);
    if (created.has(workspace.id)) row.created.add(workspace.id);
    if (activated.has(workspace.id)) row.activated.add(workspace.id);
    if (paid.has(workspace.id)) row.paid.add(workspace.id);
  }

  const cohorts = [...cohortMap.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 12)
    .map(([week, row]) => ({
      week,
      registered: row.registered.size,
      created: row.created.size,
      activated: row.activated.size,
      paid: row.paid.size,
    }));

  return {
    definitions: FUNNEL_DEFINITIONS,
    steps: (Object.values(FUNNEL_EVENTS) as FunnelEventName[]).map((name) => ({
      name,
      label: STEP_LABELS[name],
      workspaces: byName.get(name)?.size ?? 0,
    })),
    activatedWorkspaces: activated.size,
    paidWorkspaces: paid.size,
    createdToActivated: ratioLabel(activated.size, created.size),
    activatedToPaid: ratioLabel([...paid].filter((id) => activated.has(id)).length, activated.size),
    excludedTestEvents,
    totalEventsInWindow,
    windowDays,
    cohorts,
  };
}

export async function workspaceActivation(workspaceId: string): Promise<{
  hasQr: boolean;
  hasDownload: boolean;
  hasFirstExternalOpen: boolean;
  activated: boolean;
  paid: boolean;
}> {
  const db = getDb();
  const rows = await funnelTable(db).findMany({
    where: { workspaceId, isTest: false },
    select: { name: true },
  });
  const names = new Set(rows.map((row) => row.name));
  const hasQr = names.has(FUNNEL_EVENTS.qr_created);
  const hasDownload = names.has(FUNNEL_EVENTS.qr_downloaded);
  const hasFirstExternalOpen = names.has(FUNNEL_EVENTS.first_external_open);
  return {
    hasQr,
    hasDownload,
    hasFirstExternalOpen,
    activated: hasQr && hasDownload && hasFirstExternalOpen,
    paid: names.has(FUNNEL_EVENTS.payment_succeeded),
  };
}
