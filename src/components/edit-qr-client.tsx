"use client";

import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { QrContentForm } from "@/components/qr-forms";
import { QrDesigner, type QrStyle } from "@/components/qr-designer";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { getQrTypeInfo } from "@/lib/qr-types";
import { useQrStylingPreview } from "@/hooks/use-qr-styling-preview";
import { getQrPreviewData } from "@/lib/qr-preview-data";
import { QrContentType } from "@prisma/client";

import { parseStyleConfig } from "@/lib/qr-style-config";

function toDateTimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type QrData = {
  id: string;
  name: string;
  kind: "STATIC" | "DYNAMIC";
  contentType: QrContentType;
  payload: Record<string, unknown>;
  styleConfig: Record<string, unknown>;
  shortCode: string | null;
  expireAt: string | null;
  maxScans: number | null;
  hasPassword: boolean;
};

export function EditQrClient({ workspaceId, initialQr }: { workspaceId: string; initialQr: QrData }) {
  const router = useRouter();
  const typeInfo = getQrTypeInfo(initialQr.contentType);
  const initialPayload = initialQr.payload;

  const [name, setName] = useState(initialQr.name);
  const [payload, setPayload] = useState<Record<string, unknown>>(initialPayload);
  const [style, setStyle] = useState<QrStyle>(() => parseStyleConfig(initialQr.styleConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "design">("content");

  const [expireAt, setExpireAt] = useState(toDateTimeLocalValue(initialQr.expireAt));
  const [maxScans, setMaxScans] = useState(initialQr.maxScans != null ? String(initialQr.maxScans) : "");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(initialQr.hasPassword);
  const [gdprRequired, setGdprRequired] = useState(initialPayload.gdprRequired === true);
  const [gdprPolicyUrl, setGdprPolicyUrl] = useState(String(initialPayload.gdprPolicyUrl ?? ""));
  const [smartRedirect, setSmartRedirect] = useState<{
    default?: string;
    ios?: string;
    android?: string;
    desktop?: string;
  }>(() => (initialPayload.smartRedirect as {
    default?: string;
    ios?: string;
    android?: string;
    desktop?: string;
  }) ?? {});
  const [trackingPixels, setTrackingPixels] = useState<{
    metaPixelId?: string;
    ga4Id?: string;
    gtmId?: string;
    ymCounterId?: string;
    vkPixelId?: string;
  }>(() => (initialPayload.trackingPixels as {
    metaPixelId?: string;
    ga4Id?: string;
    gtmId?: string;
    ymCounterId?: string;
    vkPixelId?: string;
  }) ?? {});
  const [abTest, setAbTest] = useState<{ urlA?: string; urlB?: string }>(
    () => (initialPayload.abTest as { urlA?: string; urlB?: string }) ?? {},
  );

  const previewData = useMemo(() => {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://example.com";
    return getQrPreviewData(initialQr.contentType, payload, {
      appUrl,
      shortCode: initialQr.shortCode,
      kind: initialQr.kind,
    });
  }, [initialQr.contentType, initialQr.kind, initialQr.shortCode, payload]);

  const qrRef = useQrStylingPreview(previewData, style);
  const isDynamic = initialQr.kind === "DYNAMIC" || !!typeInfo?.needsHostedPage;

  async function handleSave() {
    setSaving(true);
    setError("");

    const mergedPayload = { ...payload };
    if (isDynamic) {
      mergedPayload.gdprRequired = gdprRequired;
      if (gdprPolicyUrl.trim()) mergedPayload.gdprPolicyUrl = gdprPolicyUrl.trim();
      else delete mergedPayload.gdprPolicyUrl;

      if (initialQr.contentType === "URL" && !typeInfo?.needsHostedPage) {
        const sr: Record<string, string> = {};
        if (smartRedirect.default?.trim()) sr.default = smartRedirect.default.trim();
        if (smartRedirect.ios?.trim()) sr.ios = smartRedirect.ios.trim();
        if (smartRedirect.android?.trim()) sr.android = smartRedirect.android.trim();
        if (smartRedirect.desktop?.trim()) sr.desktop = smartRedirect.desktop.trim();
        if (Object.keys(sr).length) mergedPayload.smartRedirect = sr;
        else delete mergedPayload.smartRedirect;

        const tp: Record<string, string> = {};
        if (trackingPixels.metaPixelId?.trim()) tp.metaPixelId = trackingPixels.metaPixelId.trim();
        if (trackingPixels.ga4Id?.trim()) tp.ga4Id = trackingPixels.ga4Id.trim();
        if (trackingPixels.gtmId?.trim()) tp.gtmId = trackingPixels.gtmId.trim();
        if (trackingPixels.ymCounterId?.trim()) tp.ymCounterId = trackingPixels.ymCounterId.trim();
        if (trackingPixels.vkPixelId?.trim()) tp.vkPixelId = trackingPixels.vkPixelId.trim();
        if (Object.keys(tp).length) mergedPayload.trackingPixels = tp;
        else delete mergedPayload.trackingPixels;

        const ab: Record<string, string> = {};
        if (abTest.urlA?.trim()) ab.urlA = abTest.urlA.trim();
        if (abTest.urlB?.trim()) ab.urlB = abTest.urlB.trim();
        if (Object.keys(ab).length === 2) mergedPayload.abTest = ab;
        else delete mergedPayload.abTest;
      }
    }

    const body: Record<string, unknown> = { name, payload: mergedPayload, style };
    if (initialQr.kind === "DYNAMIC") {
      body.expireAt = expireAt.trim() ? new Date(expireAt).toISOString() : null;
      if (maxScans.trim()) {
        const n = parseInt(maxScans, 10);
        body.maxScans = Number.isInteger(n) && n >= 1 ? n : null;
      } else {
        body.maxScans = null;
      }
      if (password.trim()) body.password = password.trim();
    }

    const response = await fetchApi(`/api/qr/${initialQr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const parsed = await parseApiResponse<{ updated?: boolean }>(response);
    setSaving(false);

    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось сохранить изменения.");
      return;
    }

    if (password.trim()) {
      setHasPassword(true);
      setPassword("");
    }

    router.push(`/dashboard/qr/${initialQr.id}`);
    router.refresh();
  }

  if (!typeInfo) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-lg font-semibold text-slate-900">Тип QR-кода не поддерживается</p>
        <Link href={`/dashboard/qr/${initialQr.id}`} className="btn btn-primary mt-4">
          Назад
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/dashboard/qr/${initialQr.id}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-slate-900">Редактирование QR-кода</p>
          <p className="truncate text-sm text-slate-500">
            {typeInfo.label} · {initialQr.kind === "DYNAMIC" ? "Динамический" : "Статический"}
          </p>
        </div>
      </div>

      <div className={`grid gap-6 ${initialQr.contentType === "BUSINESS" ? "lg:grid-cols-2" : "lg:grid-cols-[1fr_340px]"}`}>
        <div>
          <div className="mb-4">
            <label className="label">Название</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Меню ресторана"
            />
          </div>

          <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === "content" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setActiveTab("content")}
            >
              Контент
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === "design" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setActiveTab("design")}
            >
              Дизайн
            </button>
          </div>

          {activeTab === "content" && (
            <div className="card p-6">
              <QrContentForm
                type={initialQr.contentType}
                payload={payload}
                onChange={setPayload}
                workspaceId={workspaceId}
              />
            </div>
          )}

          {activeTab === "design" && (
            <QrDesigner style={style} onChange={setStyle} workspaceId={workspaceId} />
          )}

          {isDynamic && (
            <div className="mt-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Дополнительные настройки</h3>

              <details className="group rounded-lg border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
                  <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Срок действия
                </summary>
                <div className="space-y-3 border-t border-slate-100 p-4">
                  <div>
                    <label className="label">Действует до</label>
                    <input
                      type="datetime-local"
                      value={expireAt}
                      onChange={(e) => setExpireAt(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Максимум сканов</label>
                    <input
                      type="number"
                      min={1}
                      value={maxScans}
                      onChange={(e) => setMaxScans(e.target.value)}
                      placeholder="Без лимита"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Пароль на QR</label>
                    {hasPassword ? (
                      <p className="mb-2 text-xs text-slate-500">Пароль уже установлен. Введите новый, чтобы заменить.</p>
                    ) : null}
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={hasPassword ? "Новый пароль" : "Оставьте пустым, если пароль не нужен"}
                      className="input"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={gdprRequired}
                        onChange={(e) => setGdprRequired(e.target.checked)}
                      />
                      <span className="label mb-0">Требуется согласие GDPR</span>
                    </label>
                    {gdprRequired && (
                      <input
                        type="url"
                        value={gdprPolicyUrl}
                        onChange={(e) => setGdprPolicyUrl(e.target.value)}
                        placeholder="https://example.com/privacy"
                        className="input"
                      />
                    )}
                  </div>
                </div>
              </details>

              {initialQr.contentType === "URL" && !typeInfo.needsHostedPage && (
                <>
                  <details className="group rounded-lg border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
                      <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Retargeting
                    </summary>
                    <div className="space-y-3 border-t border-slate-100 p-4">
                      <div>
                        <label className="label">Meta Pixel ID</label>
                        <input type="text" value={trackingPixels.metaPixelId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, metaPixelId: e.target.value }))} className="input" />
                      </div>
                      <div>
                        <label className="label">GA4 Measurement ID</label>
                        <input type="text" value={trackingPixels.ga4Id ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, ga4Id: e.target.value }))} className="input" />
                      </div>
                      <div>
                        <label className="label">Google Tag Manager ID</label>
                        <input type="text" value={trackingPixels.gtmId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, gtmId: e.target.value }))} className="input" />
                      </div>
                      <div>
                        <label className="label">Яндекс Метрика (ID счётчика)</label>
                        <input type="text" value={trackingPixels.ymCounterId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, ymCounterId: e.target.value }))} className="input" />
                      </div>
                      <div>
                        <label className="label">VK Пиксель (ID)</label>
                        <input type="text" value={trackingPixels.vkPixelId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, vkPixelId: e.target.value }))} className="input" />
                      </div>
                    </div>
                  </details>

                  <details className="group rounded-lg border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
                      <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      A/B-тестирование
                    </summary>
                    <div className="space-y-3 border-t border-slate-100 p-4">
                      <div>
                        <label className="label">URL вариант A</label>
                        <input type="url" value={abTest.urlA ?? ""} onChange={(e) => setAbTest((a) => ({ ...a, urlA: e.target.value }))} className="input" />
                      </div>
                      <div>
                        <label className="label">URL вариант B</label>
                        <input type="url" value={abTest.urlB ?? ""} onChange={(e) => setAbTest((a) => ({ ...a, urlB: e.target.value }))} className="input" />
                      </div>
                    </div>
                  </details>
                </>
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900">Предпросмотр</h3>
            {initialQr.contentType === "BUSINESS" ? (
              <>
                <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50">
                  <BusinessLanding payload={payload} />
                </div>
                <div className="mt-4 flex justify-center rounded-xl border border-slate-100 bg-white p-4">
                  <div ref={qrRef} />
                </div>
              </>
            ) : (
              <div className="mt-4 flex justify-center rounded-xl border border-slate-100 bg-white p-4">
                <div ref={qrRef} />
              </div>
            )}
            {initialQr.shortCode && (
              <p className="mt-3 text-center text-xs text-slate-500">
                {initialQr.kind === "DYNAMIC" && !typeInfo.needsHostedPage
                  ? `/r/${initialQr.shortCode}`
                  : `/p/${initialQr.shortCode}`}
              </p>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button className="btn btn-primary mt-4 w-full" disabled={saving} onClick={handleSave}>
              {saving ? "Сохранение…" : "Сохранить изменения"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
