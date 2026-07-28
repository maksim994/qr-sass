import { isSafeUrl } from "@/lib/url";
import {
  HostedLandingCard,
  HostedLandingEmpty,
  HostedLandingShell,
  HostedLandingSubtitle,
  HostedLandingTitle,
} from "./hosted-landing-shell";

type Props = { payload: Record<string, unknown> };

export function Mp3Landing({ payload }: Props) {
  const title = (payload.title as string) || "Аудиозапись";
  const artist = payload.artist as string | undefined;
  const rawUrl = payload.fileUrl as string | undefined;
  const fileUrl = rawUrl && isSafeUrl(rawUrl) ? rawUrl : undefined;

  return (
    <HostedLandingShell>
      <HostedLandingCard>
        <div className="qrs-hosted-audio-hero" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.5A2.25 2.25 0 0116.5 2.25h.204c.478 0 .871.38.871.858v2.028c0 .478-.393.858-.872.858H16.5" />
          </svg>
        </div>

        <HostedLandingTitle center>{title}</HostedLandingTitle>
        {artist ? <HostedLandingSubtitle>{artist}</HostedLandingSubtitle> : null}

        {fileUrl ? (
          <audio controls className="qrs-hosted-audio" preload="metadata">
            <source src={fileUrl} type="audio/mpeg" />
            Ваш браузер не поддерживает воспроизведение аудио.
          </audio>
        ) : (
          <HostedLandingEmpty>Аудиофайл не найден</HostedLandingEmpty>
        )}
      </HostedLandingCard>
    </HostedLandingShell>
  );
}
