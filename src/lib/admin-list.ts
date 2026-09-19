export type AdminSearchParams = Record<string, string | string[] | undefined>;
export function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}
export function listParams(params: AdminSearchParams) {
  return {
    q: scalar(params.q).slice(0, 150),
    page: Math.min(100000, Math.max(1, parseInt(scalar(params.page), 10) || 1)),
    size: [25, 50, 100].includes(Number(params.size))
      ? Number(params.size)
      : 25,
  };
}
export function adminDate(value: Date | string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("ru-RU", {
        timeZone: "Europe/Moscow",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}
export const adminPlanLabels: Record<string, string> = {
  FREE: "Бесплатный",
  PRO: "Про",
  BUSINESS: "Бизнес",
};

export function workspacePlanLabel(workspace: { plan: string; accessMode?: string }) {
  return workspace.accessMode === "friends" ? "Для своих" :
    `${adminPlanLabels[workspace.plan] ?? workspace.plan}${workspace.accessMode === "archive" ? " (архивный)" : ""}`;
}
