import { isSafeUrl } from "@/lib/url";
import { QreateFooter } from "./qreate-footer";

type Props = { payload: Record<string, unknown> };

export function ImageLanding({ payload }: Props) {
  const title = (payload.title as string) || "Изображение";
  const rawUrl = payload.fileUrl as string | undefined;
  const fileUrl = rawUrl && isSafeUrl(rawUrl) ? rawUrl : undefined;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        {fileUrl ? (
          <div className="mt-6 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={title}
              className="max-h-[70vh] rounded-xl object-contain"
            />
          </div>
        ) : (
          <p className="mt-4 text-gray-500">Изображение не найдено</p>
        )}
      </div>

      <QreateFooter />
    </div>
  );
}
