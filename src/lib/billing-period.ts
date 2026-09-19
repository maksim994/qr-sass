import type { WorkspacePlan } from "@prisma/client";

const PAID_PLANS = new Set(["PRO", "BUSINESS"]);

export function asPaidPlan(value: string | null | undefined): WorkspacePlan | null {
  const id = String(value ?? "").toUpperCase();
  return PAID_PLANS.has(id) ? (id as WorkspacePlan) : null;
}

function daysInUtcMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Add calendar months in UTC, clamping the day (31 Jan → 28/29 Feb, not 3 Mar). */
export function addCalendarMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(targetYear, targetMonth));
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * Paid period grows from the remaining paid end, not from "now".
 * Trial leftover is not stacked: payment starts a month from now.
 */
export function nextPaidPeriodEnd(
  now: Date,
  existingEnd: Date | null | undefined,
  status: string | null | undefined,
): Date {
  const paid = status === "active" || status === "canceled";
  const remaining = existingEnd && existingEnd.getTime() > now.getTime();
  const base = paid && remaining ? existingEnd : now;
  return addCalendarMonthsUtc(base, 1);
}

/**
 * Recover plan for succeeded payments created before Payment.planId existed.
 * Local column wins; then YooKassa metadata; then description; last — unique amount.
 */
export function resolvePaidPlanId(input: {
  localPlanId: string | null | undefined;
  metadataPlanId?: string | null;
  description?: string | null;
  amountRub: number;
  prices: { PRO: number; BUSINESS: number };
}): WorkspacePlan | null {
  const local = asPaidPlan(input.localPlanId);
  const meta = asPaidPlan(input.metadataPlanId);
  if (local && meta && local !== meta) return null;
  if (local) return local;
  if (meta) return meta;

  const fromDescription = input.description?.match(/\b(PRO|BUSINESS)\b/i);
  if (fromDescription) return asPaidPlan(fromDescription[1]);

  const { PRO, BUSINESS } = input.prices;
  const matchesPro = input.amountRub === PRO;
  const matchesBusiness = input.amountRub === BUSINESS;
  if (matchesPro && matchesBusiness) return null;
  if (matchesBusiness) return "BUSINESS";
  if (matchesPro) return "PRO";
  return null;
}
