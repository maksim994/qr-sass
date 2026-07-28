import { isSafeUrl } from "@/lib/url";
import {
  HostedLandingCard,
  HostedLandingEmpty,
  HostedLandingShell,
  HostedLandingTitle,
} from "./hosted-landing-shell";

type Props = { payload: Record<string, unknown> };

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube")) return u.searchParams.get("v");
  } catch {
    /* not a valid URL */
  }
  return null;
}

export function VideoLanding({ payload }: Props) {
  const title = (payload.title as string) || "Видео";
  const rawVideoUrl = payload.videoUrl as string | undefined;
  const rawFileUrl = payload.fileUrl as string | undefined;
  const safeVideoUrl = rawVideoUrl && isSafeUrl(rawVideoUrl) ? rawVideoUrl : undefined;
  const safeFileUrl = rawFileUrl && isSafeUrl(rawFileUrl) ? rawFileUrl : undefined;
  const src = safeVideoUrl || safeFileUrl;

  const youtubeId = src ? getYouTubeId(src) : null;

  return (
    <HostedLandingShell>
      <HostedLandingCard>
        <HostedLandingTitle center>{title}</HostedLandingTitle>

        {youtubeId ? (
          <div className="qrs-hosted-media qrs-hosted-media--video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              className="qrs-hosted-media__frame"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={title}
            />
          </div>
        ) : src ? (
          <video src={src} controls className="qrs-hosted-media__video" preload="metadata">
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        ) : (
          <HostedLandingEmpty>Видео не найдено</HostedLandingEmpty>
        )}
      </HostedLandingCard>
    </HostedLandingShell>
  );
}
