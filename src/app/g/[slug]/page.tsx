import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
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

  const baseUrl = process.env.APP_URL ?? "https://qr-s.ru";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md p-8">
        <h1 className="text-xl font-semibold text-slate-900">Согласие на обработку данных</h1>
        <p className="mt-3 text-sm text-slate-600">
          Переходя по ссылке, вы соглашаетесь с использованием cookies и обработкой персональных данных в
          соответствии с политикой конфиденциальности.
        </p>
        {policyUrl && (
          <Link href={policyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-blue-600 hover:underline">
            Политика конфиденциальности →
          </Link>
        )}
        <div className="mt-6 flex gap-3">
          <GdprAcceptButton slug={slug} targetPath={targetPath} />
          <Link href="/" className="btn btn-secondary flex-1 text-center">
            Отказаться
          </Link>
        </div>
      </div>
    </div>
  );
}

function GdprAcceptButton({ slug, targetPath }: { slug: string; targetPath: string }) {
  return (
    <form action={`/api/gdpr/consent`} method="post" className="flex-1">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="redirectTo" value={targetPath} />
      <button type="submit" className="btn btn-primary w-full">
        Принять
      </button>
    </form>
  );
}
