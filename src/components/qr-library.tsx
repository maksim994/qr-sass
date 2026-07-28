"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { TrackedDownloadLink } from "@/components/dashboard/tracked-download-link";
import { QrLibraryCardMenu } from "@/components/dashboard/qr-library-card-menu";

type QrItem = {
  id: string;
  name: string;
  kind: "STATIC" | "DYNAMIC";
  contentType: string;
  createdAt: string;
  _count: { scanEvents: number };
};

type Props = {
  items: QrItem[];
  contentTypeLabels: Record<string, string>;
  exportFormats: ("PNG" | "SVG" | "JPG" | "EPS" | "PDF")[];
};

type FilterTab = "ALL" | "STATIC" | "DYNAMIC";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "STATIC", label: "Статические" },
  { key: "DYNAMIC", label: "Динамические" },
];

export default function QrLibrary({ items, contentTypeLabels, exportFormats }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  const filtered = items.filter((qr) => {
    if (activeTab !== "ALL" && qr.kind !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return qr.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <div className="qrs-lib-search">
        <svg className="qrs-lib-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          placeholder="Поиск по названию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="qrs-lib-search-input"
        />
      </div>

      <div className="qrs-lib-filters">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`qrs-lib-filter${activeTab === tab.key ? " active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        search || activeTab !== "ALL" ? (
          <Alert variant="info" title="Ничего не найдено">
            Попробуйте изменить фильтры или поисковый запрос.
          </Alert>
        ) : (
          <Alert variant="info" title="Пока нет QR-кодов">
            <Link href="/dashboard/create" className="qrs-navlink">
              Добавьте свой первый QR-код
            </Link>
          </Alert>
        )
      ) : (
        <div className="qrs-lib-grid">
          {filtered.map((qr) => {
            const tracksScans = qr.kind === "DYNAMIC" || qr.contentType === "VCARD";
            return (
              <article key={qr.id} className="qrs-lib-card qrs-row-lift">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <span className="qrs-lib-card-tag">
                      {contentTypeLabels[qr.contentType] || qr.contentType}
                    </span>
                    <span style={{ font: "var(--fw-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                      {qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}
                    </span>
                  </div>
                  <QrLibraryCardMenu qrId={qr.id} exportFormats={exportFormats} />
                </div>

                <Link href={`/dashboard/qr/${qr.id}`} className="block">
                  <h3 className="qrs-lib-card-title">{qr.name}</h3>
                </Link>

                <div className="qrs-lib-card-meta tnum">
                  {tracksScans && (
                    <span>{qr._count.scanEvents} {qr.contentType === "VCARD" ? "скач." : "скан."}</span>
                  )}
                  <span>
                    {new Date(qr.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="qrs-lib-card-actions">
                  <div style={{ display: "flex", gap: "8px" }}>
                    {exportFormats.includes("PNG") && (
                      <TrackedDownloadLink
                        href={`/api/qr/${qr.id}/download?format=png`}
                        className="qrs-lib-card-export"
                        download
                      >
                        PNG
                      </TrackedDownloadLink>
                    )}
                    {exportFormats.includes("SVG") && (
                      <TrackedDownloadLink
                        href={`/api/qr/${qr.id}/download?format=svg`}
                        className="qrs-lib-card-export"
                        download
                      >
                        SVG
                      </TrackedDownloadLink>
                    )}
                  </div>
                  <Link href={`/dashboard/qr/${qr.id}`} className="fk-button fk-button--sm fk-button--primary">
                    Открыть
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
