import { getDb } from "@/lib/db";
import Link from "next/link";
import { AdminPageHeader, AdminDataCard } from "@/components/admin/admin-page";
import { Alert } from "@/components/ui";

const contentTypeLabels: Record<string, string> = {
  URL: "Ссылка", TEXT: "Текст", EMAIL: "Email", PHONE: "Телефон", SMS: "SMS",
  WIFI: "Wi-Fi", VCARD: "Визитка", LOCATION: "Геолокация", PDF: "PDF",
  IMAGE: "Изображение", VIDEO: "Видео", MP3: "MP3", MENU: "Меню",
  BUSINESS: "Бизнес", LINK_LIST: "Список ссылок", COUPON: "Купон",
  APP_STORE: "Приложение", INSTAGRAM: "Instagram", FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp", SOCIAL_LINKS: "Соцсети",
};

export default async function AdminQrPage() {
  const db = getDb();
  const qrCodes = await db.qrCode.findMany({
    include: {
      workspace: true,
      createdBy: { select: { email: true, name: true } },
      _count: { select: { scanEvents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <AdminPageHeader title="QR-коды" description="Все созданные QR-коды в системе" />
      <AdminDataCard>
        {qrCodes.length === 0 ? (
          <div style={{ padding: 24 }}>
            <Alert variant="info" title="QR-кодов пока нет">
              Когда пользователи создадут QR-коды, они появятся в этом списке.
            </Alert>
          </div>
        ) : (
          <div className="qrs-scroll qrs-data-table-wrap">
            <table className="qrs-data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Workspace</th>
                  <th>Создатель</th>
                  <th>Сканы</th>
                  <th>Код</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {qrCodes.map((qr) => (
                  <tr key={qr.id}>
                    <td>
                      <Link href={`/admin/qr/${qr.id}`} className="qrs-navlink" style={{ fontWeight: "var(--fw-bold)" }}>
                        {qr.name}
                      </Link>
                    </td>
                    <td>{contentTypeLabels[qr.contentType] ?? qr.contentType}</td>
                    <td>{qr.workspace.name}</td>
                    <td>{qr.createdBy.email}</td>
                    <td className="tnum">{qr._count.scanEvents}</td>
                    <td>
                      <code style={{ font: "var(--fw-medium) 12px/1 var(--font-mono)", color: "var(--text-muted)" }}>
                        {qr.shortCode ?? "—"}
                      </code>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontWeight: "var(--fw-medium)" }}>
                      {qr.createdAt.toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminDataCard>
    </div>
  );
}
