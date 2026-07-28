import { getDb } from "@/lib/db";
import { parseDisabledQrTypes } from "@/lib/disabled-qr-types";
import { QrTypesForm } from "./qr-types-form";
import { AdminPageHeader, AdminCard } from "@/components/admin/admin-page";

export default async function AdminQrTypesPage() {
  const db = getDb();
  const row = await db.siteSettings.findUnique({
    where: { id: "default" },
    select: { disabledQrTypes: true },
  });
  const disabled = parseDisabledQrTypes(row?.disabledQrTypes);

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Типы QR-кодов"
        description="Включайте и отключайте типы QR-кодов для пользователей. Существующие QR-коды не удаляются."
      />
      <AdminCard>
        <QrTypesForm initialDisabled={disabled} />
      </AdminCard>
    </div>
  );
}
