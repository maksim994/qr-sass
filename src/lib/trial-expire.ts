import { getEntitlements } from "@/lib/entitlements";

/** @deprecated Use getEntitlements — kept for existing call sites. */
export async function expireTrialsIfNeeded(workspaceId: string): Promise<void> {
  await getEntitlements(workspaceId);
}
