"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { QrContentForm } from "@/components/qr-forms";
import { QrDesigner, type QrStyle } from "@/components/qr-designer";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { getQrTypeInfo } from "@/lib/qr-types";
import { parseApiResponse } from "@/lib/client-api";
import { QrContentType } from "@prisma/client";

const defaultStyle: QrStyle = {
  dotType: "square",
  dotColor: "#111111",
  bgColor: "#ffffff",
  bgTransparent: false,
  cornerSquareType: "square",
  cornerSquareColor: "#111111",
  cornerDotType: "square",
  cornerDotColor: "#111111",
  frameStyle: "none",
  frameColor: "#111111",
  frameText: "",
  logoUrl: "",
  logoFileId: "",
  logoScale: 0,
  logoMargin: 0,
  margin: 2,
  errorCorrectionLevel: "M",
};

export function CreateQrClient({ workspaceId }: { workspaceId: string }) {
  const params = useParams();
  const router = useRouter();
  const typeParam = (params.type as string).toUpperCase();
  const typeInfo = getQrTypeInfo(typeParam);

  const [name, setName] = useState(typeInfo?.label ? `${typeInfo.label} QR` : "Новый QR");
  const [kind, setKind] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [style, setStyle] = useState<QrStyle>(defaultStyle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "design">("content");

  // Advanced options (only for dynamic)
  const [expireAt, setExpireAt] = useState("");
  const [maxScans, setMaxScans] = useState("");
  const [password, setPassword] = useState("");
  const [gdprRequired, setGdprRequired] = useState(false);
  const [gdprPolicyUrl, setGdprPolicyUrl] = useState("");
  const [smartRedirect, setSmartRedirect] = useState<{ default?: string; ios?: string; android?: string; desktop?: string }>({});
  const [trackingPixels, setTrackingPixels] = useState<{ metaPixelId?: string; ga4Id?: string; gtmId?: string; ymCounterId?: string; vkPixelId?: string }>({});
  const [abTest, setAbTest] = useState<{ urlA?: string; urlB?: string }>({});

  const previewData = useMemo(() => {
    if (typeParam === "URL") return String(payload.url || "https://example.com");
    if (typeParam === "TEXT") return String(payload.text || "Hello");
    if (typeParam === "PHONE") return `tel:${payload.phone || ""}`;
    if (typeParam === "EMAIL") return `mailto:${payload.email || ""}`;
    if (typeParam === "WIFI") return `WIFI:S:${payload.ssid || ""};T:WPA;P:${payload.password || ""};;`;
    if (typeParam === "INSTAGRAM") return `https://instagram.com/${String(payload.username || "example").replace(/^@/, "")}`;
    if (typeParam === "FACEBOOK") return String(payload.pageUrl || "https://facebook.com");
    if (typeParam === "WHATSAPP") return `https://wa.me/${String(payload.phone || "")}`;
    return "https://example.com";
  }, [typeParam, payload]);

  const qrRef = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const opts = {
      width: 280,
      height: 280,
      data: previewData || "https://example.com",
      margin: style.margin,
      dotsOptions: {
        type: style.dotType as never,
        color: style.dotColor,
        ...(style.dotGradient ? {
          gradient: {
            type: style.dotGradient.type,
            colorStops: [
              { offset: 0, color: style.dotGradient.colors[0] },
              { offset: 1, color: style.dotGradient.colors[1] },
            ],
            rotation: style.dotGradient.rotation || 0,
          },
        } : {}),
      },
      cornersSquareOptions: {
        type: style.cornerSquareType as never,
        color: style.cornerSquareColor,
      },
      cornersDotOptions: {
        type: style.cornerDotType as never,
        color: style.cornerDotColor,
      },
      backgroundOptions: {
        color: style.bgTransparent ? "transparent" : style.bgColor,
        ...(style.bgGradient && !style.bgTransparent ? {
          gradient: {
            type: style.bgGradient.type,
            colorStops: [
              { offset: 0, color: style.bgGradient.colors[0] },
              { offset: 1, color: style.bgGradient.colors[1] },
            ],
            rotation: style.bgGradient.rotation || 0,
          },
        } : {}),
      },
      qrOptions: { errorCorrectionLevel: style.errorCorrectionLevel },
      ...(style.logoUrl ? {
        image: style.logoUrl,
        imageOptions: {
          crossOrigin: "anonymous" as const,
          margin: style.logoMargin,
          imageSize: style.logoScale || 0.2,
        },
      } : {}),
    };

    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling(opts);
      if (qrRef.current) {
        qrRef.current.innerHTML = "";
        qrInstance.current.append(qrRef.current);
      }
    } else {
      qrInstance.current.update(opts);
    }
  }, [previewData, style]);

  async function handleSave() {
    setSaving(true);
    setError("");

    const isHosted = typeInfo?.needsHostedPage;
    const actualKind = isHosted ? "DYNAMIC" : kind;

    const mergedPayload = { ...payload };
    if (actualKind === "DYNAMIC") {
      mergedPayload.gdprRequired = gdprRequired;
      if (gdprPolicyUrl.trim()) mergedPayload.gdprPolicyUrl = gdprPolicyUrl.trim();
      if (typeParam === "URL") {
        const sr: Record<string, string> = {};
        if (smartRedirect.default?.trim()) sr.default = smartRedirect.default.trim();
        if (smartRedirect.ios?.trim()) sr.ios = smartRedirect.ios.trim();
        if (smartRedirect.android?.trim()) sr.android = smartRedirect.android.trim();
        if (smartRedirect.desktop?.trim()) sr.desktop = smartRedirect.desktop.trim();
        if (Object.keys(sr).length) mergedPayload.smartRedirect = sr;
        const tp: Record<string, string> = {};
        if (trackingPixels.metaPixelId?.trim()) tp.metaPixelId = trackingPixels.metaPixelId.trim();
        if (trackingPixels.ga4Id?.trim()) tp.ga4Id = trackingPixels.ga4Id.trim();
        if (trackingPixels.gtmId?.trim()) tp.gtmId = trackingPixels.gtmId.trim();
        if (trackingPixels.ymCounterId?.trim()) tp.ymCounterId = trackingPixels.ymCounterId.trim();
        if (trackingPixels.vkPixelId?.trim()) tp.vkPixelId = trackingPixels.vkPixelId.trim();
        if (Object.keys(tp).length) mergedPayload.trackingPixels = tp;
        const ab: Record<string, string> = {};
        if (abTest.urlA?.trim()) ab.urlA = abTest.urlA.trim();
        if (abTest.urlB?.trim()) ab.urlB = abTest.urlB.trim();
        if (Object.keys(ab).length === 2) mergedPayload.abTest = ab;
      }
    }

    const body: Record<string, unknown> = {
      workspaceId,
      name,
      kind: actualKind,
      contentType: typeParam as QrContentType,
      payload: mergedPayload,
      style,
    };
    if (actualKind === "DYNAMIC") {
      if (expireAt.trim()) body.expireAt = new Date(expireAt).toISOString();
      if (maxScans.trim()) {
        const n = parseInt(maxScans, 10);
        if (Number.isInteger(n) && n >= 1) body.maxScans = n;
      }
      if (password.trim()) body.password = password;
    }

    const response = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const parsed = await parseApiResponse<{ qrId?: string }>(response);
    setSaving(false);

    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось создать QR-код.");
      return;
    }

    router.push(`/dashboard/qr/${parsed.data?.qrId}`);
  }

  if (!typeInfo) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-lg font-semibold text-slate-900">Тип QR-кода не найден</p>
        <Link href="/dashboard/create" className="btn btn-primary mt-4">Назад к выбору типа</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/create" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-500">{typeInfo.description}</p>
        </div>
        {!typeInfo.needsHostedPage && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${kind === "STATIC" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setKind("STATIC")}
            >
              Статический
            </button>
            <button
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${kind === "DYNAMIC" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setKind("DYNAMIC")}
            >
              Динамический
            </button>
          </div>
        )}
      </div>

      <div className={`grid gap-6 ${typeParam === "BUSINESS" ? "lg:grid-cols-2" : "lg:grid-cols-[1fr_340px]"}`}>
        {/* Left: Content + Design tabs */}
        <div>
          {/* Name field - visible for all types */}
          <div className="mb-4">
            <label className="label">Название</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Меню ресторана, Визитка Иванов, Промо-акция"
            />
            <p className="mt-1 text-xs text-slate-500">Укажите название для удобного поиска в библиотеке</p>
          </div>
          {/* Tab bar */}
          <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1">
            <button
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === "content" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setActiveTab("content")}
            >
              Контент
            </button>
            <button
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${activeTab === "design" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setActiveTab("design")}
            >
              Дизайн
            </button>
          </div>

          {/* Content form */}
          {activeTab === "content" && (
            <div className="card p-6">
              <QrContentForm
                type={typeParam as QrContentType}
                payload={payload}
                onChange={setPayload}
                workspaceId={workspaceId}
              />
            </div>
          )}

          {/* Design form */}
          {activeTab === "design" && (
            <QrDesigner style={style} onChange={setStyle} workspaceId={workspaceId} />
          )}

          {/* Advanced options — only for dynamic */}
          {(kind === "DYNAMIC" || typeInfo?.needsHostedPage) && (
            <div className="mt-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Дополнительные настройки</h3>

              {/* Срок действия — for all dynamic */}
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
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    <p className="mt-1 text-xs text-slate-500">Оставьте пустым, если срок не ограничен</p>
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
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Оставьте пустым, если пароль не нужен"
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

              {/* Retargeting, A/B — only for URL type. Smart redirect скрыт */}
              {typeParam === "URL" && !typeInfo?.needsHostedPage && (
                <>
                  <details className="group rounded-lg border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 [&::-webkit-details-marker]:hidden">
                      <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Retargeting
                    </summary>
                    <div className="border-t border-slate-100 p-4">
                    <p className="mb-3 text-xs text-slate-500">
                      Meta Pixel, GA4, GTM, Яндекс Метрика и VK Пиксель будут загружены на странице перед редиректом.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="label">Meta Pixel ID</label>
                        <input type="text" value={trackingPixels.metaPixelId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, metaPixelId: e.target.value }))} placeholder="1234567890123456" className="input" />
                      </div>
                      <div>
                        <label className="label">GA4 Measurement ID</label>
                        <input type="text" value={trackingPixels.ga4Id ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, ga4Id: e.target.value }))} placeholder="G-XXXXXXXXXX" className="input" />
                      </div>
                      <div>
                        <label className="label">Google Tag Manager ID</label>
                        <input type="text" value={trackingPixels.gtmId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, gtmId: e.target.value }))} placeholder="GTM-XXXXXXX" className="input" />
                      </div>
                      <div>
                        <label className="label">Яндекс Метрика (ID счётчика)</label>
                        <input type="text" value={trackingPixels.ymCounterId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, ymCounterId: e.target.value }))} placeholder="12345678" className="input" />
                      </div>
                      <div>
                        <label className="label">VK Пиксель (ID)</label>
                        <input type="text" value={trackingPixels.vkPixelId ?? ""} onChange={(e) => setTrackingPixels((t) => ({ ...t, vkPixelId: e.target.value }))} placeholder="VK-RTRG-162959-XXXXX" className="input" />
                      </div>
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
                      <p className="mb-3 text-xs text-slate-500">
                        Случайный выбор URL (50/50). Cookie сохраняет вариант при повторных визитах.
                      </p>
                      <div>
                        <label className="label">URL вариант A</label>
                        <input type="url" value={abTest.urlA ?? ""} onChange={(e) => setAbTest((a) => ({ ...a, urlA: e.target.value }))} placeholder="https://example.com/a" className="input" />
                      </div>
                      <div>
                        <label className="label">URL вариант B</label>
                        <input type="url" value={abTest.urlB ?? ""} onChange={(e) => setAbTest((a) => ({ ...a, urlB: e.target.value }))} placeholder="https://example.com/b" className="input" />
                      </div>
                    </div>
                  </details>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="lg:sticky lg:top-24">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900">Предпросмотр</h3>
            {typeParam === "BUSINESS" ? (
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

            <button
              className="btn btn-primary mt-4 w-full"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Сохранение..." : "Создать QR-код"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
