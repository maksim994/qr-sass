import { getDb } from "@/lib/db";

/**
 * Проверяет, истёк ли триал для воркспейса, и при необходимости понижает план до FREE.
 * Вызывать при каждом заходе на страницу billing или layout дашборда.
 */
export async function expireTrialsIfNeeded(workspaceId: string): Promise<void> {
  const db = getDb();
  const subscription = await db.subscription.findUnique({
    where: { workspaceId },
  });
  if (!subscription || subscription.status !== "trial") return;
  if (subscription.currentPeriodEnd >= new Date()) return;

  await db.$transaction([
    db.workspace.update({
      where: { id: workspaceId },
      data: { plan: "FREE" },
    }),
    db.subscription.update({
      where: { id: subscription.id },
      data: { status: "canceled" },
    }),
  ]);
}
