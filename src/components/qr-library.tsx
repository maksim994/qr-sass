"use client";

import { useState } from "react";
import Link from "next/link";

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
};

type FilterTab = "ALL" | "STATIC" | "DYNAMIC";

const tabs: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "STATIC", label: "Статические" },
  { key: "DYNAMIC", label: "Динамические" },
];

export default function QrLibrary({ items, contentTypeLabels }: Props) {
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
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск по названию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? "btn-primary" : "btn-secondary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">
            {search || activeTab !== "ALL"
              ? "Ничего не найдено. Попробуйте изменить фильтры."
              : "QR-коды ещё не созданы."}
          </p>
          {!search && activeTab === "ALL" && (
            <Link href="/dashboard/create" className="btn btn-primary btn-sm mt-4">
              Создать первый QR
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((qr) => (
            <div key={qr.id} className="card flex flex-col justify-between p-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge">
                    {contentTypeLabels[qr.contentType] || qr.contentType}
                  </span>
                  <span className="text-xs text-slate-400">
                    {qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}
                  </span>
                </div>
                <Link href={`/dashboard/qr/${qr.id}`} className="block">
                  <h3 className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                    {qr.name}
                  </h3>
                </Link>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                  <span>{qr._count.scanEvents} скан.</span>
                  <span>
                    {new Date(qr.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <a
                  href={`/api/qr/${qr.id}/download?format=png`}
                  className="btn btn-secondary btn-sm"
                  download
                >
                  PNG
                </a>
                <a
                  href={`/api/qr/${qr.id}/download?format=svg`}
                  className="btn btn-secondary btn-sm"
                  download
                >
                  SVG
                </a>
                <Link
                  href={`/dashboard/qr/${qr.id}`}
                  className="btn btn-sm btn-primary ml-auto"
                >
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
