import { isSafeUrl } from "@/lib/url";
import {
  HostedLandingCard,
  HostedLandingEmpty,
  HostedLandingShell,
  HostedLandingTitle,
} from "./hosted-landing-shell";
import { LandingLinkItem, LandingLinkRow } from "./landing-actions";

type LinkItem = { label?: string; url?: string };

type Props = { payload: Record<string, unknown> };

export function LinkListLanding({ payload }: Props) {
  const title = (payload.title as string) || "Ссылки";
  const links = (payload.links as LinkItem[] | undefined) ?? [];
  const safeLinks = links.filter((l) => l.url && isSafeUrl(l.url));

  return (
    <HostedLandingShell>
      <HostedLandingCard>
        <HostedLandingTitle center>{title}</HostedLandingTitle>

        {safeLinks.length === 0 ? (
          <HostedLandingEmpty>Нет ссылок</HostedLandingEmpty>
        ) : (
          <LandingLinkRow>
            {safeLinks.map((link, i) => (
              <LandingLinkItem key={i} href={link.url!} label={link.label || link.url!} />
            ))}
          </LandingLinkRow>
        )}
      </HostedLandingCard>
    </HostedLandingShell>
  );
}
