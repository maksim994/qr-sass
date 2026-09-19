import type { PrismaClient } from "@prisma/client";
import { payloadMediaUploadIds, workspaceFileIdFromPath } from "@/lib/workspace-file-path";

export async function projectBelongsToWorkspace(
  db: PrismaClient,
  projectId: string | null | undefined,
  workspaceId: string,
): Promise<boolean> {
  if (!projectId) return true;
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId },
    select: { id: true },
  });
  return Boolean(project);
}

export async function uploadBelongsToWorkspace(
  db: PrismaClient,
  fileId: string | null | undefined,
  workspaceId: string,
): Promise<boolean> {
  if (!fileId) return true;
  const file = await db.uploadedFile.findFirst({
    where: { id: fileId, workspaceId },
    select: { id: true },
  });
  return Boolean(file);
}

export function collectUploadIds(
  payload: Record<string, unknown>,
  style?: Record<string, unknown> | null,
): string[] {
  const ids = new Set(payloadMediaUploadIds(payload));
  if (!style) return [...ids];
  if (typeof style.logoFileId === "string" && style.logoFileId) ids.add(style.logoFileId);
  const fromLogoUrl = workspaceFileIdFromPath(typeof style.logoUrl === "string" ? style.logoUrl : "");
  if (fromLogoUrl) ids.add(fromLogoUrl);
  return [...ids];
}

export async function uploadsBelongToWorkspace(
  db: PrismaClient,
  fileIds: string[],
  workspaceId: string,
): Promise<boolean> {
  for (const fileId of fileIds) {
    if (!(await uploadBelongsToWorkspace(db, fileId, workspaceId))) return false;
  }
  return true;
}
