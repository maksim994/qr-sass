import { isSafeUrl } from "@/lib/url";
import { QreateFooter } from "./qreate-footer";

type Props = { payload: Record<string, unknown> };

export function Mp3Landing({ payload }: Props) {
  const title = (payload.title as string) || "Аудиозапись";
  const artist = payload.artist as string | undefined;
  const rawUrl = payload.fileUrl as string | undefined;
  const fileUrl = rawUrl && isSafeUrl(rawUrl) ? rawUrl : undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
          <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5A2.25 2.25 0 0116.5 2.25h.204c.478 0 .871.38.871.858v2.028c0 .478-.393.858-.872.858H16.5" />
          </svg>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
        {artist && <p className="mt-1 text-gray-500">{artist}</p>}

        {fileUrl ? (
          <audio controls className="mt-6 w-full" preload="metadata">
            <source src={fileUrl} type="audio/mpeg" />
            Ваш браузер не поддерживает воспроизведение аудио.
          </audio>
        ) : (
          <p className="mt-4 text-gray-500">Аудиофайл не найден</p>
        )}
      </div>

      <QreateFooter />
    </div>
  );
}
