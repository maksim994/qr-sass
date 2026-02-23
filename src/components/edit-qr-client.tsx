"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function styleFromConfig(raw: Record<string, unknown>): QrStyle {
  return {
    dotType: (raw.dotType as QrStyle["dotType"]) ?? defaultStyle.dotType,
    dotColor: (raw.dotColor as string) ?? defaultStyle.dotColor,
    dotGradient: raw.dotGradient as QrStyle["dotGradient"],
    bgColor: (raw.bgColor as string) ?? defaultStyle.bgColor,
    bgTransparent: (raw.bgTransparent as boolean) ?? defaultStyle.bgTransparent,
    bgGradient: raw.bgGradient as QrStyle["bgGradient"],
    cornerSquareType: (raw.cornerSquareType as QrStyle["cornerSquareType"]) ?? defaultStyle.cornerSquareType,
    cornerSquareColor: (raw.cornerSquareColor as string) ?? defaultStyle.cornerSquareColor,
    cornerDotType: (raw.cornerDotType as QrStyle["cornerDotType"]) ?? defaultStyle.cornerDotType,
    cornerDotColor: (raw.cornerDotColor as string) ?? defaultStyle.cornerDotColor,
    frameStyle: (raw.frameStyle as string) ?? defaultStyle.frameStyle,
    frameColor: (raw.frameColor as string) ?? defaultStyle.frameColor,
    frameText: (raw.frameText as string) ?? defaultStyle.frameText,
    logoUrl: (raw.logoUrl as string) ?? defaultStyle.logoUrl,
    logoFileId: (raw.logoFileId as string) ?? defaultStyle.logoFileId,
    logoScale: typeof raw.logoScale === "number" ? raw.logoScale : defaultStyle.logoScale,
    logoMargin: typeof raw.logoMargin === "number" ? raw.logoMargin : defaultStyle.logoMargin,
    margin: typeof raw.margin === "number" ? raw.margin : defaultStyle.margin,
    errorCorrectionLevel: (raw.errorCorrectionLevel as QrStyle["errorCorrectionLevel"]) ?? defaultStyle.errorCorrectionLevel,
  };
}

type QrData = {
  id: string;
  name: string;
  contentType: QrContentType;
  payload: Record<string, unknown> | null;
  styleConfig: Record<string, unknown> | null;
  shortCode: string | null;
};

export function EditQrClient({ workspaceId, initialQr }: { workspaceId: string; initialQr: QrData }) {
  const params = useParams();
  const router = useRouter();
  const typeInfo = getQrTypeInfo(initialQr.contentType);

  const [name, setName] = useState(initialQr.name);
  const [payload, setPayload] = useState<Record<string, unknown>>((initialQr.payload as Record<string, unknown>) ?? {});
  const [style, setStyle] = useState<QrStyle>(() =>
    styleFromConfig((initialQr.styleConfig as Record<string, unknown>) ?? {}),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "design">("content");

  const previewData = useMemo(() => {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "";
    if (initialQr.shortCode) {
      return `${appUrl}/p/${initialQr.shortCode}`;
    }
    return "https://example.com";
  }, [initialQr.shortCode]);

  const qrRef = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<QRCodeStyling | null>(null);

  const initQr = useCallback(() => {
    if (!qrRef.current) return;
    const opts = {
      width: 280,
      height: 280,
      data: previewData,
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
      cornersSquareOptions: { type: style.cornerSquareType as never, color: style.cornerSquareColor },
      cornersDotOptions: { type: style.cornerDotType as never, color: style.cornerDotColor },
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
      qrRef.current.innerHTML = "";
      qrInstance.current.append(qrRef.current);
    } else {
      qrInstance.current.update(opts);
    }
  }, [previewData, style]);

  useEffect(() => {
    initQr();
  }, [initQr]);

  async function handleSave() {
    setSaving(true);
    setError("");

    const response = await fetch(`/api/qr/${initialQr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, payload, style }),
    });

    const parsed = await parseApiResponse<{ updated?: boolean }>(response);
    setSaving(false);

    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось сохранить изменения.");
      return;
    }

    router.push(`/dashboard/qr/${initialQr.id}`);
    router.refresh();
  }

  if (!typeInfo) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-lg font-semibold text-slate-900">Тип QR-кода не поддерживается для редактирования</p>
        <Link href={`/dashboard/qr/${initialQr.id}`} className="btn btn-primary mt-4">Назад</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
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
          <p className="text-lg font-bold text-slate-900">Редактирование</p>
          <p className="truncate text-sm text-slate-500">{typeInfo.label} — {initialQr.name}</p>
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
              <p className="mt-3 text-center text-xs text-slate-500">/p/{initialQr.shortCode}</p>
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
