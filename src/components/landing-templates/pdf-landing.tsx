import { isSafeUrl } from "@/lib/url";
import { QreateFooter } from "./qreate-footer";

type Props = { payload: Record<string, unknown> };

export function PdfLanding({ payload }: Props) {
  const title = (payload.title as string) || "Документ PDF";
  const rawUrl = payload.fileUrl as string | undefined;
  const fileUrl = rawUrl && isSafeUrl(rawUrl) ? rawUrl : undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        {fileUrl ? (
          <>
            <div className="mt-6 overflow-hidden rounded-xl border border-gray-200">
              <iframe
                src={fileUrl}
                className="h-[60vh] w-full"
                title={title}
              />
            </div>

            <a
              href={fileUrl}
              download
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Скачать PDF
            </a>
          </>
        ) : (
          <p className="mt-4 text-gray-500">Файл не найден</p>
        )}
      </div>

      <QreateFooter />
    </div>
  );
}
