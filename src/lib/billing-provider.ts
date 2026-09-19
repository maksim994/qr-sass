/** Authoritative billing action from the YooKassa payment object, not the webhook event name. */
export function billingActionFromRemoteStatus(
  remoteStatus: string | null | undefined,
): "succeed" | "cancel" | "ignore" {
  if (remoteStatus === "succeeded") return "succeed";
  if (remoteStatus === "canceled") return "cancel";
  return "ignore";
}
