export function workspaceFilePath(fileId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
    throw new Error("Некорректный файл.");
  }
  return `/api/upload/${fileId}/file`;
}

export function workspaceFileIdFromPath(url: string): string | null {
  const match = url.trim().match(/^\/api\/upload\/([A-Za-z0-9_-]+)\/file(?:\?.*)?$/);
  return match?.[1] ?? null;
}

export function isWorkspaceFilePath(url: string): boolean {
  return workspaceFileIdFromPath(url) != null;
}

export function payloadMediaUploadIds(payload: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value) ids.add(value);
  };
  add(payload.fileId);
  add(payload.logoFileId);
  add(workspaceFileIdFromPath(typeof payload.fileUrl === "string" ? payload.fileUrl : ""));
  add(workspaceFileIdFromPath(typeof payload.videoUrl === "string" ? payload.videoUrl : ""));
  add(workspaceFileIdFromPath(typeof payload.logo === "string" ? payload.logo : ""));
  add(workspaceFileIdFromPath(typeof payload.logoUrl === "string" ? payload.logoUrl : ""));
  return [...ids];
}
