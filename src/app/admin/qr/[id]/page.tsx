import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { contentTypeLabels } from "@/lib/qr-types";
import { needsHostedPage } from "@/lib/qr";
import { renderStyledQrSvg } from "@/lib/qr-styled-render";
import { AdminPageHeader, AdminCard, AdminDataCard } from "@/components/admin/admin-page";
import { Badge, Button } from "@/components/ui";
import { QrTypeIcon } from "@/components/qr-type-icon";

type Props = {
  params: Promise<{ id: string }>;
};

function formatDateTime(date: Date) {
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminQrDetailPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();

  const qr = await db.qrCode.findUnique({
    where: { id },
    include: {
      workspace: { select: { id: true, name: true, plan: true } },
      createdBy: { select: { id: true, email: true, name: true } },
      scanEvents: { orderBy: { scannedAt: "desc" }, take: 20 },
      _count: { select: { scanEvents: true } },
    },
  });

  if (!qr) notFound();

  const styleRaw = (qr.styleConfig as Record<string, unknown> | null) ?? {};
  const svgString = await renderStyledQrSvg(qr.encodedContent, styleRaw, 200);
  const isVcard = qr.contentType === "VCARD";
  const hasShortLink = (qr.kind === "DYNAMIC" || isVcard) && !!qr.shortCode;
  const shortLinkPrefix = isVcard ? "v" : needsHostedPage(qr.contentType) ? "p" : "r";

  const metaRows: { label: string; value: React.ReactNode }[] = [
    { label: "ID", value: <code className="qrs-inline-code">{qr.id}</code> },
    { label: "Workspace", value: qr.workspace.name },
    { label: "Тариф workspace", value: qr.workspace.plan },
    { label: "Создатель", value: qr.createdBy.email },
    { label: "Тип", value: contentTypeLabels[qr.contentType] ?? qr.contentType },
    { label: "Вид", value: qr.kind === "DYNAMIC" ? "Динамический" : "Статический" },
    { label: "Короткий код", value: qr.shortCode ?? "—" },
    { label: "Создан", value: formatDateTime(qr.createdAt) },
    { label: "Обновлён", value: formatDateTime(qr.updatedAt) },
    { label: "Архив", value: qr.isArchived ? "Да" : "Нет" },
  ];

  if (qr.currentTargetUrl) {
    metaRows.push({
      label: "URL назначения",
      value: (
        <span style={{ wordBreak: "break-all" }}>{qr.currentTargetUrl}</span>
      ),
    });
  }

  if (qr.expireAt) {
    metaRows.push({ label: "Истекает", value: formatDateTime(qr.expireAt) });
  }

  if (qr.maxScans != null) {
    metaRows.push({ label: "Лимит сканов", value: qr.maxScans });
  }

  return (
    <div>
      <AdminPageHeader
        title={qr.name}
        description={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <QrTypeIcon contentType={qr.contentType} variant="blue" />
            <Badge variant="primary">{contentTypeLabels[qr.contentType] ?? qr.contentType}</Badge>
            <Badge variant="info">{qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}</Badge>
            {qr.isArchived ? <Badge variant="warning">В архиве</Badge> : null}
          </span>
        }
        action={
          <Button href="/admin/qr" variant="secondary" size="sm">
            ← К списку
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
            }}
          >
            <AdminCard>
              <div className="tnum" style={{ font: "var(--fw-extra) 1.7rem/1 var(--font-display)", color: "var(--text-strong)" }}>
                {qr._count.scanEvents}
              </div>
              <div style={{ marginTop: "6px", font: "var(--fw-medium) 13px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
                {isVcard ? "Скачиваний" : "Сканирований"}
              </div>
            </AdminCard>
            <AdminCard>
              <div style={{ font: "var(--fw-bold) 1rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
                {qr.workspace.name}
              </div>
              <div style={{ marginTop: "6px", font: "var(--fw-medium) 13px/1.2 var(--font-sans)", color: "var(--text-muted)" }}>
                Workspace · {qr.workspace.plan}
              </div>
            </AdminCard>
          </div>

          <AdminCard>
            <h2 style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "16px" }}>
              Сведения
            </h2>
            <dl style={{ display: "grid", gap: "12px" }}>
              {metaRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(120px, 180px) minmax(0, 1fr)",
                    gap: "12px",
                    alignItems: "start",
                  }}
                >
                  <dt style={{ font: "var(--fw-medium) 13px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
                    {row.label}
                  </dt>
                  <dd style={{ margin: 0, font: "var(--fw-regular) 14px/1.5 var(--font-sans)", color: "var(--text-default)" }}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </AdminCard>

          {qr.scanEvents.length > 0 ? (
            <AdminDataCard>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <h2 style={{ font: "var(--fw-bold) 1.05rem/1.2 var(--font-display)", color: "var(--text-strong)" }}>
                  Последние {isVcard ? "скачивания" : "сканирования"}
                </h2>
              </div>
              <div className="qrs-scroll qrs-data-table-wrap">
                <table className="qrs-data-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Страна</th>
                      <th>Устройство</th>
                      <th>ОС</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qr.scanEvents.map((scan) => (
                      <tr key={scan.id}>
                        <td>{formatDateTime(scan.scannedAt)}</td>
                        <td>{scan.country || "—"}</td>
                        <td>{scan.deviceType || "—"}</td>
                        <td>{scan.os || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminDataCard>
          ) : null}
        </div>

        <aside>
          <AdminCard>
            <h2 style={{ font: "var(--fw-bold) 1rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: "14px" }}>
              Превью
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-subtle)",
              }}
              dangerouslySetInnerHTML={{ __html: svgString }}
            />

            {hasShortLink && qr.shortCode ? (
              <div style={{ marginTop: "16px" }}>
                <p style={{ font: "var(--fw-bold) 11px/1 var(--font-sans)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Публичная ссылка
                </p>
                <Link
                  href={`/${shortLinkPrefix}/${qr.shortCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qrs-navlink"
                  style={{ display: "inline-block", marginTop: "8px", wordBreak: "break-all" }}
                >
                  /{shortLinkPrefix}/{qr.shortCode}
                </Link>
              </div>
            ) : null}
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}
