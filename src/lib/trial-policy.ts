/** Only new activations use this duration; existing subscriptions keep currentPeriodEnd. */
export const TRIAL_DAYS = 7;
export function newTrialEnd(startedAt: Date): Date {
  return new Date(startedAt.getTime() + TRIAL_DAYS * 86400_000);
}
