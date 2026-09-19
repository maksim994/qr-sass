import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { safeInternalPath } from "@/lib/safe-redirect";
import { Button } from "@/components/ui/button";
import { UtilityPage } from "@/components/utility/utility-page";
import { qrUnavailablePath } from "@/lib/qr-lifetime-policy";
import { hasQrConsent, qrConsentCookieName, requiredConsentVersion } from "@/lib/qr-consent";
import { NOINDEX_ROBOTS } from "@/lib/seo-hygiene";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata = {
  robots: NOINDEX_ROBOTS,
};

export default async function GdprGatePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const targetPath = safeInternalPath(typeof sp?.to === "string" ? sp.to : "", `/r/${slug}`);

  const db = getDb();
  const qr = await db.qrCode.findFirst({
    where: { shortCode: slug, kind: "DYNAMIC" },
    select: { id: true, currentTargetUrl: true, payload: true, isArchived: true },
  });

  if (!qr) redirect(qrUnavailablePath("missing"));
  if (qr.isArchived) redirect(qrUnavailablePath("archived"));

  const payload = (qr.payload as Record<string, unknown>) ?? {};
  const version = requiredConsentVersion(payload);
  const policyUrl = (typeof sp?.policy === "string" ? sp.policy : null) ?? (typeof payload.gdprPolicyUrl === "string" ? payload.gdprPolicyUrl : undefined);
  if (version <= 0) {
    redirect(targetPath);
  }

  const cookieStore = await cookies();
  const consent = cookieStore.get(qrConsentCookieName(slug));
  if (hasQrConsent(consent?.value, version)) {
    redirect(targetPath);
  }

  return (
    <UtilityPage
      variant="info"
      title="Согласие на обработку данных"
      description="Переходя по ссылке, вы соглашаетесь с использованием cookies и обработкой персональных данных в соответствии с политикой конфиденциальности."
    >
      {policyUrl ? (
        <Link href={policyUrl} target="_blank" rel="noopener noreferrer" className="qrs-utility-link">
          Политика конфиденциальности →
        </Link>
      ) : null}

      <div className="qrs-utility-actions">
        <GdprAcceptButton slug={slug} targetPath={targetPath} />
        <Button href="/" variant="secondary" block>
          Отказаться
        </Button>
      </div>
    </UtilityPage>
  );
}

function GdprAcceptButton({ slug, targetPath }: { slug: string; targetPath: string }) {
  return (
    <form action={`/api/gdpr/consent`} method="post" className="qrs-utility-form-inline">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="redirectTo" value={targetPath} />
      <Button type="submit" variant="primary" block>
        Принять
      </Button>
    </form>
  );
}
