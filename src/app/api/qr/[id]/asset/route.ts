import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getFileObject } from "@/lib/s3";
import { MSG } from "@/lib/user-messages";
import { apiError, getRequestId } from "@/lib/api-response";
import { accessCookieFor, evaluateQrPublicAccess, qrPublicUnavailablePath } from "@/lib/qr-public-access";
import { env } from "@/lib/env";
import { viewCookieName } from "@/lib/qr-view-grant";
import { workspaceFileIdFromPath } from "@/lib/workspace-file-path";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const { id } = await context.params;
  const db = getDb();
  const qr = await db.qrCode.findUnique({ where: { id } });
  if (!qr) return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

  const user = await getApiUser().catch(() => null);
  const member = user?.memberships.some((item) => item.workspaceId === qr.workspaceId);
  const scanCount = await db.scanEvent.count({ where: { qrCodeId: qr.id } });
  const cookieStore = await cookies();
  const token = cookieStore.get(accessCookieFor(qr.shortCode))?.value;
  const viewGrantToken =
    new URL(request.url).searchParams.get("v") ?? cookieStore.get(viewCookieName(qr.id))?.value;
  const limited = qr.maxScans != null && qr.maxScans > 0;
  const access = await evaluateQrPublicAccess({
    qr,
    scanCount,
    accessToken: token,
    viewGrantToken,
    requireViewGrant: limited && !member,
    bypassPassword: Boolean(member),
    bypassScanLimit: Boolean(member),
  });
  if (!access.ok) {
    if (access.reason === "password") return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401, undefined, requestId);
    return NextResponse.redirect(new URL(qrPublicUnavailablePath(access.reason), env.APP_URL));
  }

  const payload = (qr.payload as Record<string, unknown>) ?? {};
  const fileUrl = typeof payload.fileUrl === "string" ? payload.fileUrl : typeof payload.videoUrl === "string" ? payload.videoUrl : "";
  const payloadFileId = typeof payload.fileId === "string" ? payload.fileId : "";
  const pathId = workspaceFileIdFromPath(fileUrl) ?? "";
  const file = await db.uploadedFile.findFirst({
    where: {
      workspaceId: qr.workspaceId,
      OR: [
        ...(fileUrl ? [{ url: fileUrl }] : []),
        ...(payloadFileId ? [{ id: payloadFileId }] : []),
        ...(pathId ? [{ id: pathId }] : []),
      ],
    },
  });
  if (!file) return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

  const object = await getFileObject(file.key);
  if (!object) return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

  return new NextResponse(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
