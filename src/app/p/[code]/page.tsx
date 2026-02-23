import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { trackScan } from "@/lib/analytics";
import { PdfLanding } from "@/components/landing-templates/pdf-landing";
import { ImageLanding } from "@/components/landing-templates/image-landing";
import { VideoLanding } from "@/components/landing-templates/video-landing";
import { Mp3Landing } from "@/components/landing-templates/mp3-landing";
import { MenuLanding } from "@/components/landing-templates/menu-landing";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { LinkListLanding } from "@/components/landing-templates/link-list-landing";
import { CouponLanding } from "@/components/landing-templates/coupon-landing";
import { SocialLinksLanding } from "@/components/landing-templates/social-links-landing";

type Props = { params: Promise<{ code: string }> };

export default async function HostedPage({ params }: Props) {
  const { code } = await params;
  const db = getDb();

  const qr = await db.qrCode.findFirst({
    where: { shortCode: code, isArchived: false },
  });

  if (!qr) notFound();

  const payload = (qr.payload as Record<string, unknown>) ?? {};

  await trackScan(qr.id).catch(() => {});

  switch (qr.contentType) {
    case "PDF":
      return <PdfLanding payload={payload} />;
    case "IMAGE":
      return <ImageLanding payload={payload} />;
    case "VIDEO":
      return <VideoLanding payload={payload} />;
    case "MP3":
      return <Mp3Landing payload={payload} />;
    case "MENU":
      return <MenuLanding payload={payload} />;
    case "BUSINESS":
      return <BusinessLanding payload={payload} />;
    case "LINK_LIST":
      return <LinkListLanding payload={payload} />;
    case "COUPON":
      return <CouponLanding payload={payload} />;
    case "SOCIAL_LINKS":
      return <SocialLinksLanding payload={payload} />;
    default:
      notFound();
  }
}
