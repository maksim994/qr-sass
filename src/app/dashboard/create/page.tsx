import Link from "next/link";
import { qrTypes, groupLabels } from "@/lib/qr-types";

const groups = ["basic", "files", "business", "social"] as const;

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Создать QR-код</h1>
        <p className="mt-1 text-sm text-slate-500">Выберите тип QR-кода, который хотите создать.</p>
      </div>

      {groups.map((group) => {
        const items = qrTypes.filter((t) => t.group === group);
        return (
          <div key={group} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              {groupLabels[group]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <Link
                  key={item.type}
                  href={`/dashboard/create/${item.type.toLowerCase()}`}
                  className="card group flex items-start gap-3 p-4 transition hover:shadow-lg hover:ring-2 hover:ring-blue-200"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
