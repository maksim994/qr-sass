import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { trackScan } from "@/lib/analytics";
import { PasswordGateForm } from "@/components/password-gate-form";
import { PdfLanding } from "@/components/landing-templates/pdf-landing";
import { ImageLanding } from "@/components/landing-templates/image-landing";
import { VideoLanding } from "@/components/landing-templates/video-landing";
import { Mp3Landing } from "@/components/landing-templates/mp3-landing";
import { MenuLanding } from "@/components/landing-templates/menu-landing";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { LinkListLanding } from "@/components/landing-templates/link-list-landing";
import { CouponLanding } from "@/components/landing-templates/coupon-landing";
import { SocialLinksLanding } from "@/components/landing-templates/social-links-landing";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function HostedPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const errorParam = typeof sp?.error === "string" ? sp.error : undefined;
  const db = getDb();

  const qr = await db.qrCode.findFirst({
    where: { shortCode: code, isArchived: false },
  });

  if (!qr) notFound();

  const payload = (qr.payload as Record<string, unknown>) ?? {};
  const gdprRequired = payload.gdprRequired === true;
  if (gdprRequired) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const gdprCookie = cookieStore.get("gdpr_consent");
    if (gdprCookie?.value !== "1") {
      const { redirect } = await import("next/navigation");
      redirect(
        `/g/${code}?to=${encodeURIComponent(`/p/${code}`)}${typeof payload.gdprPolicyUrl === "string" ? `&policy=${encodeURIComponent(payload.gdprPolicyUrl)}` : ""}`
      );
    }
  }

  if (qr.passwordHash) {
    const h = await headers();
    const cookieHeader = h.get("cookie") ?? "";
    const cookieName = `qr_pwd_${code}=`;
    const hasCookie = cookieHeader.split(";").some((c) => c.trim().startsWith(cookieName));
    if (!hasCookie) {
      return (
        <PasswordGateForm
          code={code}
          redirectTo={`/p/${code}`}
          error={errorParam}
        />
      );
    }
  }

  if (qr.expireAt && new Date() > qr.expireAt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Срок действия истёк</h1>
          <p className="mt-2 text-slate-600">Этот QR-код больше не действителен.</p>
        </div>
      </div>
    );
  }

  if (qr.maxScans != null && qr.maxScans > 0) {
    const scanCount = await db.scanEvent.count({ where: { qrCodeId: qr.id } });
    if (scanCount >= qr.maxScans) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
          <div className="card max-w-md p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Срок действия истёк</h1>
            <p className="mt-2 text-slate-600">Достигнут лимит сканирований.</p>
          </div>
        </div>
      );
    }
  }

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
