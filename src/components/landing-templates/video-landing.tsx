import { QreateFooter } from "./qreate-footer";

type Props = { payload: Record<string, unknown> };

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube")) return u.searchParams.get("v");
  } catch { /* not a valid URL */ }
  return null;
}

export function VideoLanding({ payload }: Props) {
  const title = (payload.title as string) || "Видео";
  const videoUrl = payload.videoUrl as string | undefined;
  const fileUrl = payload.fileUrl as string | undefined;
  const src = videoUrl || fileUrl;

  const youtubeId = src ? getYouTubeId(src) : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        {youtubeId ? (
          <div className="mt-6 aspect-video overflow-hidden rounded-xl">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
            />
          </div>
        ) : src ? (
          <video
            src={src}
            controls
            className="mt-6 w-full rounded-xl"
            preload="metadata"
          >
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        ) : (
          <p className="mt-4 text-gray-500">Видео не найдено</p>
        )}
      </div>

      <QreateFooter />
    </div>
  );
}
