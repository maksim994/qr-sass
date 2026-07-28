import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { UtilityPage } from "@/components/utility/utility-page";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const COOKIE_NAME = "gdpr_consent";

export default async function GdprGatePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const targetPath = typeof sp?.to === "string" && sp.to.startsWith("/") ? sp.to : `/r/${slug}`;

  const db = getDb();
  const qr = await db.qrCode.findFirst({
    where: { shortCode: slug, kind: "DYNAMIC", isArchived: false },
    select: { id: true, currentTargetUrl: true, payload: true },
  });

  if (!qr) notFound();

  const payload = (qr.payload as Record<string, unknown>) ?? {};
  const gdprRequired = payload.gdprRequired === true;
  const policyUrl = (typeof sp?.policy === "string" ? sp.policy : null) ?? (typeof payload.gdprPolicyUrl === "string" ? payload.gdprPolicyUrl : undefined);
  if (!gdprRequired) {
    redirect(targetPath);
  }

  const cookieStore = await cookies();
  const consent = cookieStore.get(COOKIE_NAME);
  if (consent?.value === "1") {
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
