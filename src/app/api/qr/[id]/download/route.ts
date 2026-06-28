import { NextResponse } from "next/server";
import { MSG } from "@/lib/user-messages";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPlan } from "@/lib/plans";
import {
  renderStyledQrEps,
  renderStyledQrJpg,
  renderStyledQrPdf,
  renderStyledQrPng,
  renderStyledQrSvg,
} from "@/lib/qr-styled-render";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/qr/[id]/download";
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "png";

    const db = getDb();
    const qr = await db.qrCode.findUnique({
      where: { id },
    });
    if (!qr) {
      return apiError(MSG.NOT_FOUND, "NOT_FOUND", 404, undefined, requestId);
    }

    const isMember = user.memberships.some((m) => m.workspaceId === qr.workspaceId);
    if (!isMember) return unauthorized();

    const workspace = await db.workspace.findUnique({
      where: { id: qr.workspaceId },
      select: { plan: true },
    });
    const plan = await getPlan(workspace?.plan);
    const allowedFormats = new Set(plan.limits.exportFormats.map((f) => f.toLowerCase()));
    if (!allowedFormats.has(format.toLowerCase())) {
      return apiError(
        `Format ${format} not available on your plan. Allowed: ${plan.limits.exportFormats.join(", ")}`,
        "FORBIDDEN",
        403,
        undefined,
        requestId
      );
    }

    const style = (qr.styleConfig as Record<string, unknown> | null) ?? {};
    const safeFilename = qr.name.replace(/[^\w.-]/g, "_");
    const utf8Filename = encodeURIComponent(qr.name);

    if (format === "svg") {
      const svg = await renderStyledQrSvg(qr.encodedContent, style);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}.svg"; filename*=UTF-8''${utf8Filename}.svg`,
        },
      });
    }

    if (format === "jpg" || format === "jpeg") {
      const jpg = await renderStyledQrJpg(qr.encodedContent, style);
      return new NextResponse(new Uint8Array(jpg), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${safeFilename}.jpg"; filename*=UTF-8''${utf8Filename}.jpg`,
        },
      });
    }

    if (format === "eps") {
      const eps = await renderStyledQrEps(qr.encodedContent, style);
      return new NextResponse(new Uint8Array(eps), {
        headers: {
          "Content-Type": "application/postscript",
          "Content-Disposition": `attachment; filename="${safeFilename}.eps"; filename*=UTF-8''${utf8Filename}.eps`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await renderStyledQrPdf(qr.encodedContent, style);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeFilename}.pdf"; filename*=UTF-8''${utf8Filename}.pdf`,
        },
      });
    }

    const png = await renderStyledQrPng(qr.encodedContent, style);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${safeFilename}.png"; filename*=UTF-8''${utf8Filename}.png`,
      },
    });
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error({ area: "api", route, requestId, message: error.message, code: error.code, status: 500 });
      return apiError(error.message, "CONFIG_ERROR", 500, undefined, requestId);
    }
    logger.error({
      area: "api",
      route,
      requestId,
      message: "Unexpected download error",
      code: "INTERNAL_ERROR",
      status: 500,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return apiError(MSG.COULD_NOT_DOWNLOAD, "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
