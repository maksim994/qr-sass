/** Shared analytics window: calendar days in Europe/Moscow, no silent row cap. */

export const ANALYTICS_PERIODS = [7, 30, 90] as const;
export type AnalyticsDays = (typeof ANALYTICS_PERIODS)[number];
export const ANALYTICS_TIMEZONE = "Europe/Moscow";
export const QR_DETAIL_CHART_DAYS = 30;

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;

export function parseAnalyticsDays(raw: string | number | undefined | null): AnalyticsDays {
  const n = Number(raw);
  return ANALYTICS_PERIODS.includes(n as AnalyticsDays) ? (n as AnalyticsDays) : 7;
}

export function mskDateKey(date: Date): string {
  return new Date(date.getTime() + MSK_OFFSET_MS).toISOString().slice(0, 10);
}

export function mskMidnightUtc(key: string): Date {
  return new Date(`${key}T00:00:00+03:00`);
}

export function pgDateKey(day: Date | string): string {
  if (typeof day === "string") return day.slice(0, 10);
  return new Date(day).toISOString().slice(0, 10);
}

export function analyticsWindow(days: number, now = new Date()) {
  const todayKey = mskDateKey(now);
  const todayStart = mskMidnightUtc(todayKey);
  const start = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
  const keys = Array.from({ length: days }, (_, index) => {
    const instant = new Date(start.getTime() + index * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
    return mskDateKey(instant);
  });
  return { start, prevStart, todayStart, keys, timezone: ANALYTICS_TIMEZONE };
}

export function fillDailySeries(
  keys: string[],
  rows: Array<{ day: Date | string; count: number | bigint }>,
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(pgDateKey(row.day), Number(row.count));
  }
  return keys.map((key) => ({ key, count: map.get(key) ?? 0 }));
}

export function formatGrowth(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? "нет изменений" : "нет базы для сравнения";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function formatDeviceLabel(value: string | null | undefined): string {
  const map: Record<string, string> = {
    mobile: "Смартфоны",
    desktop: "Компьютеры",
    bot: "Боты",
    tablet: "Планшеты",
  };
  const key = (value || "").trim().toLowerCase();
  if (!key) return "Неизвестно";
  return map[key] ?? value!.trim();
}

export function isBotDevice(deviceType: string | null | undefined): boolean {
  return (deviceType || "").trim().toLowerCase() === "bot";
}

/** Prisma predicate that keeps NULL deviceType (unknown) and drops only explicit bots. */
export function humanDevicePrismaWhere(): {
  OR: Array<{ deviceType: null } | { deviceType: { not: string } }>;
} {
  return {
    OR: [{ deviceType: null }, { deviceType: { not: "bot" } }],
  };
}

/** timestamptz UTC instant → calendar date in Europe/Moscow. */
export const MSK_SCAN_DAY_SQL = `(se."scannedAt" AT TIME ZONE 'Europe/Moscow')::date`;

export function formatAnalyticsDayLabel(key: string, periodDays: number): string {
  const date = mskMidnightUtc(key);
  if (periodDays <= 7) {
    const weekday = date.toLocaleDateString("ru-RU", { weekday: "short", timeZone: ANALYTICS_TIMEZONE });
    const map: Record<string, string> = {
      вс: "Вс",
      пн: "Пн",
      вт: "Вт",
      ср: "Ср",
      чт: "Чт",
      пт: "Пт",
      сб: "Сб",
    };
    return map[weekday.replace(".", "").trim().toLowerCase()] ?? weekday;
  }
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: ANALYTICS_TIMEZONE });
}
