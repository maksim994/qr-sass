import { getDb } from "@/lib/db";
import { parseDisabledQrTypes } from "@/lib/disabled-qr-types";
import { QrTypesForm } from "./qr-types-form";

export default async function AdminQrTypesPage() {
  const db = getDb();
  const row = await db.siteSettings.findUnique({
    where: { id: "default" },
    select: { disabledQrTypes: true },
  });
  const disabled = parseDisabledQrTypes(row?.disabledQrTypes);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Типы QR-кодов</h1>
        <p className="mt-1 text-sm text-slate-500">
          Включайте и отключайте типы QR-кодов для пользователей. Существующие QR-коды не удаляются.
        </p>
      </div>
      <div className="card p-6">
        <QrTypesForm initialDisabled={disabled} />
      </div>
    </div>
  );
}
