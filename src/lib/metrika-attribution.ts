import { z } from "zod";
import { ANALYTICS_POLICY_VERSION } from "@/lib/analytics-policy";
import { LEGAL_VERSION } from "@/lib/legal-documents";

const ids = {
  clientId: z.string().regex(/^\d{1,30}$/),
  counterId: z.string().regex(/^[1-9]\d{0,19}$/),
};
export const metrikaAttributionSchema = z.union([
  z.object({ ...ids, policyVersion: z.literal(ANALYTICS_POLICY_VERSION), collectionMode: z.literal("opt-out") }),
  z.object({ ...ids, consentVersion: z.literal(LEGAL_VERSION) }).transform(value => ({ clientId: value.clientId, counterId: value.counterId, policyVersion: `opt-in:${value.consentVersion}`, collectionMode: "opt-in" as const })),
]);
export type MetrikaAttribution = z.infer<typeof metrikaAttributionSchema>;

export function parseMetrikaAttribution(value: unknown, counterId: string | null) {
  const parsed = metrikaAttributionSchema.safeParse(value);
  return parsed.success && parsed.data.counterId === counterId ? parsed.data : null;
}

export function paymentConversionCsv(input: { clientId: string; paidAt: Date; amount: number; currency: string }) {
  if (!/^\d{1,30}$/.test(input.clientId) || !Number.isFinite(input.paidAt.getTime()) || !Number.isInteger(input.amount) || input.amount <= 0 || !/^[A-Z]{3}$/.test(input.currency)) throw new Error("Invalid conversion");
  return `ClientId,Target,DateTime,Price,Currency\n${input.clientId},payment_succeeded,${Math.floor(input.paidAt.getTime() / 1000)},${input.amount.toFixed(2)},${input.currency}\n`;
}
