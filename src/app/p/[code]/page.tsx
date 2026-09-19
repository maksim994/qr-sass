import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { trackScan } from "@/lib/analytics";
import { PasswordGateForm } from "@/components/password-gate-form";
import { UtilityPage } from "@/components/utility/utility-page";
import { PdfLanding } from "@/components/landing-templates/pdf-landing";
import { ImageLanding } from "@/components/landing-templates/image-landing";
import { VideoLanding } from "@/components/landing-templates/video-landing";
import { Mp3Landing } from "@/components/landing-templates/mp3-landing";
import { MenuLanding } from "@/components/landing-templates/menu-landing";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { LinkListLanding } from "@/components/landing-templates/link-list-landing";
import { CouponLanding } from "@/components/landing-templates/coupon-landing";
import { SocialLinksLanding } from "@/components/landing-templates/social-links-landing";
import { qrUnavailablePath } from "@/lib/qr-lifetime-policy";
import { hasQrConsent, qrConsentCookieName, requiredConsentVersion } from "@/lib/qr-consent";
import { NOINDEX_ROBOTS } from "@/lib/seo-hygiene";
import { hostedLandingPayload } from "@/lib/qr-hosted-media";
import { accessCookieFor, evaluateQrPublicAccess } from "@/lib/qr-public-access";
import { createQrViewGrant } from "@/lib/qr-view-grant";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata = {
  robots: NOINDEX_ROBOTS,
};

export default async function HostedPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const errorParam = typeof sp?.error === "string" ? sp.error : undefined;
  const db = getDb();

  const qr = await db.qrCode.findFirst({
    where: { shortCode: code },
  });

  if (!qr) redirect(qrUnavailablePath("missing"));

  const payload = (qr.payload as Record<string, unknown>) ?? {};
  const cookieStore = await cookies();
  const scanCount = await db.scanEvent.count({ where: { qrCodeId: qr.id } });
  const access = await evaluateQrPublicAccess({
    qr,
    scanCount,
    accessToken: cookieStore.get(accessCookieFor(code))?.value,
  });
  if (!access.ok) {
    if (access.reason === "password") {
      return <PasswordGateForm code={code} error={errorParam} />;
    }
    if (access.reason === "expired" || access.reason === "limit") {
      return (
        <UtilityPage
          variant="warning"
          title="Срок действия истёк"
          description={access.reason === "limit" ? "Достигнут лимит сканирований." : "Этот QR-код больше не действителен."}
        />
      );
    }
    redirect(qrUnavailablePath(access.reason === "archived" ? "archived" : "missing"));
  }

  const consentVersion = requiredConsentVersion(payload);
  if (consentVersion > 0) {
    const consented = hasQrConsent(cookieStore.get(qrConsentCookieName(code))?.value, consentVersion);
    if (!consented && payload.gdprRequired === true) {
      redirect(
        `/g/${code}?to=${encodeURIComponent(`/p/${code}`)}${typeof payload.gdprPolicyUrl === "string" ? `&policy=${encodeURIComponent(payload.gdprPolicyUrl)}` : ""}`
      );
    }
  }

  const viewGrant = await createQrViewGrant(qr.id);
  await trackScan(qr.id).catch(() => {});
  const payloadForPage = await hostedLandingPayload(qr, payload, undefined, viewGrant);

  switch (qr.contentType) {
    case "PDF":
      return <PdfLanding payload={payloadForPage} />;
    case "IMAGE":
      return <ImageLanding payload={payloadForPage} />;
    case "VIDEO":
      return <VideoLanding payload={payloadForPage} />;
    case "MP3":
      return <Mp3Landing payload={payloadForPage} />;
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
