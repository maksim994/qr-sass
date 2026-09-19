import { getDb } from "@/lib/db";
import { isSafeUrl } from "@/lib/url";
import { assetUrlWithViewGrant } from "@/lib/qr-view-grant";
import { workspaceFileIdFromPath } from "@/lib/workspace-file-path";

function looksLikeHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export type HostedMediaLookup = {
  uploadedFile: {
    findFirst: (args: {
      where: { workspaceId: string; OR: Array<Record<string, string>> };
      select: { id: true; url: true };
    }) => Promise<{ id: string; url: string } | null>;
  };
};

export async function hostedLandingPayload(
  qr: { id: string; workspaceId: string },
  payload: Record<string, unknown>,
  db?: HostedMediaLookup,
  viewGrant?: string,
): Promise<Record<string, unknown>> {
  const fileUrl = typeof payload.fileUrl === "string" ? payload.fileUrl : "";
  const videoUrl = typeof payload.videoUrl === "string" ? payload.videoUrl : "";
  const fileId = typeof payload.fileId === "string" ? payload.fileId : "";
  const pathIds = [workspaceFileIdFromPath(fileUrl), workspaceFileIdFromPath(videoUrl)].filter(
    (id): id is string => Boolean(id),
  );
  if (!fileUrl && !videoUrl && !fileId) return payload;
  const client = db ?? (getDb() as unknown as HostedMediaLookup);
  const uploaded = await client.uploadedFile.findFirst({
    where: {
      workspaceId: qr.workspaceId,
      OR: [
        ...(fileId ? [{ id: fileId }] : []),
        ...pathIds.map((id) => ({ id })),
        ...(fileUrl ? [{ url: fileUrl }] : []),
        ...(videoUrl ? [{ url: videoUrl }] : []),
      ],
    },
    select: { id: true, url: true },
  });
  if (!uploaded) return payload;

  const asset = assetUrlWithViewGrant(qr.id, viewGrant);
  const next = { ...payload };
  if (
    fileUrl &&
    (fileUrl === uploaded.url || fileId === uploaded.id || workspaceFileIdFromPath(fileUrl) === uploaded.id)
  ) {
    next.fileUrl = asset;
  }
  if (videoUrl && (videoUrl === uploaded.url || workspaceFileIdFromPath(videoUrl) === uploaded.id)) {
    next.videoUrl = asset;
  } else if (videoUrl && looksLikeHttpUrl(videoUrl) && isSafeUrl(videoUrl)) {
    next.videoUrl = videoUrl;
  }
  return next;
}
