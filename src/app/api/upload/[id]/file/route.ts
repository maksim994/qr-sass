import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { getDb } from "@/lib/db";
import { getFileObject } from "@/lib/s3";
import { MSG } from "@/lib/user-messages";
import { apiError, getRequestId } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const { id } = await context.params;
  const user = await getApiUser().catch(() => null);
  if (!user) return unauthorized();

  const db = getDb();
  const file = await db.uploadedFile.findUnique({ where: { id } });
  if (!file) return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);

  const member = user.memberships.some((item) => item.workspaceId === file.workspaceId);
  if (!member) return unauthorized();

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
