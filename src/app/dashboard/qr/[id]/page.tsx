import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { contentTypeLabels } from "@/lib/qr-types";
import { getPlan } from "@/lib/plans";
import { renderQrSvg, defaultStyle, needsHostedPage } from "@/lib/qr";
import { selectWorkspace } from "@/lib/workspace-select";
import UpdateTarget from "@/components/update-target";
import TrackingPixelsForm from "@/components/tracking-pixels-form";
import AbTestForm from "@/components/ab-test-form";
import QrExpirySettings from "@/components/qr-expiry-settings";
import DeleteQrButton from "@/components/delete-qr-button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QrDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();

  const [qr, scanCountA, scanCountB] = await Promise.all([
    db.qrCode.findUnique({
      where: { id },
      include: {
        workspace: { select: { plan: true } },
        revisions: { orderBy: { createdAt: "desc" }, take: 10 },
        scanEvents: { orderBy: { scannedAt: "desc" }, take: 50 },
        _count: { select: { scanEvents: true } },
      },
    }),
    db.scanEvent.count({ where: { qrCodeId: id, abVariant: "A" } }),
    db.scanEvent.count({ where: { qrCodeId: id, abVariant: "B" } }),
  ]);

  if (!qr || qr.workspaceId !== workspace.id) {
    notFound();
  }

  const styleRaw = (qr.styleConfig as Record<string, unknown> | null) ?? {};
  const style = {
    foreground: typeof styleRaw.foreground === "string" ? styleRaw.foreground : defaultStyle.foreground,
    background: typeof styleRaw.background === "string" ? styleRaw.background : defaultStyle.background,
    margin: typeof styleRaw.margin === "number" ? styleRaw.margin : defaultStyle.margin,
    errorCorrectionLevel:
      styleRaw.errorCorrectionLevel === "L" ||
      styleRaw.errorCorrectionLevel === "M" ||
      styleRaw.errorCorrectionLevel === "Q" ||
      styleRaw.errorCorrectionLevel === "H"
        ? styleRaw.errorCorrectionLevel
        : defaultStyle.errorCorrectionLevel,
  } as const;

  const svgString = await renderQrSvg(qr.encodedContent, style);
  const plan = await getPlan(qr.workspace?.plan);
  const exportFormats = plan.limits.exportFormats;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Back link */}
      <Link
        href="/dashboard/library"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Назад к библиотеке
      </Link>

      {/* Heading */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{qr.name}</h1>
          <span className="badge">
            {contentTypeLabels[qr.contentType] || qr.contentType}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {qr.kind === "DYNAMIC" ? "Динамический" : "Статический"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {needsHostedPage(qr.contentType) && (
            <Link href={`/dashboard/qr/${qr.id}/edit`} className="btn btn-primary btn-sm">
              Редактировать
            </Link>
          )}
          <DeleteQrButton qrId={qr.id} qrName={qr.name} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        {/* Left column — QR details */}
        <div className="card p-6">
          {/* SVG preview */}
          <div
            className="mx-auto mb-6 w-full max-w-[280px] rounded-lg border border-slate-100 bg-white p-4"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />

          {/* Download buttons */}
          <div className="mb-6 flex flex-wrap gap-2">
            {exportFormats.includes("PNG") && (
              <a href={`/api/qr/${qr.id}/download?format=png`} className="btn btn-primary btn-sm" download>
                PNG
              </a>
            )}
            {exportFormats.includes("SVG") && (
              <a href={`/api/qr/${qr.id}/download?format=svg`} className="btn btn-secondary btn-sm" download>
                SVG
              </a>
            )}
            {exportFormats.includes("JPG") && (
              <a href={`/api/qr/${qr.id}/download?format=jpg`} className="btn btn-secondary btn-sm" download>
                JPG
              </a>
            )}
            {exportFormats.includes("EPS") && (
              <a href={`/api/qr/${qr.id}/download?format=eps`} className="btn btn-secondary btn-sm" download>
                EPS
              </a>
            )}
            {exportFormats.includes("PDF") && (
              <a href={`/api/qr/${qr.id}/download?format=pdf`} className="btn btn-secondary btn-sm" download>
                PDF
              </a>
            )}
          </div>

          {/* Short link - /p/ for hosted (Menu, PDF, etc.), /r/ for redirect */}
          {qr.kind === "DYNAMIC" && qr.shortCode && (
            <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {needsHostedPage(qr.contentType)
                  ? "Ссылка на страницу"
                  : "Короткая ссылка"}
              </p>
              <a
                href={`/${needsHostedPage(qr.contentType) ? "p" : "r"}/${qr.shortCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-mono text-sm text-blue-600 hover:underline"
              >
                /{needsHostedPage(qr.contentType) ? "p" : "r"}/{qr.shortCode}
              </a>

              {/* Only for redirect types (not hosted) */}
              {!needsHostedPage(qr.contentType) && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Текущий URL назначения
                  </p>
                  {qr.currentTargetUrl ? (
                    <p className="mt-1 truncate text-sm text-slate-700">{qr.currentTargetUrl}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">Не задан</p>
                  )}
                  <UpdateTarget qrId={qr.id} currentUrl={qr.currentTargetUrl} />
                  {qr.contentType === "URL" && (
                    <>
                      {/* Smart redirect скрыт на данный момент */}
                      <details className="group mt-4 border-t border-slate-200 pt-4">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
                          <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Retargeting
                        </summary>
                        <div className="mt-4">
                          <TrackingPixelsForm
                            qrId={qr.id}
                            trackingPixels={(qr.payload as Record<string, unknown>)?.trackingPixels as { metaPixelId?: string; ga4Id?: string; gtmId?: string; ymCounterId?: string; vkPixelId?: string } ?? null}
                          />
                        </div>
                      </details>
                      <details className="group mt-4 border-t border-slate-200 pt-4">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
                          <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          A/B-тестирование
                        </summary>
                        <div className="mt-4">
                          <AbTestForm
                            qrId={qr.id}
                            abTest={(qr.payload as Record<string, unknown>)?.abTest as { urlA?: string; urlB?: string } ?? null}
                            scanCountA={scanCountA}
                            scanCountB={scanCountB}
                          />
                        </div>
                      </details>
                    </>
                  )}
                </>
              )}

              {/* Expiry settings for all dynamic QR */}
              <details className="group mt-4 border-t border-slate-200 pt-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
                  <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Срок действия
                </summary>
                <div className="mt-4">
                  <QrExpirySettings
                  qrId={qr.id}
                  expireAt={qr.expireAt}
                  maxScans={qr.maxScans}
                  passwordRequired={!!qr.passwordHash}
                  gdprRequired={((qr.payload as Record<string, unknown>)?.gdprRequired as boolean) ?? false}
                  gdprPolicyUrl={((qr.payload as Record<string, unknown>)?.gdprPolicyUrl as string) ?? null}
                  scanCount={qr._count.scanEvents}
                />
                </div>
              </details>
            </div>
          )}

          {/* Meta */}
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Создан</dt>
              <dd className="font-medium text-slate-700">
                {qr.createdAt.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Всего сканирований</dt>
              <dd className="font-medium text-slate-700">{qr._count.scanEvents}</dd>
            </div>
          </dl>
        </div>

        {/* Right column — Recent scans */}
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Последние сканирования
          </h2>

          {qr.scanEvents.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <p className="mt-3 text-sm text-slate-500">Сканирований пока нет.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Дата</th>
                    <th className="pb-3 pr-4">Страна</th>
                    <th className="pb-3 pr-4">Устройство</th>
                    <th className="pb-3">ОС</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {qr.scanEvents.map((scan) => (
                    <tr key={scan.id} className="text-slate-700">
                      <td className="py-2.5 pr-4 whitespace-nowrap">
                        {scan.scannedAt.toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        <span className="text-slate-400">
                          {scan.scannedAt.toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">{scan.country || "—"}</td>
                      <td className="py-2.5 pr-4">{scan.deviceType || "—"}</td>
                      <td className="py-2.5">{scan.os || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
