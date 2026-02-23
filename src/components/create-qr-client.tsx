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

    const response = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name,
        kind: actualKind,
        contentType: typeParam as QrContentType,
        payload,
        style,
      }),
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
          <select
            className="select w-auto"
            value={kind}
            onChange={(e) => setKind(e.target.value as "STATIC" | "DYNAMIC")}
          >
            <option value="STATIC">Статический</option>
            <option value="DYNAMIC">Динамический</option>
          </select>
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
