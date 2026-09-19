import { z } from "zod";
import { buildLimitLabels, type PlanInfo, type PlanId } from "@/lib/plans";

const savedPlan = z.object({
  id: z.enum(["FREE", "PRO", "BUSINESS"]),
  priceRub: z.number().int().nonnegative(),
  limits: z.object({
    maxQrCodes: z.number().int().nonnegative().nullable(),
    maxUsers: z.number().int().nonnegative().nullable(),
    allowsDynamic: z.boolean(),
    allowsAnalytics: z.boolean(),
    exportFormats: z.array(z.enum(["PNG", "SVG", "JPG", "EPS", "PDF"])),
  }),
});
const snapshotSchema = z.object({ version: z.literal(1), plan: savedPlan, freePlan: savedPlan });
export type ArchiveSnapshot = z.infer<typeof snapshotSchema>;
export type WorkspaceTerms = { accessMode?: string; archivedPlan?: unknown };

export function readArchive(workspace: WorkspaceTerms): ArchiveSnapshot | null {
  if (workspace.accessMode !== "archive") return null;
  // Fail closed: a corrupt snapshot must never silently replace a customer's price/rights.
  return snapshotSchema.parse(workspace.archivedPlan);
}

export function applyWorkspaceTerms(workspace: WorkspaceTerms, base: PlanInfo): PlanInfo {
  if (workspace.accessMode === "friends") {
    const limits: PlanInfo["limits"] = {
      maxQrCodes: null, maxUsers: null, allowsDynamic: true, allowsAnalytics: true,
      exportFormats: ["PNG", "SVG", "JPG", "EPS", "PDF"],
    };
    return { id: "BUSINESS", accessMode: "friends", name: "Для своих", priceRub: 0,
      description: "Бесплатный бессрочный доступ ко всем возможностям сервиса",
      limits, limitLabels: buildLimitLabels(limits, "BUSINESS") };
  }
  const archive = readArchive(workspace);
  if (!archive) return base;
  const saved = base.id === archive.plan.id ? archive.plan : base.id === "FREE" ? archive.freePlan : null;
  if (!saved) throw new Error("Archived plan requires an explicit change of terms");
  return { ...base, ...saved, accessMode: "archive", name: `${base.name} (архивный)`,
    limitLabels: buildLimitLabels(saved.limits, saved.id) };
}

export function archivedPlanId(workspace: WorkspaceTerms): PlanId | null {
  return readArchive(workspace)?.plan.id ?? null;
}

export function isComplimentary(workspace: WorkspaceTerms & { subscription?: unknown; plan?: string }): boolean {
  return workspace.accessMode === "friends" ||
    (workspace.accessMode === "archive" && !workspace.subscription && workspace.plan !== "FREE");
}
