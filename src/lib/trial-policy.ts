/** Only new activations use this duration; existing subscriptions keep currentPeriodEnd. */
import { COMMERCIAL } from "@/lib/commercial-config";
export const TRIAL_DAYS = COMMERCIAL.trialDays;
export function newTrialEnd(startedAt: Date): Date {
  return new Date(startedAt.getTime() + TRIAL_DAYS * 86400_000);
}
