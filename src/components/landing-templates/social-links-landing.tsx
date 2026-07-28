import { isSafeUrl } from "@/lib/url";
import {
  HostedLandingCard,
  HostedLandingEmpty,
  HostedLandingShell,
  HostedLandingTitle,
} from "./hosted-landing-shell";

type SocialLink = { platform?: string; url?: string };

type Props = { payload: Record<string, unknown> };

const platformClass: Record<string, string> = {
  instagram: "qrs-hosted-social__btn--instagram",
  facebook: "qrs-hosted-social__btn--facebook",
  twitter: "qrs-hosted-social__btn--twitter",
  x: "qrs-hosted-social__btn--x",
  youtube: "qrs-hosted-social__btn--youtube",
  tiktok: "qrs-hosted-social__btn--tiktok",
  telegram: "qrs-hosted-social__btn--telegram",
  vk: "qrs-hosted-social__btn--vk",
  linkedin: "qrs-hosted-social__btn--linkedin",
  whatsapp: "qrs-hosted-social__btn--whatsapp",
  pinterest: "qrs-hosted-social__btn--pinterest",
  github: "qrs-hosted-social__btn--github",
};

function getPlatformClass(platform?: string): string {
  if (!platform) return "";
  return platformClass[platform.toLowerCase()] ?? "";
}

export function SocialLinksLanding({ payload }: Props) {
  const title = (payload.title as string) || "Социальные сети";
  const links = (payload.links as SocialLink[] | undefined) ?? [];
  const safeLinks = links.filter((l) => l.url && isSafeUrl(l.url));

  return (
    <HostedLandingShell>
      <HostedLandingCard>
        <HostedLandingTitle center>{title}</HostedLandingTitle>

        {safeLinks.length === 0 ? (
          <HostedLandingEmpty>Нет ссылок</HostedLandingEmpty>
        ) : (
          <div className="qrs-hosted-social">
            {safeLinks.map((link, i) => (
              <a
                key={i}
                href={link.url!}
                target="_blank"
                rel="noopener noreferrer"
                className={`qrs-hosted-social__btn ${getPlatformClass(link.platform)}`.trim()}
              >
                {link.platform || "Ссылка"}
              </a>
            ))}
          </div>
        )}
      </HostedLandingCard>
    </HostedLandingShell>
  );
}
