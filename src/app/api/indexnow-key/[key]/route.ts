import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Файл ключа IndexNow: /{key}.txt — по спецификации имя файла = ключ */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (!key?.trim()) return new NextResponse("Not found", { status: 404 });

  try {
    const db = getDb();
    const row = await db.siteSettings.findUnique({
      where: { id: "default" },
      select: { indexNowKey: true },
    });
    if (!row?.indexNowKey || row.indexNowKey.trim() !== key.trim()) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(row.indexNowKey.trim(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
