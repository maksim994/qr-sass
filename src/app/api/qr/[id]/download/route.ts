import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/api-auth";
import { apiError, getRequestId } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { ConfigError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPlan } from "@/lib/plans";
import { defaultStyle, renderQrEps, renderQrJpg, renderQrPdf, renderQrPng, renderQrSvg } from "@/lib/qr";

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
      return apiError("Not found.", "NOT_FOUND", 404, undefined, requestId);
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

    const style = (qr.styleConfig as Record<string, unknown> | null) ?? defaultStyle;
    const renderStyle = {
      foreground: typeof style.foreground === "string" ? style.foreground : defaultStyle.foreground,
      background: typeof style.background === "string" ? style.background : defaultStyle.background,
      margin: typeof style.margin === "number" ? style.margin : defaultStyle.margin,
      errorCorrectionLevel:
        style.errorCorrectionLevel === "L" ||
        style.errorCorrectionLevel === "M" ||
        style.errorCorrectionLevel === "Q" ||
        style.errorCorrectionLevel === "H"
          ? style.errorCorrectionLevel
          : defaultStyle.errorCorrectionLevel,
    } as const;

    const safeFilename = qr.name.replace(/[^\w.-]/g, "_");
    const utf8Filename = encodeURIComponent(qr.name);

    if (format === "svg") {
      const svg = await renderQrSvg(qr.encodedContent, renderStyle);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}.svg"; filename*=UTF-8''${utf8Filename}.svg`,
        },
      });
    }

    if (format === "jpg" || format === "jpeg") {
      const jpg = await renderQrJpg(qr.encodedContent, renderStyle);
      return new NextResponse(new Uint8Array(jpg), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `attachment; filename="${safeFilename}.jpg"; filename*=UTF-8''${utf8Filename}.jpg`,
        },
      });
    }

    if (format === "eps") {
      const eps = await renderQrEps(qr.encodedContent, renderStyle);
      return new NextResponse(new Uint8Array(eps), {
        headers: {
          "Content-Type": "application/postscript",
          "Content-Disposition": `attachment; filename="${safeFilename}.eps"; filename*=UTF-8''${utf8Filename}.eps`,
        },
      });
    }

    if (format === "pdf") {
      const pdf = await renderQrPdf(qr.encodedContent, renderStyle);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeFilename}.pdf"; filename*=UTF-8''${utf8Filename}.pdf`,
        },
      });
    }

    const png = await renderQrPng(qr.encodedContent, renderStyle);
    return new NextResponse(png, {
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
    return apiError("Could not generate download.", "INTERNAL_ERROR", 500, undefined, requestId);
  }
}
