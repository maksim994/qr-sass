import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildVcard, getVcardFilename } from "@/lib/vcard";
import { logger } from "@/lib/logger";
import { trackScan } from "@/lib/analytics";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;

  try {
    const db = getDb();
    const qr = await db.qrCode.findFirst({
      where: {
        shortCode: code,
        contentType: "VCARD",
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        payload: true,
      },
    });

    if (!qr) {
      return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
    }

    const payload = (qr.payload as Record<string, unknown> | null) ?? {};
    const vcard = buildVcard(payload);
    const filename = getVcardFilename(payload, qr.name || "contact");
    const utf8Filename = encodeURIComponent(filename);

    await trackScan(qr.id, `/v/${code}`).catch((error) => {
      logger.error({
        area: "api",
        route: "/v/[code]",
        message: "Failed to record vCard scan event",
        code: "INTERNAL_ERROR",
        status: 200,
        details: error instanceof Error ? { message: error.message } : error,
      });
    });

    return new NextResponse(vcard, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.vcf"; filename*=UTF-8''${utf8Filename}.vcf`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error({
      area: "api",
      route: "/v/[code]",
      message: "Failed to build vCard file",
      code: "INTERNAL_ERROR",
      status: 302,
      details: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return NextResponse.redirect(new URL("/", process.env.APP_URL ?? "http://localhost:3000"));
  }
}
