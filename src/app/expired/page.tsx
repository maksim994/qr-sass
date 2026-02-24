import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Срок действия истёк — qr-s.ru",
  description: "QR-код больше не действителен",
};

export default function ExpiredPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-7 w-7 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Срок действия истёк</h1>
        <p className="mt-2 text-slate-600">
          Этот QR-код больше не действителен. Возможно, истёк указанный срок или достигнут лимит сканирований.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
