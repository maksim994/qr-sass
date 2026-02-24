import { getDb } from "@/lib/db";
import Link from "next/link";

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
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">QR-коды</h1>
        <p className="mt-1 text-sm text-slate-500">Все созданные QR-коды в системе</p>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto px-6 py-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 font-semibold text-slate-900">Название</th>
              <th className="py-3 font-semibold text-slate-900">Тип</th>
              <th className="py-3 font-semibold text-slate-900">Workspace</th>
              <th className="py-3 font-semibold text-slate-900">Создатель</th>
              <th className="py-3 font-semibold text-slate-900">Сканы</th>
              <th className="py-3 font-semibold text-slate-900">Код</th>
              <th className="py-3 font-semibold text-slate-900">Создан</th>
            </tr>
          </thead>
          <tbody>
            {qrCodes.map((qr) => (
              <tr key={qr.id} className="border-b border-slate-100">
                <td className="py-3">
                  <Link href={`/dashboard/qr/${qr.id}`} className="font-medium text-blue-600 hover:underline">
                    {qr.name}
                  </Link>
                </td>
                <td className="py-3">{contentTypeLabels[qr.contentType] ?? qr.contentType}</td>
                <td className="py-3">{qr.workspace.name}</td>
                <td className="py-3">{qr.createdBy.email}</td>
                <td className="py-3">{qr._count.scanEvents}</td>
                <td className="py-3 font-mono text-xs">{qr.shortCode ?? "—"}</td>
                <td className="py-3 text-slate-500">
                  {qr.createdAt.toLocaleDateString("ru-RU")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
