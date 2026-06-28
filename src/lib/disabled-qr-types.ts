import { QrContentType } from "@prisma/client";
import { getDb } from "@/lib/db";
import { qrTypes } from "@/lib/qr-types";

const ALL_TYPES = new Set(qrTypes.map((t) => t.type));

export function parseDisabledQrTypes(raw: string | null | undefined): QrContentType[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is QrContentType => typeof t === "string" && ALL_TYPES.has(t as QrContentType),
    );
  } catch {
    return [];
  }
}

export function serializeDisabledQrTypes(types: QrContentType[]): string {
  return JSON.stringify([...new Set(types)]);
}

export async function getDisabledQrTypes(): Promise<QrContentType[]> {
  try {
    const db = getDb();
    const row = await db.siteSettings.findUnique({
      where: { id: "default" },
      select: { disabledQrTypes: true },
    });
    return parseDisabledQrTypes(row?.disabledQrTypes);
  } catch {
    return [];
  }
}

export function isQrTypeDisabled(type: string, disabled: QrContentType[]): boolean {
  return disabled.includes(type as QrContentType);
}

export function validateDisabledQrTypesInput(types: unknown): QrContentType[] | null {
  if (!Array.isArray(types)) return null;
  const valid = types.filter(
    (t): t is QrContentType => typeof t === "string" && ALL_TYPES.has(t as QrContentType),
  );
  return [...new Set(valid)];
}
