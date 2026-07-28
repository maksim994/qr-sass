import { isSafeUrl } from "@/lib/url";
import {
  HostedLandingCard,
  HostedLandingEmpty,
  HostedLandingShell,
  HostedLandingTitle,
} from "./hosted-landing-shell";

type Props = { payload: Record<string, unknown> };

export function ImageLanding({ payload }: Props) {
  const title = (payload.title as string) || "Изображение";
  const rawUrl = payload.fileUrl as string | undefined;
  const fileUrl = rawUrl && isSafeUrl(rawUrl) ? rawUrl : undefined;

  return (
    <HostedLandingShell>
      <HostedLandingCard>
        <HostedLandingTitle center>{title}</HostedLandingTitle>

        {fileUrl ? (
          <div className="qrs-hosted-media qrs-hosted-media--image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl} alt={title} className="qrs-hosted-media__image" />
          </div>
        ) : (
          <HostedLandingEmpty>Изображение не найдено</HostedLandingEmpty>
        )}
      </HostedLandingCard>
    </HostedLandingShell>
  );
}
