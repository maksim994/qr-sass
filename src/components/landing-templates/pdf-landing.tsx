import { isSafeUrl } from "@/lib/url";
import {
  HostedLandingCard,
  HostedLandingEmpty,
  HostedLandingShell,
  HostedLandingTitle,
} from "./hosted-landing-shell";
import { LandingActionLink } from "./landing-actions";

type Props = { payload: Record<string, unknown> };

export function PdfLanding({ payload }: Props) {
  const title = (payload.title as string) || "Документ PDF";
  const rawUrl = payload.fileUrl as string | undefined;
  const fileUrl = rawUrl && isSafeUrl(rawUrl) ? rawUrl : undefined;

  return (
    <HostedLandingShell>
      <HostedLandingCard>
        <HostedLandingTitle>{title}</HostedLandingTitle>

        {fileUrl ? (
          <>
            <div className="qrs-hosted-media qrs-hosted-media--pdf">
              <iframe src={fileUrl} className="qrs-hosted-media__frame" title={title} />
            </div>

            <LandingActionLink href={fileUrl} download variant="primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Скачать PDF
            </LandingActionLink>
          </>
        ) : (
          <HostedLandingEmpty>Файл не найден</HostedLandingEmpty>
        )}
      </HostedLandingCard>
    </HostedLandingShell>
  );
}
